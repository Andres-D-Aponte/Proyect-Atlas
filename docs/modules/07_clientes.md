# Módulo — Clientes (Etapa 7)

**Roadmap:** [`docs/03_Roadmap.md`](../03_Roadmap.md) → Etapa 7.
**Backlog:** [`docs/04_Backlog.md`](../04_Backlog.md) → Épica 7.
**Reglas de negocio:** [`docs/01_Product_Requirements_Document.md`](../01_Product_Requirements_Document.md) sección 3 (modelo de dominio) y 4.6 (Configuración → Clientes).

## Objetivo

Cada empresa arma su propia base de clientes: alta rápida con nombre y teléfono como mínimo, más correo/documento/dirección si la empresa los exige; y una línea de tiempo por cliente que registra automáticamente su historial.

## Alcance de esta etapa

- Backend y frontend. **Primer módulo operativo (no de configuración) accesible a Supervisor y Recepcionista/Cajero**, no solo a Business Admin — es también la primera vez que un usuario con esos roles tiene una pantalla propia a la que llegar tras el login (antes de esta etapa, solo existían pantallas de configuración restringidas a `BUSINESS_ADMIN`).
- **Línea de tiempo, alcance real vs. futuro**: hoy solo registra altas (`CREATED`) y ediciones (`UPDATED`, con el detalle de qué campos cambiaron). Los eventos que pide el backlog (servicios recibidos, profesionales, productos, cancelaciones, inasistencias) los añadirán las Etapas 8 (Agenda) y 10 (Ventas) insertando en la misma tabla `client_timeline_events` — no se modelan todavía porque esas entidades no existen (Regla de Oro del roadmap).
- **Campos obligatorios configurables**: `Company.requireClientEmail/Document/Address` (Etapa 4/6 ya tenían este patrón de configuración por empresa) controlan qué exige el formulario de alta. Se valida en el servicio (`ClientsService.assertRequiredFields`), no con `class-validator` en el DTO, porque depende de una fila de otra tabla, no de la forma del propio payload.
- **Solo se valida al crear, no al editar**: si más adelante la empresa activa "exigir correo" y edita un cliente antiguo sin correo, la edición no se bloquea — evita quedar atascado editando un registro histórico por una regla que no existía cuando se creó.
- **`allowBookingWithoutClient`** se guarda desde ya (mismo grupo de configuración "Clientes" en el PRD) aunque todavía no lo hace cumplir nadie — lo hará la Agenda en la Etapa 8, que es la primera que sabe qué es "reservar sin cliente".
- Sin borrado de clientes (no tiene sentido perder el historial de un negocio real); solo alta y edición.

## Modelo de datos

- `Company` gana: `requireClientEmail`, `requireClientDocument`, `requireClientAddress` (default `false`), `allowBookingWithoutClient` (default `true`).
- `Client`: `companyId`, `name`, `phone` (únicos realmente obligatorios), `email?`, `document?`, `address?`, `notes?`.
- `ClientTimelineEvent`: `clientId`, `type` (`CREATED` | `UPDATED`), `description` (texto ya armado en español, ej. "Datos actualizados: correo, dirección."), `createdAt`.

## Endpoints (requieren rol `BUSINESS_ADMIN`, `SUPERVISOR` o `RECEPTIONIST_CASHIER` + contexto de empresa)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/clients` | Crea un cliente. 400 si falta un campo que la empresa marcó obligatorio. |
| GET | `/clients?search=` | Lista los clientes de la propia empresa; `search` filtra por nombre/teléfono/correo (contains, sin distinguir mayúsculas). |
| GET | `/clients/:id` | Detalle (404 si es de otra empresa). |
| PATCH | `/clients/:id` | Actualiza cualquier campo; registra en la línea de tiempo solo los campos que de verdad cambiaron. |
| GET | `/clients/:id/timeline` | Lista de eventos, del más reciente al más antiguo. |

## Decisiones técnicas y por qué

- **Alta y su evento de línea de tiempo en una sola transacción** (`prisma.$transaction`): si el registro del evento fallara, no queremos un cliente "mudo" sin ningún rastro de cómo llegó a existir. Mismo criterio para editar.
- **`update` compara valor por valor antes de escribir nada**: si el PATCH no cambia nada de verdad (ej. reenviar el mismo nombre), no se genera un evento vacío en la línea de tiempo ni se toca `updatedAt` sin necesidad.
- **Primer módulo con roles de staff reales**: obligó a resolver un hueco que existía desde la Etapa 5 — un Supervisor o Recepcionista podía tener una cuenta funcional pero no tenía a dónde ir después de iniciar sesión (el login siempre mandaba a `/settings/company`, restringido a `BUSINESS_ADMIN`, así que rebotaban). Ahora el login decide el destino según el rol: Platform Owner → panel de empresas, Business Admin → configuración de empresa, cualquier otro rol de la empresa (Supervisor, Recepcionista/Cajero) → `/clients`.

## Permisos

| Endpoint | Business Admin | Supervisor | Recepcionista/Cajero | Platform Owner (sin impersonar) | Profesional |
|---|---|---|---|---|---|
| Todos los de `/clients` | ✅ | ✅ | ✅ | 403 | 403 |

Aislamiento entre empresas igual que en el resto de módulos: `findFirst({ where: { id, companyId } })`, nunca por `id` solo.

## Frontend

- `core/models/clients.model.ts` / `core/services/clients.service.ts`: tipos y llamadas HTTP, con `ClientDraft` como forma común para crear y editar (mismo patrón que `ServiceDraft` en Etapa 6).
- `features/clients/`: pantalla nueva, **no vive bajo `settings/`** porque la usan roles que no tienen acceso a Configuración. Formulario de alta + buscador + tabla con edición inline y una fila expandible de "Ver historial" (línea de tiempo).
- `features/settings/company/`: nuevo grupo "Clientes" en el formulario (4 checkboxes) para las banderas de configuración.
- Las 4 pantallas de Configuración ganan un enlace "Clientes" en su barra de pestañas, para que un Business Admin pueda llegar ahí sin cambiar la URL a mano.

## Pruebas

- **Unitarias** (`clients.service.spec.ts`): alta con/sin campos obligatorios según configuración, aislamiento por `companyId`, búsqueda, actualización con detección de campos realmente cambiados (incluyendo el caso "no cambió nada").
- **E2E** (`test/clients.e2e-spec.ts`, contra PostgreSQL real): un Recepcionista **real** (no impersonado) crea un cliente; Platform Owner sin impersonar y Profesional reciben 403; correo obligatorio según configuración de la empresa (400 sin correo, 201 con correo); búsqueda por nombre; aislamiento entre dos empresas en lectura/edición (404); la línea de tiempo refleja alta + edición en orden correcto.
- **Manual (navegador, Playwright)**: login como Recepcionista real (aterriza en `/clients`), crear cliente, buscarlo, editarlo, ver su historial reflejando ambos eventos.
