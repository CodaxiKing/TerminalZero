// Automação do navegador para a página de Motion da Higgsfield, usando UMA conta.
// O login fica salvo no perfil do navegador (data/browser), então a senha só é
// usada quando a sessão expira. Nada de credenciais é gravado em disco pelo app.
//
// Os seletores foram escritos sem acesso ao site logado. Se a Higgsfield mudar a
// página ou algo não for encontrado, ajuste as constantes abaixo.
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const MOTION_URL = "https://higgsfield.ai/ai/video/motion";
const PROFILE_DIR = path.join(__dirname, "..", "data", "browser");
const HEADLESS = process.env.HEADLESS === "1";
const GENERATION_TIMEOUT = Number(process.env.GENERATION_TIMEOUT_MIN || 20) * 60_000;

const SIGN_IN_TEXT = /^(sign in|log in|login|entrar)$/i;
const GENERATE_TEXT = /^(generate|gerar|create)\b/i;

let context = null;
let credentials = null;

async function getContext() {
  if (context) return context;
  await fs.mkdir(PROFILE_DIR, { recursive: true });
  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
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

async function videoUrls(page) {
  return page.$$eval("video, video source", (els) =>
    els.map((el) => el.currentSrc || el.src).filter((src) => src && /^https?:/.test(src))
  );
}

// Gera uma parte: envia os arquivos, clica em gerar, espera o vídeo novo e baixa.
async function generate({ motionFile, characterFile, outFile, log = () => {} }) {
  const page = await getPage();
  await ensureLoggedIn(page, log);

  log("Enviando arquivos...");
  await fillInputs(page, motionFile, characterFile);

  // Guarda os vídeos já existentes (histórico) para identificar o resultado novo.
  const seen = new Set(await videoUrls(page));
  const fromNetwork = [];
  const onResponse = (res) => {
    const type = res.headers()["content-type"] || "";
    if (type.startsWith("video/") && !seen.has(res.url())) fromNetwork.push(res.url());
  };

  const button = page.getByRole("button", { name: GENERATE_TEXT }).last();
  log("Aguardando o upload terminar...");
  await button.waitFor({ timeout: 60_000 });
  const uploadDeadline = Date.now() + 5 * 60_000;
  while (!(await button.isEnabled()) && Date.now() < uploadDeadline) await page.waitForTimeout(1000);
  (await videoUrls(page)).forEach((url) => seen.add(url));

  page.on("response", onResponse);
  try {
    await button.click();
    log("Gerando na Higgsfield (pode levar alguns minutos)...");

    const deadline = Date.now() + GENERATION_TIMEOUT;
    let url = null;
    while (!url && Date.now() < deadline) {
      await page.waitForTimeout(5000);
      url = (await videoUrls(page)).find((src) => !seen.has(src)) ?? fromNetwork.find((src) => !seen.has(src));
    }
    if (!url) throw new Error("Tempo esgotado esperando o vídeo gerado.");

    log("Baixando resultado...");
    const res = await page.context().request.get(url);
    if (!res.ok()) throw new Error(`Falha ao baixar o vídeo (${res.status()}).`);
    await fs.writeFile(outFile, await res.body());
    return outFile;
  } finally {
    page.off("response", onResponse);
  }
}

async function close() {
  await context?.close();
  context = null;
}

module.exports = { setCredentials, generate, close, hasCredentials: () => Boolean(credentials) };
