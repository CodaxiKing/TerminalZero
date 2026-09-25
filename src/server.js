const express = require("express");
const multer = require("multer");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const video = require("./video");
const higgsfield = require("./higgsfield");

const PORT = Number(process.env.PORT) || 3000;
const MIN_SEGMENT = 3;
const MAX_SEGMENT = 10;
const DEFAULT_SEGMENT = 5;
const DATA_DIR = path.join(__dirname, "..", "data", "jobs");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const dir = path.join(DATA_DIR, req.jobId ?? "tmp");
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const jobDir = (id) => path.join(DATA_DIR, id);
const validId = (id) => /^[a-f0-9-]{36}$/.test(id);
const pad = (n) => String(n).padStart(2, "0");

async function loadJob(id) {
  if (!validId(id)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(jobDir(id), "job.json"), "utf8"));
  } catch {
    return null;
  }
}

const saveJob = (job) => fs.writeFile(path.join(jobDir(job.id), "job.json"), JSON.stringify(job, null, 2));

async function updateJob(id, change) {
  const job = await loadJob(id);
  if (!job) return null;
  change(job);
  await saveJob(job);
  return job;
}

// ---- Estado em memória ----
// tasks: divisão/junção em andamento por projeto -> { kind, progress, error }
// generation: status de cada parte -> "jobId:index" -> { state, message, debug }
// queue: fila "Gerar todas" em andamento -> { jobId, stop }
const tasks = new Map();
const generation = new Map();
let busy = false;
let queue = null;

const fileUrl = (id, file) => `/files/${id}/${path.relative(jobDir(id), file).split(path.sep).join("/")}`;

const withStatus = (job) => ({
  ...job,
  segments: job.segments.map((s) => ({ ...s, status: generation.get(`${job.id}:${s.index}`) ?? null })),
  task: tasks.get(job.id) ?? null,
  busy,
  queue: queue?.jobId === job.id ? { stopping: queue.stop } : null,
  loggedIn: higgsfield.hasCredentials(),
});

// ---- Projetos ----

app.get("/api/jobs", async (req, res) => {
  const ids = await fs.readdir(DATA_DIR).catch(() => []);
  const jobs = (await Promise.all(ids.map(loadJob))).filter(Boolean);
  jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(
    jobs.map((j) => ({
      id: j.id,
      createdAt: j.createdAt,
      duration: j.duration,
      parts: j.segments.length,
      done: j.segments.filter((s) => s.result).length,
      final: Boolean(j.final),
      error: j.error ?? null,
    }))
  );
});

// Cria um projeto e divide o vídeo em segundo plano (acompanhe pelo GET).
app.post(
  "/api/jobs",
  (req, res, next) => ((req.jobId = crypto.randomUUID()), next()),
  upload.fields([{ name: "motion", maxCount: 1 }, { name: "character", maxCount: 1 }]),
  async (req, res) => {
    const motion = req.files?.motion?.[0];
    const dir = jobDir(req.jobId);
    if (!motion) {
      await fs.rm(dir, { recursive: true, force: true });
      return res.status(400).json({ error: "Envie o vídeo de movimento." });
    }

    const seconds = Number(req.body?.segmentSeconds) || DEFAULT_SEGMENT;
    if (seconds < MIN_SEGMENT || seconds > MAX_SEGMENT) {
      await fs.rm(dir, { recursive: true, force: true });
      return res.status(400).json({ error: `O tamanho da parte deve ficar entre ${MIN_SEGMENT} e ${MAX_SEGMENT} segundos.` });
    }

    const job = {
      id: req.jobId,
      createdAt: new Date().toISOString(),
      motion: path.basename(motion.path),
      character: req.files?.character?.[0] ? path.basename(req.files.character[0].path) : null,
      segmentSeconds: seconds,
      duration: 0,
      segments: [],
      final: null,
      error: null,
    };
    await saveJob(job);

    const task = { kind: "split", progress: 0 };
    tasks.set(job.id, task);
    res.json(withStatus(job));

    try {
      const { duration, segments } = await video.split(motion.path, path.join(dir, "segments"), seconds, (p) => (task.progress = p));
      await updateJob(job.id, (j) => {
        j.duration = duration;
        j.segments = segments.map((s) => ({ ...s, result: null }));
      });
    } catch (err) {
      console.error(err);
      await updateJob(job.id, (j) => (j.error = "Não foi possível dividir o vídeo."));
    } finally {
      tasks.delete(job.id);
    }
  }
);

