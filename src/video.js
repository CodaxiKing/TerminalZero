const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
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
    "-show_entries", "format=duration:stream=codec_type,width,height",
    "-of", "json",
    file,
  ]);
  const info = JSON.parse(out);
  const video = info.streams.find((s) => s.codec_type === "video");
  return {
    duration: Number(info.format.duration) || 0,
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    hasAudio: info.streams.some((s) => s.codec_type === "audio"),
  };
}

// Divide o vídeo em partes de `seconds` segundos. A última parte fica com o resto
// (ex.: 12s -> 0-5, 5-10, 10-12). Recodifica para o corte ser exato no segundo.
async function split(input, outDir, seconds = 5) {
  await fs.mkdir(outDir, { recursive: true });
  const { duration } = await probe(input);
  const count = Math.ceil(duration / seconds - 0.01);
  const segments = [];

  for (let i = 0; i < count; i++) {
    const start = i * seconds;
    const length = Math.min(seconds, duration - start);
    const file = path.join(outDir, `parte_${String(i + 1).padStart(2, "0")}.mp4`);
    await run(ffmpegPath, [
      "-y",
      "-ss", String(start),
      "-i", input,
      "-t", String(length),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      file,
    ]);
    segments.push({ index: i, start, end: start + length, file: path.basename(file) });
  }
  return { duration, segments };
}

// Junta os vídeos em sequência. Todos são ajustados para a resolução do primeiro
// (com barras se a proporção for diferente). Opcionalmente usa o áudio do original.
async function concat(inputs, output, { audioFrom } = {}) {
  const first = await probe(inputs[0]);
  const w = first.width - (first.width % 2);
  const h = first.height - (first.height % 2);

  const useAudio = Boolean(audioFrom) && (await probe(audioFrom)).hasAudio;
  const args = ["-y"];
  for (const file of inputs) args.push("-i", file);
  if (useAudio) args.push("-i", audioFrom);

  const filters = inputs.map(
    (_, i) =>
      `[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
      `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${i}]`
  );
  filters.push(`${inputs.map((_, i) => `[v${i}]`).join("")}concat=n=${inputs.length}:v=1:a=0[outv]`);
  args.push("-filter_complex", filters.join(";"), "-map", "[outv]");

  if (useAudio) {
    args.push("-map", `${inputs.length}:a:0`, "-c:a", "aac", "-b:a", "192k", "-shortest");
  }

  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-movflags", "+faststart", output);
  await run(ffmpegPath, args);
  return output;
}

module.exports = { probe, split, concat };
