import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, copyFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { segments, run, ffmpeg, inspect, split, merge } from '../src/media.js';

test('divide 5, 12, 20 e 25 segundos sem trechos extras', () => {
  assert.deepEqual(segments(12).map(p => p.duration), [5, 5, 2]);
  assert.deepEqual(segments(20).map(p => p.start), [0, 5, 10, 15]);
  assert.equal(segments(5).length, 1);
  assert.equal(segments(25).length, 5);
  assert.throws(() => segments(0));
});
test('corta vídeo real de 12s, une em ordem e preserva a duração', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'motionflow-'));
  try {
    await run(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=160x120:rate=30:duration=12', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=12', '-c:v', 'libx264', '-c:a', 'aac', '-f', 'mp4', path.join(dir, 'source')]);
    const info = await inspect(path.join(dir, 'source'));
    const parts = segments(info.duration);
    await split(path.join(dir, 'source'), dir, parts);
    for (const part of parts) {
      const cut = path.join(dir, `part-${part.index}.mp4`);
      assert.ok(Math.abs((await inspect(cut)).duration - part.duration) < .15);
      await copyFile(cut, path.join(dir, `result-${part.index}.mp4`));
    }
    await merge(dir, parts, info);
    assert.ok(Math.abs((await inspect(path.join(dir, 'final.mp4'))).duration - 12) < .15);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