app.get("/api/jobs/:id", async (req, res) => {
  const job = await loadJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Projeto não encontrado." });
  res.json(withStatus(job));
});

app.delete("/api/jobs/:id", async (req, res) => {
  const job = await loadJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Projeto não encontrado." });
  if (tasks.has(job.id) || queue?.jobId === job.id || [...generation].some(([k, s]) => k.startsWith(job.id) && s.state === "running")) {
    return res.status(409).json({ error: "Esse projeto está em processamento. Aguarde terminar." });
  }
  await fs.rm(jobDir(job.id), { recursive: true, force: true });
  for (const key of generation.keys()) if (key.startsWith(`${job.id}:`)) generation.delete(key);
  res.json({ ok: true });
});

// ---- Higgsfield ----

// Guarda email e senha da conta Higgsfield só na memória do servidor.
app.post("/api/higgsfield/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Informe email e senha." });
  higgsfield.setCredentials(email, password);
  res.json({ ok: true });
});

// Gera uma parte e salva o resultado no slot dela. Lança o erro para a fila decidir.
async function generateSegment(jobId, index) {
  const job = await loadJob(jobId);
  const segment = job.segments[index];
  const key = `${jobId}:${index}`;
  const dir = jobDir(jobId);
  const name = `resultado_${pad(index + 1)}.mp4`;
  const log = (message) => generation.set(key, { state: "running", message });

  log("Iniciando...");
  try {
    await fs.mkdir(path.join(dir, "results"), { recursive: true });
    await higgsfield.generate({
      motionFile: path.join(dir, "segments", segment.file),
      characterFile: job.character ? path.join(dir, job.character) : null,
      outFile: path.join(dir, "results", name),
      debugDir: path.join(dir, "debug"),
      debugName: `parte_${pad(index + 1)}`,
      log,
    });
    await updateJob(jobId, (j) => {
      j.segments[index].result = name;
      j.final = null;
    });
    generation.set(key, { state: "done", message: "Concluído." });
  } catch (err) {
    console.error(err);
    generation.set(key, {
      state: err.code === "NO_CREDITS" ? "no-credits" : "error",
      message: err.message,
      debug: (err.debug ?? []).map((f) => fileUrl(jobId, f)),
    });
    throw err;
  }
}

function startExclusive(res, work) {
  if (busy) return res.status(409).json({ error: "Já existe uma geração em andamento. Aguarde terminar." });
  busy = true;
  work().finally(() => {
    busy = false;
    queue = null;
  });
}

app.post("/api/jobs/:id/segments/:index/generate", async (req, res) => {
  const job = await loadJob(req.params.id);
  const index = Number(req.params.index);
  if (!job?.segments[index]) return res.status(404).json({ error: "Parte não encontrada." });

  startExclusive(res, () => generateSegment(job.id, index).catch(() => {}));
  if (!res.headersSent) {
    generation.set(`${job.id}:${index}`, { state: "running", message: "Iniciando..." });
    res.json(withStatus(job));
  }
});

