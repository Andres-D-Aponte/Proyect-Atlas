# 02 — Arquitectura

**Proyecto:** Atlas
**Depende de:** [00_Project_Charter.md](00_Project_Charter.md), [01_Product_Requirements_Document.md](01_Product_Requirements_Document.md)

Este documento define la arquitectura técnica de Atlas: stack final, organización del monolito modular, estrategia de multi-tenancy, patrones obligatorios, sistema de eventos, autenticación, tiempo real, integración de WhatsApp, auditoría y convenciones de código. Cualquier decisión aquí documentada requiere un ADR (sección 12) antes de cambiarse.

---

## 1. Visión arquitectónica general

Atlas es un **Monolito Modular** organizado por **Dominios de negocio** (feature-first), nunca por capas técnicas genéricas (`controllers/`, `models/`, `routes/` mezclados). Cada dominio es un módulo de NestJS aislado, con comunicación entre dominios exclusivamente a través de **servicios con interfaces bien definidas** o de **eventos de dominio** — nunca acoplamiento directo entre dominios que no lo necesiten.

No se implementan microservicios en el MVP. La organización por dominios existe precisamente para que, si algún día un dominio concreto (ej. WhatsApp) necesitara extraerse a un servicio independiente, el esfuerzo de extracción sea bajo.

## 2. Stack tecnológico (FINAL)

| Capa | Tecnología |
|---|---|
| Frontend | Angular + TypeScript |
| Backend | NestJS + TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Tiempo real | Socket.IO |
| Autenticación | JWT + Refresh Tokens |
| Validación | class-validator + class-transformer |
| Documentación de API | Swagger / OpenAPI |
| Contenedores | Docker |
| Control de versiones | Git |
| Calidad de código | ESLint + Prettier + Husky |

NestJS se usa de forma **idiomática**: módulos, providers, guards, interceptors, exception filters y pipes. Nunca se implementa una arquitectura estilo Express plano "disfrazada" dentro de NestJS. Se prioriza la mantenibilidad sobre atajos.

## 3. Organización del backend (feature-first por dominio)

```text
backend/
├── src/
│   ├── platform/              # Dominio Plataforma
│   │   ├── companies/
│   │   ├── licenses/
│   │   └── plans/
│   │
│   ├── people/                 # Dominio Personas
│   │   ├── clients/
│   │   ├── professionals/
│   │   ├── contacts/
│   │   └── users/
│   │
│   ├── scheduling/              # Dominio Agenda
│   │   ├── appointments/
│   │   ├── schedules/
│   │   ├── blocks/
│   │   └── waitlist/
│   │
│   ├── commerce/                 # Dominio Comercial
│   │   ├── sales/
│   │   ├── payments/
│   │   ├── cash-register/
│   │   └── commissions/
│   │
│   ├── catalog/                   # Dominio Catálogo
│   │   ├── services/
│   │   ├── service-categories/
│   │   ├── resources/
│   │   └── products/
│   │
│   ├── communication/              # Dominio Comunicación
│   │   ├── whatsapp/
│   │   └── notifications/
│   │
│   ├── settings/                    # Dominio Configuración
│   │
│   ├── shared/                       # Auditoría, eventos, guards, decoradores, tenant-context
│   │   ├── audit/
│   │   ├── events/
│   │   ├── tenancy/
│   │   └── common/
│   │
│   └── main.ts
│
├── prisma/
│   └── schema.prisma
│
└── test/
```

