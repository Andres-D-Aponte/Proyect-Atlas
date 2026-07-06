---
name: atlas-browser-check
description: Levanta el stack de Atlas (Docker Compose) y recorre el frontend real en un navegador headless (Playwright) para verificar visualmente que un cambio funciona — login, panel del Platform Owner, configuración de empresa, sucursales, y el switch de modo claro/oscuro — capturando screenshots y reportando errores de consola/página.
---

# Atlas — Browser Check

Usa esta skill (en vez de reinventar un driver de navegador) cada vez que necesites **ver** que un cambio de frontend de Atlas funciona de verdad, no solo que compila o pasa sus pruebas unitarias/e2e. Es el equivalente, para este proyecto, de "abrir el navegador y hacer clic" — pero automatizado y reproducible.

## Cuándo usarla

- Después de terminar el frontend de una etapa nueva (ver `docs/03_Roadmap.md` y `docs/05_Practical_Guide.md`), antes de darla por completa/comitear.
- Cuando cambies algo de UI transversal (como el switch de modo claro/oscuro) y quieras confirmar que no rompiste nada en las pantallas existentes.
- Cuando el usuario pida "pruébalo en el navegador" o equivalente.

## Prerrequisitos

1. El stack completo debe estar arriba: `docker compose up -d --build` desde la raíz del repo, con la base de datos migrada y el seed corrido (ver `docs/05_Practical_Guide.md`, sección "Fundamentos").
2. Playwright y su navegador Chromium deben estar instalados **una sola vez** en `tools/browser-check/`:
   ```bash
   cd tools/browser-check
   npm install
   npx playwright install chromium
   ```
   (Si ya se instalaron antes en esta máquina, se puede saltar este paso — `npm install` es rápido si `node_modules` ya existe).

## Cómo correrla

```bash
cd tools/browser-check
npm run check
```

Variables de entorno opcionales (todas tienen default para el entorno de desarrollo estándar):

- `ATLAS_BASE_URL` (default `http://localhost:4200`)
- `ATLAS_OWNER_EMAIL` / `ATLAS_OWNER_PASSWORD` (default las credenciales del seed, `owner@atlas.dev` / `ChangeMe123!`)

## Qué produce

- Consola: un paso por línea (`1) Login`, `2) Alternar a modo oscuro...`, etc.), y al final:
  - `=== RESULTADO: OK ===` + lista de errores de consola/página (debería decir "ninguno").
  - O `=== RESULTADO: FALLÓ EL RECORRIDO ===` con el error y una captura `ERROR-state.png` del momento del fallo.
- Capturas de pantalla en `tools/browser-check/screenshots/` (no versionadas), una por paso — ábrelas y revísalas, no te bases solo en que "no hubo errores".
- Código de salida: `0` si todo pasó sin errores de consola/página, `1` en cualquier otro caso (útil para usarlo en un pipeline más adelante, aunque hoy se corre a mano).

## Cómo extenderla

Cada etapa nueva del roadmap que agregue pantallas (Etapa 5 en adelante) debería sumar sus propios pasos al final de `tools/browser-check/check.mjs`, seleccionando: `step(...)` para anunciar → interactuar (`click`/`fill`/`selectOption`) → esperar el resultado (`waitForSelector`/`waitForURL`) → `shot(...)`. No hace falta un framework nuevo — es un script lineal, se edita directamente.

## Gotchas conocidos

- `window.prompt()` (usado para pedir el motivo de impersonación) se auto-acepta vía el listener `page.on('dialog', ...)` ya configurado en el script — si agregas un flujo nuevo con otro `prompt`/`confirm`, no hace falta tocar nada, ya está cubierto globalmente.
- Cada corrida crea una empresa nueva (`Browser Check <timestamp ISO>`) para no chocar con datos reales entre corridas — se acumulan en la base de datos de desarrollo; bórralas de vez en cuando desde Prisma Studio o `psql` si molestan (no afecta la corrida, solo prolijidad).
- Si el stack no está arriba o la migración/seed no corrieron, el primer `waitForURL('**/login')` cuelga hasta el timeout de Playwright (30s) y el script falla con un mensaje de timeout — no es un bug del script, es que falta el prerrequisito.
