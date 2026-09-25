import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { run, ffmpeg } from '../src/media.js';

test('API: cadastro, proteção de senha, upload, corte, importação e união', { timeout: 60000 }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'motionflow-api-'));
  const server = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: '0', MOTIONFLOW_DATA_DIR: path.join(dir, 'data') }, windowsHide: true });
  try {
    const [chunk] = await Promise.race([once(server.stdout, 'data'), once(server, 'error').then(([e]) => { throw e; })]);
    const url = String(chunk).trim().split(' ').at(-1);
    async function request(route, body) {
      const res = await fetch(url + route, body === undefined ? {} : { method: 'POST', headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' }, body: body instanceof FormData ? body : JSON.stringify(body) });
      const data = await res.json(); return { status: res.status, data };
    }
    const account = await request('/api/accounts', { email: 'test@example.com', password: 'local-test-only' });
    assert.equal(account.status, 200);
    assert.equal(account.data.password, undefined);
    assert.equal(account.data.secret, undefined);
    assert.equal((await request('/api/accounts', { email: 'test@example.com' })).status, 409);
    assert.ok(!(await readFile(path.join(dir, 'data/state.json'), 'utf8')).includes('local-test-only'));
    const forbidden = await fetch(url + '/api/accounts', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(forbidden.status, 403);
    await run(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=blue:size=160x120:rate=30:duration=1', '-c:v', 'libx264', path.join(dir, 'input.mp4')]);
    await run(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=red:size=160x120', '-frames:v', '1', path.join(dir, 'image.png')]);
    const form = new FormData();
    form.set('video', new Blob([await readFile(path.join(dir, 'input.mp4'))], { type: 'video/mp4' }), 'input.mp4');
    form.set('character', new Blob([await readFile(path.join(dir, 'image.png'))], { type: 'image/png' }), 'image.png');
    form.set('accounts', JSON.stringify([account.data.id]));
    const created = await request('/api/jobs', form);
    assert.equal(created.status, 202, JSON.stringify(created.data));
    const id = created.data.id;
    async function waitFor(status) {
      for (let i = 0; i < 100; i++) {
        const j = (await request('/api/state')).data.jobs[0];
        if (j.status === status) return j;
        if (j.status === 'error') throw new Error(j.error);
        await new Promise(r => setTimeout(r, 100));
      }
      throw new Error('Tempo esgotado');
    }
    await waitFor('ready');
    assert.equal((await request(`/api/jobs/${id}/merge`, {})).status, 400);
    assert.equal((await request(`/api/jobs/${id}/generate`, {})).status, 400);
    const cut = await fetch(url + `/api/jobs/${id}/files/part-0.mp4`);
    assert.equal(cut.status, 200);
    const result = new FormData(); result.set('video', await cut.blob(), 'result.mp4');
    assert.equal((await request(`/api/jobs/${id}/results/0`, result)).status, 200);
    assert.equal((await request(`/api/jobs/${id}/merge`, {})).status, 202);
    await waitFor('complete');
    assert.equal((await fetch(url + `/api/jobs/${id}/files/final.mp4`)).status, 200);
  } finally {
    server.kill(); await once(server, 'exit').catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});
