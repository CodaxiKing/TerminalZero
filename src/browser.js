import { chromium } from 'playwright';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const sessions = new Map();
export async function openAccount(root, account) {
  let context = sessions.get(account.id);
  if (!context) {
    context = await chromium.launchPersistentContext(path.join(root, 'profiles', account.id), { channel: 'msedge', headless: false, acceptDownloads: true });
    sessions.set(account.id, context);
    context.on('close', () => sessions.delete(account.id));
  }
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://higgsfield.ai/ai/video/motion');
  return page;
}
export async function configuration(root) {
  try {
    const config = JSON.parse(await readFile(path.join(root, 'automation.json'), 'utf8'));
    for (const key of ['videoInput', 'imageInput', 'generateButton', 'downloadButton']) {
      if (typeof config[key] !== 'string' || !config[key].trim()) return null;
    }
    return config;
  } catch { return null; }
}
export async function generate(root, account, dir, part, config) {
  const page = await openAccount(root, account);
  if (config.emailInput && config.passwordInput && config.loginButton && account.password) {
    const email = page.locator(config.emailInput);
    if (await email.isVisible()) {
      await email.fill(account.email);
      await page.locator(config.passwordInput).fill(account.password);
      await page.locator(config.loginButton).click();
    }
  }
  await page.locator(config.videoInput).setInputFiles(path.join(dir, `part-${part.index}.mp4`), { timeout: 60000 });
  await page.locator(config.imageInput).setInputFiles(path.join(dir, 'character.png'), { timeout: 60000 });
  const button = page.locator(config.downloadButton);
  if (await button.count() && await button.first().isVisible()) throw new Error('Já existe um resultado visível nesta conta. Abra uma geração vazia antes de continuar para evitar baixar o vídeo errado.');
  await page.locator(config.generateButton).click();
  await button.waitFor({ state: 'visible', timeout: 30 * 60 * 1000 });
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await button.click();
  const download = await downloadPromise;
  if (await download.failure()) throw new Error('Falha ao baixar o resultado do Higgsfield.');
  await download.saveAs(path.join(dir, `result-${part.index}.mp4`));
}
