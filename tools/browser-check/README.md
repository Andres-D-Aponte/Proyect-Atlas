# Atlas — Browser Check

Herramienta de verificación manual: recorre la aplicación Atlas en un navegador real (headless, vía Playwright) y reporta cualquier error de consola o de página. No es parte de la aplicación ni de la suite de pruebas automatizadas (`backend/test`, `frontend/*.spec.ts`) — es un complemento para *ver* que un cambio de frontend funciona de verdad, con capturas de pantalla.

Ver también: [`.claude/skills/atlas-browser-check/SKILL.md`](../../.claude/skills/atlas-browser-check/SKILL.md).

## Uso

Con el stack de Atlas levantado (`docker compose up -d --build` desde la raíz del proyecto):

```bash
cd tools/browser-check
npm install        # solo la primera vez
npx playwright install chromium   # solo la primera vez
npm run check
```

Las capturas quedan en `tools/browser-check/screenshots/` (no se versionan). El script termina con código de salida distinto de 0 si detecta errores de consola/página o si el recorrido falla en algún paso.

## Qué recorre

1. Login (verifica también el switch de modo claro/oscuro).
2. Panel del Platform Owner: crear empresa.
3. Impersonar la empresa creada.
4. Configuración de empresa: guardar cambios.
5. Sucursales: crear una y asignarle un horario.

Cada corrida crea una empresa nueva con el nombre `Browser Check <timestamp>` para no chocar con datos reales — bórrala cuando quieras desde Prisma Studio o `psql` si se acumulan.

## Extenderlo

A medida que se agreguen etapas nuevas con UI (Etapa 5 en adelante), añade los pasos correspondientes al final de `check.mjs`, siguiendo el mismo patrón: `step(...)` para anunciar, interactuar, `waitForSelector`/`waitForURL` para esperar el resultado, `shot(...)` para capturar.
