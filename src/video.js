const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

// Executa um binário. Com `onProgress`, lê o progresso do ffmpeg (-progress pipe:1)
// e informa quantos segundos do vídeo de saída já foram processados.
function run(bin, args, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, onProgress ? ["-progress", "pipe:1", "-nostats", ...args] : args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      if (!onProgress) return (stdout += d);
      const match = String(d).match(/out_time_us=(\d+)/g)?.pop();
      if (match) onProgress(Number(match.split("=")[1]) / 1e6);
    });
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${path.basename(bin)} saiu com código ${code}:\n${stderr.slice(-2000)}`));
    });
  });
}

async function probe(file) {
  const out = await run(ffprobePath, [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,width,height,avg_frame_rate,r_frame_rate",
    "-of", "json",
    file,
  ]);
  const info = JSON.parse(out);
  const video = info.streams.find((s) => s.codec_type === "video");
  const rate = [video?.avg_frame_rate, video?.r_frame_rate].find((r) => r && !r.startsWith("0"));
  return {
    duration: Number(info.format.duration) || 0,
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    fps: rate ?? "30",
    hasAudio: info.streams.some((s) => s.codec_type === "audio"),
  };
}

// Divide a duração no menor número de partes com no máximo `maxSeconds` cada,
// todas do mesmo tamanho (ex.: 12s com máx. 5s -> 3 partes de 4s).
function planSegments(duration, maxSeconds) {
  const count = Math.max(1, Math.ceil(duration / maxSeconds - 1e-6));
  const length = duration / count;
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    start: Math.round(i * length * 1000) / 1000,
    end: Math.round((i === count - 1 ? duration : (i + 1) * length) * 1000) / 1000,
  }));
}

// Corta o vídeo nas partes planejadas. Recodifica para o corte ser exato.
async function split(input, outDir, maxSeconds, onProgress = () => {}) {
  await fs.mkdir(outDir, { recursive: true });
  const { duration } = await probe(input);
  const plan = planSegments(duration, maxSeconds);
  const segments = [];

  for (const seg of plan) {
    const length = seg.end - seg.start;
    const file = path.join(outDir, `parte_${String(seg.index + 1).padStart(2, "0")}.mp4`);
    await run(
      ffmpegPath,
      [
        "-y",
        "-ss", String(seg.start),
        "-i", input,
        "-t", String(length),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        file,
      ],
      { onProgress: (t) => onProgress((seg.start + Math.min(t, length)) / duration) }
    );
    segments.push({ ...seg, file: path.basename(file) });
  }
  onProgress(1);
  return { duration, segments };
}

// Junta os vídeos em sequência, na resolução e no FPS do primeiro (com barras se a
// proporção for diferente). Opções:
// - audioFrom: usa o áudio desse arquivo (o vídeo original).
// - crossfade: segundos de transição suave entre as partes. O último quadro de cada
//   parte é estendido pelo tempo da transição, então a duração total não muda e o
//   áudio original continua sincronizado.
async function concat(inputs, output, { audioFrom, crossfade = 0, onProgress = () => {} } = {}) {
  const infos = await Promise.all(inputs.map(probe));
  const { width, height, fps } = infos[0];
  const w = width - (width % 2);
  const h = height - (height % 2);
  const fade = inputs.length > 1 ? Math.max(0, crossfade) : 0;
  const total = infos.reduce((sum, i) => sum + i.duration, 0);

  const useAudio = Boolean(audioFrom) && (await probe(audioFrom)).hasAudio;
  const args = ["-y"];
  for (const file of inputs) args.push("-i", file);
  if (useAudio) args.push("-i", audioFrom);

  const filters = inputs.map((_, i) => {
    const pad = fade && i < inputs.length - 1 ? `,tpad=stop_mode=clone:stop_duration=${fade}` : "";
    return (
      `[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
      `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p${pad},settb=AVTB[v${i}]`
    );
  });

  if (fade) {
    let label = "v0";
    let offset = 0;
    for (let i = 1; i < inputs.length; i++) {
      offset += infos[i - 1].duration;
      const out = i === inputs.length - 1 ? "outv" : `x${i}`;
      filters.push(`[${label}][v${i}]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(3)}[${out}]`);
      label = out;
    }
  } else {
    filters.push(`${inputs.map((_, i) => `[v${i}]`).join("")}concat=n=${inputs.length}:v=1:a=0[outv]`);
  }
  args.push("-filter_complex", filters.join(";"), "-map", "[outv]");

  if (useAudio) {
    args.push("-map", `${inputs.length}:a:0`, "-c:a", "aac", "-b:a", "192k", "-shortest");
  }

  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-movflags", "+faststart", output);
  await run(ffmpegPath, args, { onProgress: (t) => onProgress(Math.min(1, t / total)) });
  onProgress(1);
  return output;
}

module.exports = { probe, planSegments, split, concat };
