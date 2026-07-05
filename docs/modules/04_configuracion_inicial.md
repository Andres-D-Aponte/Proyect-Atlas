# Módulo — Configuración inicial del negocio (Etapa 4)

**Roadmap:** [`docs/03_Roadmap.md`](../03_Roadmap.md) → Etapa 4.
**Backlog:** [`docs/04_Backlog.md`](../04_Backlog.md) → Épica 4.
**Reglas de negocio:** [`docs/01_Product_Requirements_Document.md`](../01_Product_Requirements_Document.md) secciones 4.4 y 4.6.
**Arquitectura:** [`docs/02_Architecture.md`](../02_Architecture.md) sección 5 (multi-tenancy).

## Objetivo

Cada empresa configura su identidad (logo, colores), zona horaria/moneda/idioma, métodos de pago habilitados y sus sucursales (con horario semanal). Es la primera etapa que expone datos **propios de cada empresa** — la primera vez que el aislamiento multi-tenant importa de verdad.

## Alcance de esta etapa

- Backend **y** frontend (primera etapa con UI real — ver sección Frontend abajo).
- `Company` (creada en Etapa 3 solo con `name`) se extiende con branding/configuración; `Branch` es enteramente nuevo.
- No se implementa todavía la creación de usuarios Business Admin "reales" (eso es la Etapa 5). El acceso a los endpoints de esta etapa se logra hoy mediante la impersonación del Platform Owner (Etapa 3), que ya emite un token con `role: BUSINESS_ADMIN` + `companyId`.
- Horarios de sucursal modelados como JSON simple (lista de `{dayOfWeek, opensAt, closesAt}`), no como tabla propia — no aporta valor normalizarlo más en esta etapa.

## Modelo de datos

- `Company` gana: `logoUrl`, `primaryColor`, `timezone` (default `America/Bogota`), `currency` (default `COP`), `language` (default `es`), `enabledPaymentMethods` (default `[CASH, TRANSFER]`).
- `Branch`: `companyId`, `name`, `address?`, `timezone?` (nulo = usa el de la empresa), `openingHours?` (JSON), `isActive`.

## Endpoints (todos requieren rol `BUSINESS_ADMIN` + contexto de empresa)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/settings/company` | Configuración de la propia empresa. |
| PATCH | `/settings/company` | Actualiza branding/zona horaria/moneda/idioma/métodos de pago. |
| POST | `/settings/branches` | Crea una sucursal. |
| GET | `/settings/branches` | Lista las sucursales de la propia empresa. |
| GET | `/settings/branches/:id` | Detalle (404 si es de otra empresa). |
| POST | `/settings/branches/:id/schedule` | Reemplaza el horario semanal completo. |

## Decisiones técnicas y por qué

- **`TenantGuard` (nuevo, `shared/tenancy/`)**: primer guard de aislamiento por empresa. Exige que el JWT tenga `companyId` (presente para Business Admin real o impersonado; ausente para Platform Owner sin impersonar), si no, 403. Se combina con `JwtAuthGuard` + `RolesGuard(BUSINESS_ADMIN)`.
- **Aislamiento manual explícito, no automático todavía**: cada consulta que toca un recurso de sucursal filtra por `id` **y** `companyId` a la vez (`findFirst({ where: { id, companyId } })`), nunca por `id` solo. El middleware de Prisma que inyecte `companyId` automáticamente en todas las consultas (mencionado en el ADR-002 de arquitectura) sigue sin construirse — se decidió honestamente no adelantarlo hasta que haya más de dos modelos tenant-scoped, para no introducir una capa de "magia" antes de tener suficientes casos reales que la justifiquen. Mientras tanto, esta disciplina manual (probada por tests de aislamiento cruzado en el e2e) es la barrera real.
- **Frontend retroactivo a la Etapa 3**: hasta ahora no existía ninguna pantalla en Angular. Como esta etapa sí necesita ser usable por un humano en el navegador, se construyó también un panel mínimo del Platform Owner (lista de empresas + botón "Entrar como Business Admin") que faltaba desde la Etapa 3, además del login real. Sin esto, no había forma de llegar a una pantalla protegida por `BUSINESS_ADMIN` desde el navegador.
- **Sin refresco de sesión "silencioso" perfecto**: el interceptor HTTP intenta un único refresh automático ante un 401 y reintenta la petición original; si ese refresh también falla, cierra la sesión. No hay temporizador proactivo que refresque antes de expirar — aceptable para el MVP, revisar si se vuelve una molestia real de UX.

## Permisos

Todos los endpoints exigen `@Roles(Role.BUSINESS_ADMIN)` + `TenantGuard`. Un Platform Owner sin impersonar recibe 403 (rol correcto para otros endpoints, pero no tiene `companyId`); cualquier otro rol también recibe 403.

## Frontend

- `core/services/auth.service.ts`: estado de sesión (signals), login/refresh/logout, persistencia en `localStorage`.
- `core/interceptors/auth.interceptor.ts`: adjunta el `Bearer token`; ante un 401 intenta un refresh y reintenta una vez.
- `core/guards/auth.guard.ts` + `core/guards/role.guard.ts`: protegen rutas por autenticación y por rol.
- `features/auth/login/`: pantalla de login.
- `features/platform/companies/`: panel del Platform Owner (crear empresa, listar, impersonar).
- `features/settings/company/` y `features/settings/branches/`: configuración de empresa y sucursales (con editor de horario semanal).

## Pruebas

- **Unitarias** (backend): `CompanySettingsService`, `BranchesService` (incluye aislamiento entre empresas), `TenantGuard`.
- **E2E** (`test/settings.e2e-spec.ts`, contra PostgreSQL real): valores por defecto de una empresa nueva, actualización de configuración, validación de color inválido, 403 para Platform Owner sin impersonar y para Profesional, CRUD de sucursales, horario, **aislamiento real entre dos empresas** (la Empresa B no puede leer una sucursal de la Empresa A), validación de horario con formato inválido.
- **Manual (navegador, automatizado con Playwright)**: flujo completo de punta a punta — login → panel de empresas → crear empresa → impersonar → configuración de empresa (verificando defaults COP/es/efectivo+transferencia) → guardar cambios → sucursales → crear sucursal → editar horario → guardar. Cero errores de consola. Capturas de pantalla verificadas visualmente en cada paso.
