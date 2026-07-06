# Módulo — Servicios (Etapa 6)

**Roadmap:** [`docs/03_Roadmap.md`](../03_Roadmap.md) → Etapa 6.
**Backlog:** [`docs/04_Backlog.md`](../04_Backlog.md) → Épica 6.
**Reglas de negocio:** [`docs/01_Product_Requirements_Document.md`](../01_Product_Requirements_Document.md) sección 3 (modelo de dominio) y 4.2 (Agenda, tiempo entre citas).

## Objetivo

Cada empresa arma su propio catálogo de servicios: categorías propias (nunca globales), y servicios con duración, tiempo de preparación (buffer), precio, comisión (porcentaje o valor fijo, con equivalencia mostrada en vivo) y si requieren dos profesionales o un tipo de recurso físico.

## Alcance de esta etapa

- Backend y frontend.
- **`Resource` (inventario concreto de salas/sillas/cabinas) se difiere a la Etapa 8 (Agenda)**: es la primera etapa que realmente necesita reservar un recurso concreto contra un horario. Por ahora, `Service.resourceType` solo declara **qué tipo** de recurso exige (o ninguno) — un enum, no una relación a un inventario. Es la misma lógica de diferimiento ya usada con `Professional` en la Etapa 5 (Regla de Oro: sin dependencias hacia adelante).
- `price` y `commissionValue` se modelan como `Float`, no `Decimal`: Atlas no es un libro contable de precisión bancaria en el MVP (ver Project Charter), y `Decimal` en Prisma se serializa como string en JSON — complejidad real para el frontend sin beneficio real en esta etapa.
- Sin eliminar servicios (hard delete): se desactivan (`isActive`), igual que `Branch`/`User`, porque etapas futuras (Ventas, Comisiones, Reportes) necesitarán referenciar servicios históricos. Las categorías sí se pueden borrar de verdad (no hay nada más que las referencie de forma crítica; los servicios que las usaban simplemente quedan sin categoría).

## Modelo de datos

- `ServiceCategory`: `companyId`, `name`. Único por `(companyId, name)` — dos empresas pueden compartir nombre, la misma empresa no puede repetirlo.
- `Service`: `companyId`, `categoryId?` (nulo si no tiene categoría o si se borró la que tenía — `onDelete: SetNull`), `name`, `description?`, `durationMinutes`, `bufferMinutes` (default 0), `price`, `commissionType` (`PERCENTAGE` | `FIXED`, default `PERCENTAGE`), `commissionValue` (default 0), `requiresTwoProfessionals` (default `false`), `resourceType?` (`ROOM` | `CHAIR` | `CABIN` | `MACHINE` | `STRETCHER`, nulo = no requiere ninguno), `isActive` (default `true`).

## Endpoints (todos requieren rol `BUSINESS_ADMIN` + contexto de empresa)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/catalog/categories` | Crea una categoría. 409 si el nombre ya existe en la empresa. |
| GET | `/catalog/categories` | Lista las categorías de la propia empresa. |
| PATCH | `/catalog/categories/:id` | Renombra una categoría. |
| DELETE | `/catalog/categories/:id` | Borra la categoría; los servicios que la usaban quedan sin categoría. |
| POST | `/catalog/services` | Crea un servicio. Si envía `categoryId`, valida que sea de la propia empresa (404 si no). |
| GET | `/catalog/services` | Lista los servicios de la propia empresa (incluye su categoría). |
| GET | `/catalog/services/:id` | Detalle de un servicio (404 si es de otra empresa). |
| PATCH | `/catalog/services/:id` | Actualiza cualquier campo, incluyendo `isActive` (activar/desactivar). |

## Decisiones técnicas y por qué

- **Validación de comisión condicional al tipo**: si `commissionType` es `PERCENTAGE`, `commissionValue` se limita a 0–100 (`@ValidateIf` + `@Max(100)` en el DTO); si es `FIXED`, no hay tope (es un monto en la moneda de la empresa, no un porcentaje). Nota conocida: en `UpdateServiceDto`, si un PATCH envía solo `commissionValue` sin repetir `commissionType`, la validación asume que no es `FIXED` (aplica el tope de 100). El frontend siempre reenvía ambos campos juntos al editar, así que esto no se manifiesta en la práctica — queda anotado por si en el futuro se agrega un endpoint que permita editar `commissionValue` de forma aislada.
- **Aislamiento entre empresas también al relacionar**: crear o editar un `Service` con un `categoryId` de otra empresa devuelve 404 (`assertCategoryBelongsToCompany` en `ServicesService`), no solo se filtra el listado — evita que un Business Admin adivine el id de una categoría ajena y la use igual.
- **Equivalencia de comisión en vivo, calculada en el frontend**: el backend solo guarda `commissionType` + `commissionValue`; la pantalla calcula y muestra la conversión (ej. "10% ⇄ ≈$5.000 fijo") a partir del precio actual del formulario, sin pedir nada al servidor. Es una comodidad puramente visual.

## Permisos

Todos los endpoints exigen `@Roles(Role.BUSINESS_ADMIN)` + `TenantGuard`, igual que Sucursales/Usuarios. Cualquier otro rol recibe 403; un recurso de otra empresa responde 404.

## Frontend

- `core/models/catalog.model.ts`: tipos `Service`/`ServiceCategory`, opciones de tipo de recurso en español, y `ServiceDraft` (forma común para crear y editar un servicio, con sus helpers `emptyServiceDraft()`/`draftFromService()`).
- `core/services/catalog.service.ts`: llamadas HTTP a `/catalog/categories` y `/catalog/services`.
- `features/settings/services/`: nueva pestaña "Servicios" (cuarta, junto a Empresa/Sucursales/Usuarios). Sección de categorías (crear, renombrar y borrar inline) + formulario de creación de servicio + tabla con edición inline (mismo patrón que el editor de horario de Sucursales) y activar/desactivar.

## Pruebas

- **Unitarias** (`categories.service.spec.ts`, `services.service.spec.ts`): creación, conflicto de nombre duplicado (`P2002`→409), aislamiento por `companyId` en buscar/actualizar/borrar, validación de que la categoría de un servicio pertenezca a la misma empresa, actualización parcial (incluida quitar categoría con `null`).
- **E2E** (`test/catalog.e2e-spec.ts`, contra PostgreSQL real): dos empresas comparten nombre de categoría sin conflicto; categoría repetida en la misma empresa (409); rol no autorizado (403); creación de servicio con categoría/comisión/recurso; categoría de otra empresa (404); comisión porcentual > 100 rechazada (400) vs. comisión fija > 100 aceptada; aislamiento entre empresas en lectura/edición (404); desactivar servicio; borrar categoría no borra sus servicios (los deja sin categoría).
- **Manual (navegador, Playwright)**: crear categoría → crear servicio con esa categoría, comisión porcentual y recurso "Sala" → verificar la equivalencia en vivo → editar el servicio → desactivarlo.
