// Automação do navegador para a página de Motion da Higgsfield, usando UMA conta.
// O login fica salvo no perfil do navegador (data/browser), então a senha só é
// usada quando a sessão expira. Nada de credenciais é gravado em disco pelo app.
//
// Os seletores foram escritos sem acesso ao site logado. Se a Higgsfield mudar a
// página ou algo não for encontrado, ajuste as constantes abaixo. Quando uma geração
// falha, um print e o HTML da página são salvos em data/jobs/<id>/debug.
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const MOTION_URL = process.env.HIGGSFIELD_URL || "https://higgsfield.ai/ai/video/motion";
const PROFILE_DIR = path.join(__dirname, "..", "data", "browser");
const HEADLESS = process.env.HEADLESS === "1";
const GENERATION_TIMEOUT = Number(process.env.GENERATION_TIMEOUT_MIN || 20) * 60_000;

const SIGN_IN_TEXT = /^(sign in|log in|login|entrar)$/i;
const GENERATE_TEXT = /^(generate|gerar|create)\b/i;
const NO_CREDITS_TEXT =
  /(not enough credits|insufficient credits|out of credits|no credits left|you have run out of credits|créditos insuficientes|sem créditos)/i;

class NoCreditsError extends Error {
  constructor() {
    super("Sem créditos na conta Higgsfield.");
    this.code = "NO_CREDITS";
  }
}

let context = null;
let credentials = null;

async function getContext() {
  if (context) return context;
  await fs.mkdir(PROFILE_DIR, { recursive: true });
  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    acceptDownloads: true,
    viewport: { width: 1400, height: 900 },
  });
  context.on("close", () => (context = null));
  return context;
}

async function getPage() {
  const ctx = await getContext();
  return ctx.pages()[0] ?? ctx.newPage();
}

function setCredentials(email, password) {
  credentials = email && password ? { email, password } : null;
}

async function isLoggedIn(page) {
  const signIn = page.getByRole("button", { name: SIGN_IN_TEXT }).or(page.getByRole("link", { name: SIGN_IN_TEXT }));
  return !(await signIn.first().isVisible().catch(() => false));
}

