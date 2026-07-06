# Módulo — Usuarios (Etapa 5)

**Roadmap:** [`docs/03_Roadmap.md`](../03_Roadmap.md) → Etapa 5.
**Backlog:** [`docs/04_Backlog.md`](../04_Backlog.md) → Épica 5.
**Reglas de negocio:** [`docs/01_Product_Requirements_Document.md`](../01_Product_Requirements_Document.md) sección de roles.

## Objetivo

Cada empresa puede tener personas reales operando el sistema con su propio correo y contraseña, en vez de depender para siempre de la impersonación del Platform Owner. El Platform Owner crea el Business Admin inicial de una empresa; desde ahí, el Business Admin crea y administra su propio staff (Supervisor, Recepcionista/Cajero).

## Alcance de esta etapa

- Backend y frontend.
- **Quién crea al primer Business Admin**: hasta esta etapa no existía ningún flujo para crear un usuario Business Admin "real" — solo la impersonación (Etapa 3) simulaba uno. Se decidió (con el usuario, ver historial de la conversación) que el **Platform Owner** lo crea desde el panel de Empresas (`POST /platform/companies/:id/admin`). La impersonación se mantiene disponible como acceso de soporte/emergencia, no como el único camino.
- **Vínculo opcional Profesional↔Usuario**: mencionado en el backlog de esta etapa, pero **no se implementa todavía** — el modelo `Professional` no existe hasta la Etapa 8 (Agenda), y la Regla de Oro del roadmap prohíbe construir sobre un módulo que aún no existe. Cuando se construya `Professional`, ese modelo llevará un `userId Int? @unique` opcional hacia `User`.
- No hay edición de correo/rol ni reseteo de contraseña todavía — solo crear y activar/desactivar. Es lo mínimo para que el ciclo de vida de un usuario de staff sea usable (ej. alguien deja el negocio); se amplía si surge la necesidad real.

## Modelo de datos

Ningún cambio de schema: el modelo `User` (Etapa 2) ya tenía todos los campos necesarios (`email`, `passwordHash`, `role`, `isActive`, `companyId`). Esta etapa solo agrega los endpoints que faltaban para crear usuarios reales desde dentro del sistema (antes solo existía el seed del Platform Owner).

## Bug encontrado y corregido en esta etapa

El login normal (`AuthService.login`/`refresh`) nunca incluía `companyId` en el JWT — solo la impersonación lo hacía (`issueImpersonationTokens`). Esto pasó inadvertido hasta ahora porque los únicos logins reales probados eran el Platform Owner (sin `companyId`, correcto) y la impersonación (con `companyId`, correcto). Al crear el primer Business Admin **real** y hacerle login normal, el `TenantGuard` lo rechazaba con 403 porque su JWT no traía `companyId` pese a que sí tenía una empresa asignada en la base de datos. Corregido en `backend/src/people/auth/auth.service.ts`: `login()` y `refresh()` ahora propagan `user.companyId` al payload del JWT, igual que ya hacía la impersonación. Detectado por la prueba e2e de esta etapa (login real de un Business Admin recién creado), no por inspección manual — otro recordatorio de por qué las pruebas e2e con Postgres real importan.

## Endpoints

| Método | Ruta | Rol requerido | Descripción |
|---|---|---|---|
| POST | `/platform/companies/:id/admin` | `PLATFORM_OWNER` | Crea el Business Admin de la empresa `:id` (correo + contraseña inicial). |
| POST | `/settings/users` | `BUSINESS_ADMIN` (+ contexto de empresa) | Crea un usuario `SUPERVISOR` o `RECEPTIONIST_CASHIER` en la propia empresa. Rechaza cualquier otro rol (400). |
| GET | `/settings/users` | `BUSINESS_ADMIN` | Lista los usuarios `SUPERVISOR`/`RECEPTIONIST_CASHIER` de la propia empresa (nunca expone `passwordHash`). |
| PATCH | `/settings/users/:id/status` | `BUSINESS_ADMIN` | Activa/desactiva un usuario de la propia empresa. Un usuario desactivado no puede volver a iniciar sesión. |

## Decisiones técnicas y por qué