// Gera, em ordem, todas as partes que ainda não têm resultado. Para no primeiro erro
// (inclusive falta de créditos) para não gastar créditos à toa.
app.post("/api/jobs/:id/generate-all", async (req, res) => {
  const job = await loadJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Projeto não encontrado." });
  const pending = job.segments.filter((s) => !s.result).map((s) => s.index);
  if (!pending.length) return res.status(400).json({ error: "Todas as partes já têm resultado." });

  startExclusive(res, async () => {
    queue = { jobId: job.id, stop: false };
    for (const index of pending) generation.set(`${job.id}:${index}`, { state: "queued", message: "Na fila." });
    try {
      for (const index of pending) {
        if (queue.stop) break;
        await generateSegment(job.id, index);
      }
    } catch {
      // O status da parte já mostra o erro; as seguintes ficam aguardando.
    } finally {
      for (const index of pending) {
        if (generation.get(`${job.id}:${index}`)?.state === "queued") generation.delete(`${job.id}:${index}`);
      }
    }
  });
  if (!res.headersSent) res.json(withStatus(job));
});

app.post("/api/jobs/:id/generate-all/stop", (req, res) => {
  if (queue?.jobId !== req.params.id) return res.status(400).json({ error: "Nenhuma fila em andamento neste projeto." });
  queue.stop = true;
  res.json({ ok: true });
});

// ---- Resultados e junção ----

// Envia manualmente o vídeo gerado de uma parte.
app.post(
  "/api/jobs/:id/segments/:index/result",
  async (req, res, next) => {
    const job = await loadJob(req.params.id);
    const segment = job?.segments[Number(req.params.index)];
    if (!segment) return res.status(404).json({ error: "Parte não encontrada." });
    req.segment = segment;
    req.jobId = job.id;
    next();
  },
  upload.single("result"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Envie o vídeo gerado." });
    const resultsDir = path.join(jobDir(req.jobId), "results");
    await fs.mkdir(resultsDir, { recursive: true });
    const name = `resultado_${pad(req.segment.index + 1)}${path.extname(req.file.originalname) || ".mp4"}`;
    await fs.rename(req.file.path, path.join(resultsDir, name));
    generation.delete(`${req.jobId}:${req.segment.index}`);
    const job = await updateJob(req.jobId, (j) => {
      j.segments[req.segment.index].result = name;
      j.final = null;
    });
    res.json(withStatus(job));
  }
);

// Junta todos os resultados em sequência, em segundo plano (acompanhe pelo GET).
app.post("/api/jobs/:id/merge", async (req, res) => {
  const job = await loadJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Projeto não encontrado." });
  if (tasks.has(job.id)) return res.status(409).json({ error: "Esse projeto já está sendo processado." });
  const missing = job.segments.filter((s) => !s.result).map((s) => s.index + 1);
  if (missing.length) return res.status(400).json({ error: `Faltam os resultados das partes: ${missing.join(", ")}.` });

  const crossfade = Math.min(1, Math.max(0, Number(req.body?.crossfade) || 0));
  const dir = jobDir(job.id);
  const task = { kind: "merge", progress: 0 };
  tasks.set(job.id, task);
  const reset = (j) => {
    j.final = null;
    j.error = null;
  };
  await updateJob(job.id, reset);
  reset(job);
  res.json(withStatus(job));

  try {
    await video.concat(
      job.segments.map((s) => path.join(dir, "results", s.result)),
      path.join(dir, "final.mp4"),
      {
        audioFrom: req.body?.keepAudio ? path.join(dir, job.motion) : undefined,
        crossfade,
        onProgress: (p) => (task.progress = p),
      }
    );
    await updateJob(job.id, (j) => {
      j.final = "final.mp4";
      j.error = null;
    });
  } catch (err) {
    console.error(err);
    await updateJob(job.id, (j) => (j.error = "Não foi possível juntar os vídeos."));
  } finally {
    tasks.delete(job.id);
  }
});

// Arquivos do projeto (partes, resultados, final, personagem, diagnóstico).
app.get("/files/:id/*file", async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const base = jobDir(req.params.id);
  const file = path.resolve(base, ...req.params.file);
  if (!file.startsWith(base + path.sep) || file.endsWith("job.json")) return res.sendStatus(404);
  res.sendFile(file, (err) => err && !res.headersSent && res.sendStatus(404));
});

app.listen(PORT, () => console.log(`TerminalZero rodando em http://localhost:${PORT}`));
