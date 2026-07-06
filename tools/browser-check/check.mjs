// Recorre Atlas en un navegador real (headless) y reporta errores de consola.
// Ver .claude/skills/atlas-browser-check/SKILL.md para cuándo y cómo usarlo.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE_URL = process.env.ATLAS_BASE_URL ?? 'http://localhost:4200';
const OWNER_EMAIL = process.env.ATLAS_OWNER_EMAIL ?? 'owner@atlas.dev';
const OWNER_PASSWORD = process.env.ATLAS_OWNER_PASSWORD ?? 'ChangeMe123!';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const COMPANY_NAME = `Browser Check ${RUN_ID}`;

mkdirSync('screenshots', { recursive: true });

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(String(err)));
page.on('dialog', async (dialog) => {
  await dialog.accept('Verificación automatizada (browser-check)');
});

async function shot(name) {
  // Vuelve al top antes de capturar: si la página quedó desplazada (por ejemplo
  // tras interactuar con un <input type="color">), un screenshot fullPage con
  // un header "position: sticky" a mitad de scroll produce un stitching
  // incorrecto en Chromium (el header aparece pegado en una posición rara).
  // No es un bug de la app — es una limitación conocida de las capturas
  // fullPage con elementos sticky/fixed.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  console.log('  screenshot:', name);
}

function step(label) {
  console.log(`\n${label}`);
}

try {
  step('1) Login');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForURL('**/login');
  await shot('01-login-light');

  step('2) Alternar a modo oscuro y confirmar que se aplica');
  await page.click('.theme-toggle');
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
  await shot('02-login-dark');
  await page.click('.theme-toggle'); // vuelve a claro para el resto del recorrido
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');

  step('3) Iniciar sesión como Platform Owner');
  await page.fill('input[type=email]', OWNER_EMAIL);
  await page.fill('input[type=password]', OWNER_PASSWORD);
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL('**/platform/companies');
  await page.waitForSelector('table');
  await shot('03-companies');

  step('4) Crear una empresa de prueba');
  await page.fill('input[placeholder="Nombre de la nueva empresa"]', COMPANY_NAME);
  await page.click('button:has-text("Crear empresa")');
  await page.waitForSelector(`text=${COMPANY_NAME}`);
  await shot('04-companies-created');

  step('5) Impersonar la empresa (Entrar como Business Admin)');
  const row = page.locator('tr', { hasText: COMPANY_NAME });
  await row.locator('button:has-text("Entrar como Business Admin")').click();
  await page.waitForURL('**/settings/company');
  await page.waitForSelector('text=Métodos de pago habilitados');
  await shot('05-settings-company');

  step('6) Actualizar configuración de la empresa (color con selector nativo)');
  await page.locator('input[formcontrolname=primaryColor]').fill('#334455');
  await page.waitForSelector('text=#334455');
  await page.click('button:has-text("Guardar cambios")');
  await page.waitForSelector('text=Cambios guardados.');
  await shot('06-settings-saved');

  step('7) Crear una sucursal y su horario');
  await page.click('a:has-text("Sucursales")');
  await page.waitForURL('**/settings/branches');
  await page.fill('input[placeholder="Nombre de la sucursal"]', 'Sucursal Browser Check');
  await page.click('button:has-text("Crear sucursal")');
  await page.waitForSelector('text=Sucursal Browser Check');
  await page.click('button:has-text("Editar horario")');
  await page.click('button:has-text("Añadir día")');
  await page.selectOption('select', '1');
  await page.fill('input[placeholder="09:00"]', '09:00');
  await page.fill('input[placeholder="18:00"]', '18:00');
  await page.click('button:has-text("Guardar horario")');
  await page.waitForSelector('text=09:00 – 18:00');
  await shot('07-branch-schedule');

  step('8) Volver al panel de plataforma sin cerrar sesión');
  await page.click('button:has-text("Volver al panel de plataforma")');
  await page.waitForURL('**/platform/companies');
  await page.waitForSelector(`text=${COMPANY_NAME}`);
  await shot('08-back-to-platform');

  console.log('\n=== RESULTADO: OK ===');
  console.log('Errores de consola:', consoleErrors.length ? consoleErrors : 'ninguno');
  console.log('Errores de página:', pageErrors.length ? pageErrors : 'ninguno');
  console.log(`\nEmpresa de prueba creada: "${COMPANY_NAME}" — bórrala cuando quieras desde Prisma Studio o psql.`);

  if (consoleErrors.length || pageErrors.length) {
    process.exitCode = 1;
  }
} catch (err) {
  console.error('\n=== RESULTADO: FALLÓ EL RECORRIDO ===');
  console.error(err);
  await shot('ERROR-state');
  console.log('Errores de consola hasta el fallo:', consoleErrors);
  console.log('Errores de página hasta el fallo:', pageErrors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
