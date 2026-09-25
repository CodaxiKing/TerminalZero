import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { inspect, segments, split, merge, run, ffmpeg } from './media.js';
import { openAccount, configuration, generate } from './browser.js';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = process.env.MOTIONFLOW_DATA_DIR || path.join(base, 'data');
await mkdir(path.join(root, 'uploads'), { recursive: true });
let key;
try { key = await readFile(path.join(root, 'key')); }
catch { key = randomBytes(32); await writeFile(path.join(root, 'key'), key, { mode: 0o600 }); }
function encrypt(value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}
function decrypt(value) {
  const b = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString('utf8');
}
let state;
try { state = JSON.parse(await readFile(path.join(root, 'state.json'), 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; state = { accounts: [], jobs: [] }; }
for (const j of state.jobs) if (['cutting', 'running', 'merging'].includes(j.status)) { j.status = 'error'; j.error = 'O aplicativo foi interrompido. Crie um novo projeto ou importe os resultados existentes.'; }
let writes = Promise.resolve();
function save() {
  const json = JSON.stringify(state, null, 2);
  writes = writes.catch(() => {}).then(async () => { await writeFile(path.join(root, 'state.tmp'), json); await rename(path.join(root, 'state.tmp'), path.join(root, 'state.json')); });
  return writes;
}
await save();
const app = express();
app.use((req, res, next) => {
  if (!['127.0.0.1', 'localhost'].includes(req.hostname)) return res.status(403).json({ error: 'Acesso somente local.' });
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return res.status(403).json({ error: 'Origem não permitida.' });
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '32kb' }));
const upload = multer({ dest: path.join(root, 'uploads'), limits: { fileSize: 1024 * 1024 * 1024, files: 2, fields: 5 } });
const publicAccount = a => ({ id: a.id, email: a.email, hasPassword: !!a.secret });
app.get('/api/state', async (req, res) => res.json({ accounts: state.accounts.map(publicAccount), jobs: state.jobs, automationReady: !!await configuration(root) }));
app.post('/api/accounts', async (req, res) => {
  const { email, password = '' } = req.body;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string') return res.status(400).json({ error: 'Informe um e-mail válido.' });
  if (state.accounts.some(a => a.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'Conta já cadastrada.' });
  const account = { id: randomUUID(), email, secret: password ? encrypt(password) : '' };
  state.accounts.push(account); await save(); res.json(publicAccount(account));
});
app.post('/api/accounts/:id/open', async (req, res) => {
  const account = state.accounts.find(a => a.id === req.params.id);
  if (!account) return res.sendStatus(404);
  await openAccount(root, account); res.json({ ok: true });
});
const busy = j => ['cutting', 'running', 'merging'].includes(j.status);
function job(req) { const j = state.jobs.find(j => j.id === req.params.id); if (!j) throw new Error('Projeto não encontrado'); return j; }
async function background(j, status, fn, done) {
  j.status = status; j.error = null; await save();
  try { await fn(); j.status = done; }
  catch (e) { j.status = 'error'; j.error = e.message.slice(-1500); }
  await save();
}
app.post('/api/jobs', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'character', maxCount: 1 }]), async (req, res) => {
  const files = Object.values(req.files || {}).flat();
  try {
    const video = req.files?.video?.[0], character = req.files?.character?.[0];
    if (!video || !character) throw new Error('Selecione o vídeo e a imagem do personagem.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(character.mimetype)) throw new Error('Use uma imagem PNG, JPG ou WebP.');
    await inspect(character.path, true);
    const info = await inspect(video.path);
    const parts = segments(info.duration);
    const ids = JSON.parse(req.body.accounts || '[]');
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => !state.accounts.some(a => a.id === id)) || ids.length < parts.length) throw new Error(`Selecione pelo menos ${parts.length} contas diferentes, uma por trecho.`);
    const id = randomUUID(), dir = path.join(root, id); await mkdir(dir);
    await rename(video.path, path.join(dir, 'source'));
    await run(ffmpeg, ['-y', '-i', character.path, '-frames:v', '1', path.join(dir, 'character.png')]);
    const j = { id, name: video.originalname, createdAt: new Date().toISOString(), ...info, width: Math.ceil(info.width / 2) * 2, height: Math.ceil(info.height / 2) * 2, status: 'cutting', parts: parts.map((p, i) => ({ ...p, accountId: ids[i], ready: false })) };
    state.jobs.unshift(j); await save();
    void background(j, 'cutting', () => split(path.join(dir, 'source'), dir, j.parts), 'ready');
    res.status(202).json(j);
  } finally { for (const f of files) await rm(f.path, { force: true }); }
});
app.post('/api/jobs/:id/results/:index', upload.single('video'), async (req, res) => {
  try {
    const j = job(req), part = j.parts.find(p => String(p.index) === req.params.index);
    if (busy(j) || !part || !req.file) throw new Error('Trecho indisponível para importação.');
    const info = await inspect(req.file.path);
    if (info.duration + 0.12 < part.duration) throw new Error('O resultado é mais curto que o trecho original.');
    await rename(req.file.path, path.join(root, j.id, `result-${part.index}.mp4`));
    part.ready = true; j.status = 'ready'; j.error = null; await rm(path.join(root, j.id, 'final.mp4'), { force: true }); await save(); res.json(j);
  } finally { if (req.file) await rm(req.file.path, { force: true }); }
});
app.post('/api/jobs/:id/merge', async (req, res) => {
  const j = job(req);
  if (busy(j) || !j.parts.every(p => p.ready)) throw new Error('Importe todos os resultados antes de unir.');
  void background(j, 'merging', () => merge(path.join(root, j.id), j.parts, j), 'complete'); res.status(202).json({ ok: true });
});
let generating = false;
app.post('/api/jobs/:id/generate', async (req, res) => {
  const j = job(req), config = await configuration(root);
  if (!config) throw new Error('Automação pendente: configure e valide os seletores em data/automation.json. Você já pode baixar os cortes e importar os resultados.');
  if (generating || busy(j)) throw new Error('Já existe um processamento em andamento.');
  if (j.parts.some(p => p.submitted && !p.ready)) throw new Error('Há uma geração enviada sem resultado confirmado. Verifique a conta e importe o resultado para evitar uma cobrança duplicada.');
  generating = true;
  void background(j, 'running', async () => {
    try {
      for (const part of j.parts.filter(p => !p.ready)) {
        const a = state.accounts.find(a => a.id === part.accountId);
        part.submitted = true; await save();
        await generate(root, { ...a, password: a.secret ? decrypt(a.secret) : '' }, path.join(root, j.id), part, config);
        const result = await inspect(path.join(root, j.id, `result-${part.index}.mp4`));
        if (result.duration + 0.12 < part.duration) throw new Error('Resultado menor que o trecho original.');
        part.ready = true; await save();
      }
      j.status = 'merging'; await save(); await merge(path.join(root, j.id), j.parts, j);
    } finally { generating = false; }
  }, 'complete'); res.status(202).json({ ok: true });
});
app.get('/api/jobs/:id/files/:name', (req, res) => {
  const j = job(req), name = req.params.name;
  if (!/^(part-\d+\.mp4|result-\d+\.mp4|final\.mp4|character)$/.test(name)) return res.sendStatus(404);
  res.download(path.join(root, j.id, name === 'character' ? 'character.png' : name));
});
app.use(express.static(path.join(base, 'public')));
app.use((err, req, res, next) => { if (res.headersSent) return next(err); res.status(400).json({ error: err.message || 'Não foi possível executar a operação.' }); });
const server = app.listen(Number(process.env.PORT || 4317), '127.0.0.1', () => console.log(`MotionFlow: http://127.0.0.1:${server.address().port}`));
server.on('error', error => { console.error(`Não foi possível iniciar: ${error.message}`); process.exitCode = 1; });
