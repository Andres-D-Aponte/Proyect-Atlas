# Módulo — Platform Owner (Etapa 3)

**Roadmap:** [`docs/03_Roadmap.md`](../03_Roadmap.md) → Etapa 3.
**Backlog:** [`docs/04_Backlog.md`](../04_Backlog.md) → Épica 3.
**Reglas de negocio:** [`docs/01_Product_Requirements_Document.md`](../01_Product_Requirements_Document.md) secciones 2 y 4.7.
**Arquitectura:** [`docs/02_Architecture.md`](../02_Architecture.md) sección 5 (multi-tenancy) y 8 (auth).

## Objetivo

El Platform Owner puede crear planes, crear empresas, asignarles una licencia, y entrar temporalmente como Business Admin de cualquier empresa (impersonación auditada), sin necesitar sus credenciales.

## Alcance de esta etapa

- Backend únicamente, mismo criterio que la Etapa 2: no hay panel del Platform Owner en Angular todavía.
- `Company` solo tiene identidad mínima (`name`, `isActive`). Branding, horarios y métodos de pago son la Etapa 4 (Configuración inicial del negocio) a propósito.
- **No se implementa todavía** la verificación real de límites de plan ni el bloqueo por licencia vencida: no existen aún los módulos que esos límites/bloqueos afectarían (sucursales y usuarios son Etapa 4/5, citas son Etapa 8). Por ahora solo se modela y almacena la configuración; la aplicación real de estas reglas llega incrementalmente cuando cada módulo dependiente exista.
- El sistema de auditoría genérico (`shared/audit`, para todos los módulos futuros) sigue sin construirse. Se creó `ImpersonationLog`, acotado únicamente a este caso de uso, porque es una regla de negocio ya aprobada y obligatoria — no una anticipación del sistema genérico.

## Modelo de datos

- `Plan`: `name`, `enabledModules` (array de claves de módulo), límites nullable (`maxBranches`, `maxProfessionals`, `maxUsers`, `maxAppointmentsPerMonth`, `maxWhatsappConversations` — nulo = sin límite).
- `Company`: `name`, `isActive`.
- `License`: 1:1 con `Company` (`companyId` único), referencia a `Plan`, `billingCycle` (enum: `MONTHLY`/`QUARTERLY`/`SEMIANNUAL`/`ANNUAL`/`TRIAL`), `startDate`, `endDate`, `expirationBehavior` (enum: `IMMEDIATE_READ_ONLY` por defecto, `GRACE_PERIOD`, `TEMPORARY_ACCESS`, `FULL_BLOCK`).
- `User.companyId`: ahora existe, nullable (nulo para el Platform Owner).
- `ImpersonationLog`: registro de solo-inserción — `platformOwnerId`, `companyId`, `reason`, `ipAddress`, `startedAt`.

## Endpoints (todos requieren rol `PLATFORM_OWNER`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/platform/plans` | Crea un plan. |
| GET | `/platform/plans` | Lista los planes. |
| POST | `/platform/companies` | Crea una empresa. |
| GET | `/platform/companies` | Lista empresas (con su licencia y plan). |
| GET | `/platform/companies/:id` | Detalle de una empresa. |
| POST | `/platform/companies/:id/license` | Crea o reemplaza la licencia de la empresa (relación 1:1). |
| GET | `/platform/companies/:id/license` | Consulta la licencia vigente. |
| POST | `/platform/companies/:id/impersonate` | Registra el motivo en auditoría y devuelve un par de tokens actuando como Business Admin de esa empresa. |

## Decisiones técnicas y por qué

- **Cómo funciona la impersonación:** el `sub` del JWT sigue siendo el propio Platform Owner (nunca se suplantan credenciales de otro usuario real) — lo que cambia es el `role` efectivo (`BUSINESS_ADMIN`) y se añade un `companyId` de contexto y un `impersonatedBy` (igual al `sub`, para que quede explícito en el propio token que es una sesión de impersonación). `GET /auth/me` refleja estos campos tal cual, por transparencia.
- **Orden de operaciones en la impersonación:** primero se inserta el `ImpersonationLog` (auditoría), y **solo si esa inserción tiene éxito** se emiten los tokens. Si la empresa no existe, la llave foránea de `companyId` hace fallar la inserción antes de emitir ningún token — nunca se puede impersonar sin dejar rastro.
- **Validación de existencia vía llaves foráneas, no vía consultas previas:** tanto `LicensesService.assign` como `ImpersonationService.impersonate` dejan que la restricción de llave foránea de PostgreSQL falle (código `P2003` de Prisma) y traducen ese error a un `404 NotFoundException` con un mensaje claro, en vez de hacer una consulta de existencia por separado. Esto evita acoplar el módulo de Licencias a los módulos de Empresas y Planes (y el de Impersonación al de Empresas), en un solo viaje a la base de datos.
- **Licencia como relación 1:1, no un historial:** una empresa tiene, como mucho, una licencia vigente a la vez. No hay historial de licencias pasadas — no hace falta para el MVP (ver Project Charter: nada de contabilidad completa). `POST .../license` crea o reemplaza (upsert) la licencia existente.

## Permisos

Todos los endpoints de este módulo exigen `@Roles(Role.PLATFORM_OWNER)` sobre `JwtAuthGuard` + `RolesGuard`. Un usuario con cualquier otro rol recibe 403; sin token, 401.

## Pruebas

- **Unitarias:** `PlansService`, `CompaniesService`, `LicensesService` (incluye ambos casos de llave foránea fallida), `ImpersonationService` (auditoría + emisión de tokens, y rechazo si la empresa no existe), y `AuthService.issueImpersonationTokens` (payload correcto, rechazo si el actor no es Platform Owner).
- **E2E** (`test/platform.e2e-spec.ts`, contra PostgreSQL real): 403 para un rol no autorizado, 401 sin token, flujo completo (crear plan → crear empresa → asignar licencia → impersonar → `GET /auth/me` con el token de impersonación → verificar el registro de auditoría en la base de datos), validación de motivo vacío (400), impersonar una empresa inexistente (404).
- **Manual:** flujo completo probado con `curl` contra el stack dockerizado real, incluyendo verificación del registro de auditoría directamente en PostgreSQL vía `psql`.
