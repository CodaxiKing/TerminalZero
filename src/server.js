const express = require("express");
const multer = require("multer");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const video = require("./video");

const PORT = Number(process.env.PORT) || 3000;
const SEGMENT_SECONDS = 5;
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

async function loadJob(id) {
  if (!validId(id)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(jobDir(id), "job.json"), "utf8"));
  } catch {
    return null;
  }
}

const saveJob = (job) => fs.writeFile(path.join(jobDir(job.id), "job.json"), JSON.stringify(job, null, 2));

// Cria um projeto: vídeo de movimento + imagem do personagem. Divide o vídeo em partes.
app.post(
  "/api/jobs",
  (req, res, next) => ((req.jobId = crypto.randomUUID()), next()),
  upload.fields([{ name: "motion", maxCount: 1 }, { name: "character", maxCount: 1 }]),
  async (req, res) => {
    const motion = req.files?.motion?.[0];
    if (!motion) return res.status(400).json({ error: "Envie o vídeo de movimento." });

    const dir = jobDir(req.jobId);
    try {
      const { duration, segments } = await video.split(motion.path, path.join(dir, "segments"), SEGMENT_SECONDS);
      const job = {
        id: req.jobId,
        createdAt: new Date().toISOString(),
        motion: path.basename(motion.path),
        character: req.files?.character?.[0] ? path.basename(req.files.character[0].path) : null,
        duration,
        segments: segments.map((s) => ({ ...s, result: null })),
        final: null,
      };
      await saveJob(job);
      res.json(job);
    } catch (err) {
      console.error(err);
      await fs.rm(dir, { recursive: true, force: true });
      res.status(500).json({ error: "Não foi possível processar o vídeo." });
    }
  }
);

app.get("/api/jobs/:id", async (req, res) => {
  const job = await loadJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Projeto não encontrado." });
  res.json(job);
});

// Envia o vídeo gerado para uma parte específica.
app.post(
  "/api/jobs/:id/segments/:index/result",
  async (req, res, next) => {
    const job = await loadJob(req.params.id);
    const segment = job?.segments[Number(req.params.index)];
    if (!segment) return res.status(404).json({ error: "Parte não encontrada." });
    req.job = job;
    req.segment = segment;
    req.jobId = job.id;
    next();
  },
  upload.single("result"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Envie o vídeo gerado." });
    const resultsDir = path.join(jobDir(req.job.id), "results");
    await fs.mkdir(resultsDir, { recursive: true });
    const name = `resultado_${String(req.segment.index + 1).padStart(2, "0")}${path.extname(req.file.originalname) || ".mp4"}`;
    await fs.rename(req.file.path, path.join(resultsDir, name));
    req.segment.result = name;
    req.job.final = null;
    await saveJob(req.job);
    res.json(req.job);
  }
);

// Junta todos os resultados em sequência.
app.post("/api/jobs/:id/merge", async (req, res) => {
  const job = await loadJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Projeto não encontrado." });
  const missing = job.segments.filter((s) => !s.result).map((s) => s.index + 1);
  if (missing.length) return res.status(400).json({ error: `Faltam os resultados das partes: ${missing.join(", ")}.` });

  const dir = jobDir(job.id);
  try {
    await video.concat(
      job.segments.map((s) => path.join(dir, "results", s.result)),
      path.join(dir, "final.mp4"),
      { audioFrom: req.body?.keepAudio ? path.join(dir, job.motion) : undefined }
    );
    job.final = "final.mp4";
    await saveJob(job);
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Não foi possível juntar os vídeos." });
  }
});

// Arquivos do projeto (partes, resultados, final, personagem).
app.get("/files/:id/*file", async (req, res) => {
  if (!validId(req.params.id)) return res.sendStatus(404);
  const base = jobDir(req.params.id);
  const file = path.resolve(base, ...req.params.file);
  if (!file.startsWith(base + path.sep) || file.endsWith("job.json")) return res.sendStatus(404);
  res.sendFile(file, (err) => err && !res.headersSent && res.sendStatus(404));
});

app.listen(PORT, () => console.log(`TerminalZero rodando em http://localhost:${PORT}`));