- **El Business Admin no puede crear otro Business Admin ni un Platform Owner** desde `/settings/users` — el DTO (`CreateCompanyUserDto`) valida el rol contra una lista cerrada (`@IsIn([SUPERVISOR, RECEPTIONIST_CASHIER])`). Evita que alguien se autoescale de rol o cree cuentas fuera del alcance de lo que el backlog pide.
- **La lista de usuarios (`GET /settings/users`) solo muestra Supervisor/Recepcionista-Cajero**, nunca al propio Business Admin — así se evita el riesgo de que alguien se desactive a sí mismo por accidente desde esta pantalla, y se mantiene el alcance fiel al backlog ("Business Admin gestiona Supervisor/Recepcionista-Cajero").
- **Aislamiento multi-tenant igual al de sucursales**: `findFirst({ where: { id, companyId, role: { in: [...] } } })` antes de cualquier lectura o modificación — un Business Admin nunca puede tocar usuarios de otra empresa (probado en e2e).
- **Contraseñas**: hash con `bcrypt` (factor 12, igual que el seed), mínimo 8 caracteres (`class-validator`). Sin política de complejidad adicional por ahora — consistente con que el PRD no exige más que "correo + contraseña".
- **Conflictos de correo duplicado**: se detectan por el error de Prisma `P2002` (constraint único de `email`) y se traducen a `409 Conflict` con mensaje en español, en vez de dejar pasar el error crudo de la base de datos.

## Permisos

| Endpoint | Platform Owner (sin impersonar) | Business Admin (propia empresa) | Business Admin (otra empresa) | Supervisor / Recepcionista / Profesional |
|---|---|---|---|---|
| `POST .../admin` | ✅ | 403 | 403 | 403 |
| `POST /settings/users` | 403 | ✅ | — | 403 |
| `GET /settings/users` | 403 | ✅ | 404 en recursos de la otra empresa | 403 |
| `PATCH .../status` | 403 | ✅ | 404 | 403 |

## Frontend

- `core/models/users.model.ts`: tipo `CompanyUser`, lista de roles asignables (`ASSIGNABLE_ROLE_OPTIONS`) y sus etiquetas en español (`ROLE_LABELS`).
- `core/services/users.service.ts`: `list()`, `create()`, `setActive()` contra `/settings/users`.
- `core/services/platform.service.ts`: nuevo `createBusinessAdmin(companyId, email, password)`.
- `features/settings/users/`: pantalla nueva (tercera pestaña de Configuración: Empresa / Sucursales / Usuarios) — formulario de creación (correo, contraseña, rol) + tabla con activar/desactivar. Reutiliza el banner de impersonación del `AppShellComponent`.
- `features/platform/companies/`: cada fila de empresa gana un botón "+ Admin" que despliega un formulario inline (correo + contraseña) para crear el Business Admin de esa empresa, sin salir de la pantalla ni recurrir a `window.prompt`.

## Pruebas

- **Unitarias** (`users.service.spec.ts`): creación de Business Admin y de usuario de empresa, traducción de `P2002`→`ConflictException` y `P2003`→`NotFoundException`, filtro de roles manejables en el listado, aislamiento por `companyId` en `setActive`.
- **E2E** (`test/users.e2e-spec.ts`, contra PostgreSQL real): Platform Owner crea un Business Admin que **se loguea de verdad** con sus propias credenciales; rechazo de correo duplicado (409); rechazo de creación de admin por un rol no autorizado (403); Business Admin crea Recepcionista/Cajero; rechazo de rol no asignable (400); aislamiento entre empresas en el listado y en desactivación (404); un usuario desactivado no puede volver a iniciar sesión (401).
- **Manual (navegador, Playwright vía `tools/browser-check`)**: Platform Owner crea el Business Admin de una empresa desde el panel → pestaña Usuarios crea un Recepcionista/Cajero → se desactiva y se verifica el cambio de estado en la tabla.

## Nota de proceso — regresión

Al terminar esta etapa se revalidó Login, Platform Owner (Etapa 3) y Configuración/Sucursales (Etapa 4) corriendo la suite completa de e2e (`--runInBand`, ver nota de flakiness en paralelo más abajo) y el recorrido de Playwright de punta a punta — sin regresiones.

**Nota aparte (infraestructura de pruebas, no de producto):** al correr las 5 suites e2e en paralelo (workers concurrentes de Jest contra el mismo Postgres) aparecieron fallos intermitentes (500) no relacionados con la lógica de negocio — se resuelven ejecutando `npx jest --config ./test/jest-e2e.json --runInBand`. Es una característica pre-existente del entorno de pruebas (contención de conexiones concurrentes a un único Postgres de desarrollo), no algo introducido en esta etapa; queda anotado por si en una etapa futura se configura CI y conviene forzar `--runInBand` ahí también.