Cada carpeta de dominio contiene su propio `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, y las clases de acceso a datos vía Prisma (patrón Repository encapsulado dentro del servicio o en una clase repository dedicada cuando la complejidad de la consulta lo amerite).

## 4. Organización del frontend (Angular)

Angular standalone, organizado también feature-first, reflejando los mismos dominios del backend, con una capa `core/` (auth, interceptors HTTP, guards de ruta) y una capa `shared/` (componentes UI reutilizables). La navegación se agrupa en las secciones definidas en el PRD (Operación, Comercial, Catálogo, Comunicación, Administración) para mantener la UX simple de cara al usuario aunque el dominio interno sea amplio.

## 5. Estrategia de Multi-tenancy

**Decisión:** una única base de datos PostgreSQL compartida, con `companyId` en toda tabla cuyo dato pertenezca a una empresa (Opción A del PRD/discovery). Justificación: simplicidad operativa, costo bajo, backups centralizados, y es el modelo más usado en SaaS de este tamaño.

**Riesgo aceptado y mitigación:** el principal riesgo de este modelo es la fuga de datos entre empresas por una consulta sin filtrar. Mitigaciones obligatorias:

- Un **`TenantContext`** (basado en el JWT del usuario autenticado) inyectado en cada request mediante un `Guard`/`Interceptor` transversal.
- Un **middleware de Prisma** (`$use` / Prisma Client Extensions) que añade automáticamente `companyId` a toda query de lectura/escritura sobre modelos con tenant, de forma que sea prácticamente imposible olvidar el filtro manualmente.
- Excepción explícita y auditada para el **Platform Owner** (acceso global o impersonación), nunca implícita.
- Como defensa adicional (no sustituye lo anterior): evaluar Row-Level Security (RLS) nativo de PostgreSQL sobre las tablas tenant como segunda capa de protección.
- Quality Gate transversal obligatorio: pruebas automáticas que verifiquen que ninguna consulta cruza `companyId` entre empresas distintas.

## 6. Patrón de módulo NestJS (obligatorio para todo dominio)

- **Controller:** solo orquesta HTTP — recibe DTOs validados, delega en el Service, nunca contiene lógica de negocio.
- **DTOs:** con `class-validator` + `class-transformer`, uno por caso de uso (create/update/query), nunca reutilizar entidades de Prisma como DTO de entrada.
- **Service:** contiene la lógica de negocio del dominio; es quien conoce las reglas del PRD.
- **Acceso a datos:** vía Prisma, encapsulado en el Service o en una clase de acceso a datos dedicada cuando la consulta sea compleja o se reutilice.
- **Guards:** autenticación (JWT), autorización (roles/permisos), y tenencia (`TenantGuard`).
- **Interceptors:** logging, transformación de respuesta, y el interceptor de auditoría.
- **Exception Filters:** normalizan errores de dominio a respuestas HTTP consistentes.
- **Pipes:** validación de DTOs de entrada.
- **Configuration Module:** un módulo propio de configuración (variables de entorno, secretos, flags) inyectado por DI, nunca `process.env` disperso por el código.

## 7. Sistema de eventos internos (arquitectura orientada a eventos)

Cada dominio publica **eventos de dominio** cuando ocurre algo relevante, y otros dominios se suscriben a esos eventos en vez de llamarse directamente. Ejemplo:

```text
Appointment creado
        ↓
AppointmentCreated (evento)
        ↓
   ┌────────────┬────────────────┬───────────────┬─────────────┐
   ▼            ▼                ▼               ▼             ▼
