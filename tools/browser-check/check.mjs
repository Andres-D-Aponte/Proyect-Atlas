// Recorre Atlas en un navegador real (headless) y reporta errores de consola.
// Ver .claude/skills/atlas-browser-check/SKILL.md para cuándo y cómo usarlo.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE_URL = process.env.ATLAS_BASE_URL ?? 'http://localhost:4200';
const OWNER_EMAIL = process.env.ATLAS_OWNER_EMAIL ?? 'owner@atlas.dev';
const OWNER_PASSWORD = process.env.ATLAS_OWNER_PASSWORD ?? 'ChangeMe123!';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const COMPANY_NAME = `Browser Check ${RUN_ID}`;
const ADMIN_EMAIL = `browser-check-admin-${RUN_ID}@atlas.dev`;
const ADMIN_PASSWORD = 'ChangeMe123!';
const STAFF_EMAIL = `browser-check-staff-${RUN_ID}@atlas.dev`;

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

  step('9) Crear el Business Admin real de la empresa (desde el panel de Empresas)');
  const adminRow = page.locator('tr', { hasText: COMPANY_NAME });
  await adminRow.locator('button:has-text("+ Admin")').click();
  await page.fill('input[placeholder="Correo del Business Admin"]', ADMIN_EMAIL);
  await page.fill('input[placeholder="Contraseña inicial"]', ADMIN_PASSWORD);
  await page.locator('tr.admin-form-row').locator('button:has-text("Crear")').click();
  await page.waitForSelector('input[placeholder="Correo del Business Admin"]', { state: 'detached' });
  await shot('09-admin-created');

  step('10) Cerrar sesión y entrar con el Business Admin real (no impersonación)');
  await page.click('button:has-text("Salir")');
  await page.waitForURL('**/login');
  await page.fill('input[type=email]', ADMIN_EMAIL);
  await page.fill('input[type=password]', ADMIN_PASSWORD);
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL('**/settings/company');
  await page.waitForSelector('text=Métodos de pago habilitados');
  await shot('10-real-admin-login');

  step('11) Crear un usuario Recepcionista/Cajero desde la pestaña Usuarios');
  await page.click('a:has-text("Usuarios")');
  await page.waitForURL('**/settings/users');
  await page.fill('input[placeholder="Correo"]', STAFF_EMAIL);
  await page.fill('input[placeholder="Contraseña inicial"]', ADMIN_PASSWORD);
  await page.selectOption('select', 'RECEPTIONIST_CASHIER');
  await page.click('button:has-text("Crear usuario")');
  await page.waitForSelector(`text=${STAFF_EMAIL}`);
  await shot('11-users-created');

  step('12) Desactivar el usuario recién creado');
  const staffRow = page.locator('tr', { hasText: STAFF_EMAIL });
  await staffRow.locator('button:has-text("Desactivar")').click();
  await staffRow.locator('text=Inactivo').waitFor();
  await shot('12-user-deactivated');

  step('13) Crear una categoría de servicio');
  await page.click('a:has-text("Servicios")');
  await page.waitForURL('**/settings/services');
  await page.fill('input[placeholder="Nueva categoría"]', 'Cortes');
  await page.click('button:has-text("+ Crear categoría")');
  await page.waitForSelector('.category-badge:has-text("Cortes")');
  await shot('13-category-created');

  step('14) Llenar el formulario de servicio y verificar la equivalencia de comisión en vivo');
  await page.fill('input[name=newServiceName]', 'Masaje relajante');
  await page.selectOption('select[name=newServiceCategory]', { label: 'Cortes' });
  await page.fill('input[name=newServiceDuration]', '60');
  await page.fill('input[name=newServiceBuffer]', '15');
  await page.fill('input[name=newServicePrice]', '90000');
  await page.fill('input[name=newServiceCommissionValue]', '20');
  await page.selectOption('select[name=newServiceResourceType]', 'ROOM');
  await page.waitForSelector('text=≈ 18.000 fijo'); // 90.000 × 20% — confirma el cálculo en vivo
  await shot('14-service-form-with-commission-equivalence');

  step('15) Crear el servicio');
  await page.click('button:has-text("+ Crear servicio")');
  await page.waitForSelector('text=Masaje relajante');
  await shot('15-service-created');

  step('16) Editar el servicio (cambiar el precio) y guardar');
  const serviceRow = page.locator('tr', { hasText: 'Masaje relajante' });
  await serviceRow.locator('button:has-text("Editar")').click();
  await page.fill('input[name=editServicePrice]', '95000');
  await page.locator('tr.service-edit-row').locator('button:has-text("Guardar")').click();
  await page.waitForSelector('text=95.000');
  await shot('16-service-edited');

  step('17) Desactivar el servicio');
  await serviceRow.locator('button:has-text("Desactivar")').click();
  await serviceRow.locator('text=Inactivo').waitFor();
  await shot('17-service-deactivated');

  step('18) Verificar que un error del backend se muestra como notificación (toast)');
  await page.fill('input[placeholder="Nueva categoría"]', 'Cortes');
  await page.click('button:has-text("+ Crear categoría")'); // "Cortes" ya existe → 409 (esperado)
  await page.waitForSelector('.toast-error:has-text("Ya existe una categoría")');
  await shot('18-error-toast-duplicate-category');

  step('19) Verificar el mensaje de validación del backend (comisión > 100)');
  await page.fill('input[name=newServiceName]', 'Servicio con comisión inválida');
  await page.fill('input[name=newServiceCommissionValue]', '150');
  await page.click('button:has-text("+ Crear servicio")'); // comisión porcentual > 100 → 400 (esperado)
  await page.waitForSelector('.toast-error:has-text("no puede ser mayor a 100")');
  await shot('19-error-toast-validation');

  // Los pasos 18/19 disparan a propósito un 409 y un 400 para probar el sistema
  // de notificaciones; Chromium los registra como "console error" aunque la app
  // los manejó correctamente (se ve el toast). Se descuentan para no confundirlos
  // con errores reales de consola.
  const expectedNetworkErrors = [
    'Failed to load resource: the server responded with a status of 409 (Conflict)',
    'Failed to load resource: the server responded with a status of 400 (Bad Request)',
  ];
  for (const expected of expectedNetworkErrors) {
    const index = consoleErrors.indexOf(expected);
    if (index !== -1) consoleErrors.splice(index, 1);
  }

  console.log('\n=== RESULTADO: OK ===');
  console.log('Errores de consola:', consoleErrors.length ? consoleErrors : 'ninguno');
  console.log('Errores de página:', pageErrors.length ? pageErrors : 'ninguno');
  console.log(
    `\nEmpresa de prueba creada: "${COMPANY_NAME}" — bórrala cuando quieras desde Prisma Studio o psql ` +
      `(al borrar la empresa, sus usuarios — el Business Admin y el staff creados en este recorrido — se borran en cascada).`,
  );

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
