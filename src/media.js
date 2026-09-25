import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import probe from 'ffprobe-static';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';

export function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err = (err + d).slice(-10000));
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(out) : reject(new Error(err || `Processo terminou com ${code}`)));
  });
}
export async function inspect(file, image = false) {
  const info = JSON.parse(await run(probe.path, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]));
  const video = info.streams.find(s => s.codec_type === 'video');
  if (!video) throw new Error('O arquivo não contém vídeo.');
  if (image) return { width: video.width, height: video.height };
  const duration = Number(info.format.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1800) throw new Error('Use um vídeo de até 30 minutos.');
  return { duration, width: video.width, height: video.height };
}
export function segments(duration) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Duração inválida');
  return Array.from({ length: Math.ceil((duration - 0.000001) / 5) }, (_, i) => ({ index: i, start: i * 5, duration: Math.min(5, duration - i * 5) }));
}
export async function split(input, dir, parts) {
  for (const part of parts) {
    await run(ffmpeg, ['-y', '-i', input, '-ss', String(part.start), '-t', String(part.duration), '-map', '0:v:0', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', path.join(dir, `part-${part.index}.mp4`)]);
  }
}
export async function merge(dir, parts, size) {
  for (const part of parts) {
    const info = await inspect(path.join(dir, `result-${part.index}.mp4`));
    if (info.duration + 0.12 < part.duration) throw new Error(`Parte ${part.index + 1}: resultado menor que o trecho original.`);
    await run(ffmpeg, ['-y', '-i', path.join(dir, `result-${part.index}.mp4`), '-t', String(part.duration), '-vf', `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', path.join(dir, `normalized-${part.index}.mp4`)]);
  }
  await writeFile(path.join(dir, 'concat.txt'), parts.map(p => `file 'normalized-${p.index}.mp4'`).join('\n'));
  await run(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'concat.txt'), '-i', path.join(dir, 'source'), '-map', '0:v:0', '-map', '1:a?', '-c:v', 'copy', '-c:a', 'aac', '-t', String(parts.reduce((n, p) => n + p.duration, 0)), '-movflags', '+faststart', path.join(dir, 'final.mp4')]);
}
export { ffmpeg };