WhatsApp    Notificaciones    Auditoría       Dashboard     WebSocket
(confirma)  (interno)         (registra)      (actualiza)   (tiempo real)
```

Convención de nombres: `<Entidad><Acción>` en pasado (`AppointmentCreated`, `AppointmentCancelled`, `SaleCompleted`, `LicenseExpired`). Implementación vía el `EventEmitter2` de NestJS (`@nestjs/event-emitter`) para el MVP; si en el futuro se requiere entrega garantizada entre procesos, se evalúa una cola (Redis/RabbitMQ) sin cambiar la forma en que los dominios publican/consumen eventos.

Esto es lo que permite, por ejemplo, que WhatsApp pueda reemplazarse por Telegram/SMS/correo en el futuro sin tocar el dominio Agenda: Agenda nunca conoce la existencia de WhatsApp.

## 8. Autenticación y autorización

- **JWT de acceso de corta duración + Refresh Token** de larga duración (rotación de refresh token en cada uso).
- Login inicial solo con **correo + contraseña**; arquitectura preparada (no implementada) para añadir proveedores OAuth más adelante sin romper el modelo de `User`.
- **RBAC** (Role-Based Access Control) por rol (Platform Owner, Business Admin, Supervisor, Recepcionista/Cajero, Profesional), verificado con Guards de NestJS.
- **Impersonación del Platform Owner:** endpoint dedicado que exige un `reason` obligatorio en el payload, emite un JWT de "sesión de impersonación" (marcado como tal, con el `companyId` objetivo y el `actingAs` del PO) y dispara automáticamente un evento `ImpersonationStarted` capturado por el interceptor de auditoría (empresa, usuario, timestamp, motivo, sesión, IP).

## 9. Tiempo real (Socket.IO)

Conexión autenticada vía JWT. Los clientes se unen a *rooms* por empresa/sucursal (`company:{companyId}` y `branch:{branchId}`) para recibir solo los eventos que les corresponden. Los eventos de dominio relevantes (creación/cambio de cita, mensaje de WhatsApp entrante, cambio de caja) se retransmiten a los rooms correspondientes desde los listeners de eventos internos (sección 7), nunca emitidos directamente desde el Controller.

## 10. Integración de WhatsApp

Se implementa como un **adaptador intercambiable**: el dominio `communication/whatsapp` expone una interfaz interna de "proveedor de mensajería" (`send`, `onMessageReceived`, `getConnectionStatus`, etc.). La primera implementación concreta usa una librería de conexión no oficial tipo WhatsApp Web (QR), pero cualquier implementación futura (API oficial de WhatsApp Business, Telegram, SMS) solo debe implementar esa misma interfaz — el resto del dominio (conversaciones, vínculo con `Contact`/`Client`, creación de citas desde el chat) no cambia.

## 11. Auditoría

Interceptor transversal + decorador (`@Audit()`) aplicable a operaciones de escritura relevantes. Cada registro de auditoría es **inmutable** (solo inserción, nunca update/delete) y contiene: entidad afectada, acción, usuario, empresa, timestamp, y payload relevante del cambio (antes/después cuando aplique). La impersonación del Platform Owner es un caso particular de auditoría obligatoria (sección 8).

## 12. Internacionalización, moneda y zona horaria

- Idioma y moneda configurables por empresa (default: español / COP).
- Zona horaria: la Empresa define un default; cada Sucursal puede sobreescribirlo.
- **Regla dura:** todos los timestamps se almacenan en UTC en base de datos, sin excepción. La conversión a la zona horaria de la empresa/sucursal ocurre exclusivamente en la capa de aplicación (backend al serializar, o frontend al presentar).

## 13. Convenciones de código

- TypeScript estricto (`strict: true`) en backend y frontend.
- Entidades de dominio en inglés (`Company`, `Professional`, `Service`, `Appointment`...); la interfaz de usuario y los mensajes al usuario final en español.
- ESLint + Prettier + Husky (pre-commit) para consistencia automática; ningún PR se aprueba con errores de lint.
- Nomenclatura de eventos: `<Entidad><AcciónEnPasado>`.
- Ningún archivo/controlador debe crecer sin límite — si un módulo empieza a mezclar responsabilidades de otro dominio, se extrae.

## 14. Docker y entornos

`docker-compose` con al menos tres servicios base desde el día uno: `backend`, `postgres`, y (cuando aplique) un servicio de frontend para desarrollo. Variables de entorno gestionadas vía el Configuration Module de NestJS, nunca hardcodeadas. Entornos previstos: desarrollo local, y (a definir en Etapa 1) staging/producción.

---

## 15. ADRs (Architecture Decision Records)

Registro resumido de las decisiones arquitectónicas más importantes. Formato: Contexto → Decisión → Consecuencias.

### ADR-001 — Monolito Modular en vez de Microservicios

**Contexto:** proyecto nuevo, equipo de una persona + IA, dominio con módulos muy interrelacionados (agenda, comercial, catálogo).
**Decisión:** Monolito Modular organizado por dominios, con un único despliegue.
**Consecuencias:** despliegue y desarrollo simples; menor complejidad operativa; si algún dominio necesita escalar o extraerse en el futuro, el bajo acoplamiento por eventos facilita la extracción.

### ADR-002 — Multi-tenancy con base de datos compartida + `companyId`

**Contexto:** SaaS multiempresa desde el día uno, pero con equipo pequeño y necesidad de simplicidad operativa.
**Decisión:** una sola base de datos PostgreSQL, aislamiento lógico por `companyId`, reforzado con middleware de Prisma y `TenantGuard` (ver sección 5).
**Consecuencias:** mucho más barato y simple de mantener que esquema-por-empresa o BD-por-empresa; exige disciplina y pruebas automáticas de aislamiento para evitar fuga de datos.

### ADR-003 — NestJS sobre Express plano

**Contexto:** se busca un backend mantenible durante años, no solo funcional para el MVP.
**Decisión:** NestJS (con Express como motor HTTP subyacente), usado de forma idiomática.
**Consecuencias:** estructura más predecible, DI nativa, mejor soporte para Guards/Interceptors/Pipes/Exception Filters que una app Express artesanal; curva de aprendizaje algo mayor, asumida conscientemente.

### ADR-004 — Arquitectura orientada a eventos internos

**Contexto:** múltiples dominios necesitan reaccionar a los mismos hechos de negocio (ej. creación de una cita) sin acoplarse entre sí.
**Decisión:** cada dominio publica eventos de dominio; otros dominios se suscriben, sin llamadas directas entre servicios de dominios distintos salvo consultas explícitas y necesarias.
**Consecuencias:** bajo acoplamiento, más fácil sustituir integraciones (ej. WhatsApp) sin tocar Agenda; requiere disciplina en el nombrado y documentación de eventos.

### ADR-005 — WhatsApp como adaptador intercambiable

**Contexto:** se empieza con integración no oficial (QR) por costo, con intención de migrar a la API oficial más adelante.
**Decisión:** interfaz de "proveedor de mensajería" desacoplada de la implementación concreta.
**Consecuencias:** migrar de proveedor no debería requerir cambios en Agenda, Clientes o Notificaciones — solo una nueva implementación del adaptador.

### ADR-006 — UTC obligatorio en almacenamiento de fechas

**Contexto:** empresas y sucursales pueden operar en zonas horarias distintas.
**Decisión:** almacenamiento siempre en UTC; conversión solo en capa de aplicación.
**Consecuencias:** evita bugs de "hora corrida" al escalar a múltiples zonas horarias; exige disciplina en frontend/backend para nunca persistir hora local.

---

**Documento siguiente:** [03_Roadmap.md](03_Roadmap.md)