async function ensureLoggedIn(page, log) {
  await page.goto(MOTION_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  if (await isLoggedIn(page)) return;

  if (!credentials) throw new Error("Sessão expirada. Informe email e senha e tente de novo.");
  log("Fazendo login...");

  await page.getByRole("button", { name: SIGN_IN_TEXT }).or(page.getByRole("link", { name: SIGN_IN_TEXT })).first().click();

  const email = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"], input[name="identifier"]').first();
  await email.waitFor({ timeout: 30_000 });
  await email.fill(credentials.email);

  const password = page.locator('input[type="password"]').first();
  if (!(await password.isVisible().catch(() => false))) {
    // Alguns logins pedem o email primeiro e a senha numa segunda etapa.
    await email.press("Enter");
    await password.waitFor({ timeout: 30_000 });
  }
  await password.fill(credentials.password);
  await password.press("Enter");

  // Se aparecer captcha ou código por email, resolva na janela do navegador.
  log("Aguardando o login terminar (resolva captcha/código na janela, se aparecer)...");
  const deadline = Date.now() + 3 * 60_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    if (!page.url().includes(new URL(MOTION_URL).pathname)) {
      await page.goto(MOTION_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    if (await isLoggedIn(page)) return;
  }
  throw new Error("Não foi possível confirmar o login.");
}

async function checkCredits(page) {
  const text = await page.locator("body").innerText().catch(() => "");
  if (NO_CREDITS_TEXT.test(text)) throw new NoCreditsError();
}

// Coloca o vídeo e o personagem nos campos de upload da página de Motion.
async function fillInputs(page, motionFile, characterFile) {
  const inputs = page.locator('input[type="file"]');
  await inputs.first().waitFor({ state: "attached", timeout: 30_000 });
  const count = await inputs.count();

  let motionInput = null;
  let characterInput = null;
  for (let i = 0; i < count; i++) {
    const accept = ((await inputs.nth(i).getAttribute("accept")) || "").toLowerCase();
    if (!motionInput && /video|mp4|mov/.test(accept)) motionInput = inputs.nth(i);
    else if (!characterInput && /image|png|jpe?g|webp/.test(accept)) characterInput = inputs.nth(i);
  }
  // Sem "accept": segue a ordem da tela (movimento à esquerda, personagem à direita).
  motionInput ??= inputs.nth(0);
  characterInput ??= count > 1 ? inputs.nth(1) : null;

  await motionInput.setInputFiles(motionFile);
  if (characterFile) {
    if (!characterInput) throw new Error("Campo do personagem não encontrado na página.");
    await characterInput.setInputFiles(characterFile);
  }
}

// Vídeos visíveis na página, do card mais recente para o mais antigo. Nas galerias
// da Higgsfield a geração nova entra no topo, então ordenamos por posição na tela.
async function videosByRecency(page) {
  return page.$$eval("video", (els) =>
    els
      .map((el) => {
        const src = el.currentSrc || el.src || el.querySelector("source")?.src || "";
        const box = el.getBoundingClientRect();
        return { src, top: box.top + window.scrollY, left: box.left + window.scrollX, visible: box.width > 0 };
      })
      .filter((v) => v.visible && /^https?:/.test(v.src))
      .sort((a, b) => a.top - b.top || a.left - b.left)
      .map((v) => v.src)
  );
}

async function saveDebug(page, debugDir, name) {
  if (!page || !debugDir) return [];
  await fs.mkdir(debugDir, { recursive: true });
  const base = path.join(debugDir, `${name}_${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const files = [];
  await page.screenshot({ path: `${base}.png`, fullPage: true }).then(() => files.push(`${base}.png`)).catch(() => {});
  await page.content().then((html) => fs.writeFile(`${base}.html`, html)).then(() => files.push(`${base}.html`)).catch(() => {});
  return files;
}

// Gera uma parte: envia os arquivos, clica em gerar, espera o card mais recente
// ficar pronto e baixa o vídeo dele.
async function generate({ motionFile, characterFile, outFile, debugDir, debugName = "erro", log = () => {} }) {
  let page = null;
  try {
    page = await getPage();
    await ensureLoggedIn(page, log);
    await checkCredits(page);

    log("Enviando arquivos...");
    await fillInputs(page, motionFile, characterFile);

    const button = page.getByRole("button", { name: GENERATE_TEXT }).last();
    log("Aguardando o upload terminar...");
    await button.waitFor({ timeout: 60_000 });
    const uploadDeadline = Date.now() + 5 * 60_000;
    while (!(await button.isEnabled()) && Date.now() < uploadDeadline) {
      await checkCredits(page);
      await page.waitForTimeout(1000);
    }
    if (!(await button.isEnabled())) {
      await checkCredits(page);
      throw new Error("O botão de gerar não ficou disponível.");
    }

    // Tudo que já está na tela (histórico e prévias do upload) não é o resultado.
    const seen = new Set(await videosByRecency(page));
    const inputSize = (await fs.stat(motionFile)).size;

    await button.click();
    log("Gerando na Higgsfield (pode levar alguns minutos)...");
    await page.waitForTimeout(3000);
    await checkCredits(page);

    const deadline = Date.now() + GENERATION_TIMEOUT;
    let candidate = null;
    while (Date.now() < deadline) {
      await page.waitForTimeout(5000);
      await checkCredits(page);
      const newest = (await videosByRecency(page)).find((src) => !seen.has(src));
      if (!newest) continue;
      // Só aceita quando o mesmo vídeo aparece em duas verificações seguidas.
      if (newest !== candidate) {
        candidate = newest;
        continue;
      }

      log("Baixando resultado...");
      const res = await page.context().request.get(newest);
      if (!res.ok()) throw new Error(`Falha ao baixar o vídeo (${res.status()}).`);
      const body = await res.body();
      if (body.length === inputSize) {
        // É o próprio vídeo enviado sendo exibido no card; continua esperando.
        seen.add(newest);
        candidate = null;
        continue;
      }
      await fs.writeFile(outFile, body);
      return outFile;
    }
    throw new Error("Tempo esgotado esperando o vídeo gerado.");
  } catch (err) {
    err.debug = await saveDebug(page, debugDir, debugName);
    throw err;
  }
}

async function close() {
  await context?.close();
  context = null;
}

module.exports = { setCredentials, generate, close, hasCredentials: () => Boolean(credentials) };
