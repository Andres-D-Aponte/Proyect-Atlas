# Módulo — Autenticación (Etapa 2)

**Roadmap:** [`docs/03_Roadmap.md`](../03_Roadmap.md) → Etapa 2.
**Backlog:** [`docs/04_Backlog.md`](../04_Backlog.md) → Épica 2.
**Reglas de negocio:** [`docs/01_Product_Requirements_Document.md`](../01_Product_Requirements_Document.md) secciones 1 y 5.
**Arquitectura:** [`docs/02_Architecture.md`](../02_Architecture.md) sección 8.

## Objetivo

Login con correo y contraseña, emisión de JWT de acceso + refresh token rotable, y control de acceso por rol (RBAC), como base para todo lo que viene después.

## Alcance de esta etapa

- Backend únicamente. No hay pantalla de login en Angular todavía: no existe ninguna vista protegida real hasta la Etapa 3 (panel del Platform Owner), así que el `core/` de Angular (interceptor HTTP + guard de ruta) se construye cuando haya algo real que proteger.
- No hay endpoint público de registro. El primer usuario (Platform Owner) se crea con un seed (`npm run db:seed`). La creación de usuarios por un Business Admin es la Épica 5 (Etapa 5), no esta.
- `User` todavía no tiene `companyId`: `Company` no existe hasta la Etapa 3. Se añadirá como columna nullable en esa etapa, sin romper este modelo (el Platform Owner nunca pertenece a una empresa).

## Modelo de datos

- `Role` (enum): `PLATFORM_OWNER`, `BUSINESS_ADMIN`, `SUPERVISOR`, `RECEPTIONIST_CASHIER`, `PROFESSIONAL`.
- `User`: `id`, `email` (único), `passwordHash`, `role`, `isActive`, timestamps.
- `RefreshToken`: `id`, `tokenHash` (único, hash SHA-256 del token opaco — nunca se guarda el token en claro), `userId`, `expiresAt`, `revokedAt`, `createdAt`.

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Ninguna | Recibe `email` + `password`. Devuelve `{ accessToken, refreshToken }` o 401. |
| POST | `/auth/refresh` | Ninguna (el refresh token es la credencial) | Recibe `refreshToken`. Lo revoca y devuelve un par nuevo (rotación). 401 si es inválido, expiró o ya fue usado. |
| POST | `/auth/logout` | Ninguna | Revoca el refresh token presentado. 204. |
| GET | `/auth/me` | JWT (cualquier rol) | Devuelve `{ id, email, role }` del usuario autenticado. |

## Decisiones técnicas y por qué

- **`bcryptjs` en vez de `bcrypt`**: `bcrypt` es un addon nativo que requiere binarios compilados por plataforma; en la Etapa 1 ya tuvimos un problema similar con Prisma (cliente generado en Windows fallando en Linux dentro de Docker). `bcryptjs` es una implementación pura en JavaScript, sin ese riesgo.
- **Refresh token opaco (no JWT), con solo su hash SHA-256 persistido**: permite revocar y rotar de verdad. Un JWT de refresh autofirmado no se puede invalidar sin mantener una lista de revocación de todas formas, así que el token opaco + hash en base de datos es más simple y igual de seguro.
- **Rotación con revocación en cada uso**: al llamar a `/auth/refresh`, el token presentado se marca `revokedAt` de inmediato. Si se presenta de nuevo (por ejemplo, un token robado), se rechaza con 401. No implementamos detección de "familia" de tokens (revocar toda la cadena si se detecta reuso) — queda como posible endurecimiento futuro, no es necesario para el MVP.
- **`GET /auth/me` y `POST /auth/logout`** no estaban en las historias de usuario originales de la Épica 2, pero son un complemento casi gratuito de la infraestructura de tokens ya construida (todo sistema de sesiones necesita "quién soy" y "cerrar sesión"). Se documentan aquí explícitamente por transparencia.
- **RBAC demostrado con un controlador de solo pruebas**: `RolesGuard` y `@Roles()` son infraestructura reutilizable por toda la aplicación futura. Para probar el caso "un Profesional no puede acceder a un endpoint de Business Admin" sin inventar un endpoint de negocio que no toca todavía a esta etapa, la prueba e2e registra un controlador descartable (`BusinessAdminOnlyTestController`) que vive únicamente dentro de `test/auth.e2e-spec.ts`, no en `src/`.

## Permisos

`JwtAuthGuard` exige un JWT de acceso válido. `RolesGuard` (combinado con `@Roles(...)`) exige además que el rol del usuario esté en la lista permitida; sin `@Roles()` en el endpoint, cualquier usuario autenticado pasa. Ambos guards son globales (`AuthModule` es `@Global()`) para que cualquier dominio futuro los use sin volver a registrarlos.

## Pruebas

- **Unitarias** (`src/people/auth/*.spec.ts`): `AuthService` (login válido/inválido/inactivo, refresh, logout), `RefreshTokenService` (emisión, consumo, rechazo de expirado/revocado/inexistente), `RolesGuard` (permitir/denegar por rol, sin usuario).
- **E2E** (`test/auth.e2e-spec.ts`, contra PostgreSQL real): login inválido/válido, `GET /auth/me`, rotación + rechazo de reutilización del refresh token, 403 real de `RolesGuard` para un rol no autorizado, 401 sin token.
- **Manual**: stack completo levantado con `docker compose up -d`, seed ejecutado, login/`/auth/me` probados con `curl` contra el backend real.

## Seed

`npm run db:seed` (o `docker compose exec backend npm run db:seed`) crea el primer Platform Owner usando `SEED_PLATFORM_OWNER_EMAIL` / `SEED_PLATFORM_OWNER_PASSWORD` del `.env`. Es idempotente: si el correo ya existe, no hace nada.
