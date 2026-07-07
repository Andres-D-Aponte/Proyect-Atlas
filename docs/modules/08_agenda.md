# Módulo — Agenda (Etapa 8) ⭐

**Roadmap:** [`docs/03_Roadmap.md`](../03_Roadmap.md) → Etapa 8.
**Backlog:** [`docs/04_Backlog.md`](../04_Backlog.md) → Épica 8.
**Reglas de negocio:** [`docs/01_Product_Requirements_Document.md`](../01_Product_Requirements_Document.md) sección 4.2 (Agenda) y 3 (modelo de dominio).

## Objetivo

El módulo central del sistema: profesionales con su horario semanal por sucursal y sus bloqueos (almuerzo, capacitación, vacaciones), citas (`Appointment`) con sus 8 estados, prevención de doble reserva, cambio de profesional/servicio sobre una cita existente, conteo de inasistencias con alerta, lista de espera con oferta automática al cancelarse un turno, calendario de excepciones/festivos y recursos (sillas, salas, cabinas, máquinas, camillas) para servicios que los requieren.

## Alcance de esta etapa

- Backend y frontend. Accesible a `BUSINESS_ADMIN`, `SUPERVISOR` y `RECEPTIONIST_CASHIER` (mismo set de roles que Clientes en la Etapa 7); Profesionales y Recursos son de configuración y quedan restringidos a `BUSINESS_ADMIN`.
- **Cumple una promesa pendiente desde la Etapa 5**: `Professional.userId` ya estaba previsto en el PRD como opcional para que un profesional pueda tener su propia cuenta. Como hasta ahora no existía ningún flujo que creara usuarios con rol `PROFESSIONAL`, se extendió `ASSIGNABLE_COMPANY_ROLES` (`create-company-user.dto.ts`) y `MANAGEABLE_ROLES` (`users.service.ts`) de la Etapa 5 para incluirlo — cambio retrocompatible, no se tocó nada del comportamiento existente para Supervisor/Recepcionista.
- **"Confirmación automática/manual" y "reserva inmediata o con aprobación"** se describen en el PRD como dos preguntas separadas, pero para el MVP resuelven la misma decisión operativa: se modelan con un único campo `Company.requireAppointmentApproval`. Si es `true`, las citas nuevas nacen en `PENDING`; si es `false` (default), nacen en `CONFIRMED`.
- **Cambio de profesional en una cita — quién lo controla**: el PRD (sección 4.2) es explícito en que esta es una decisión del Platform Owner, no del Business Admin, por lo que vive en un endpoint propio (`PATCH /platform/companies/:id/agenda-policy`), fuera de `UpdateCompanySettingsDto`. El resto de la configuración de Agenda (`requireAppointmentApproval`, `noShowAlertThreshold`) sí es de Business Admin y vive en `/settings/company` junto al resto de la configuración de empresa.
- **Calendario de excepciones limitado a cierres de día completo**: el backlog no pide horarios parciales de festivo (ej. "el 24 de diciembre cerramos a mediodía"), así que `ScheduleException` solo modela "este día la sucursal/empresa está cerrada", no rangos horarios.
- **Deferido explícitamente (Regla de Oro — sin dependencias hacia adelante)**:
  - Recordatorios automáticos por WhatsApp al cliente (requiere Etapa 11, que no existe).
  - Empuje en tiempo real de cambios de agenda al panel del cajero (requiere Etapa 9 — WebSocket, que no existe).
  - Portal de autoservicio para que el cliente reserve su propia cita (no está en ninguna etapa construida; hoy solo el staff crea citas).
  - Sugerencia inteligente de horario alternativo cuando un profesional deja de estar disponible de repente — se documenta como refinamiento futuro, no es un AC del backlog actual.
  - Notificación real al cliente de la lista de espera cuando se le ofrece un cupo liberado (Etapa 11); por ahora la oferta queda visible en la pantalla de Agenda para que el staff lo contacte manualmente.
- **Corrección posterior (mismo día)**: al probar la etapa como Recepcionista/Cajero real se encontraron y corrigieron 4 bugs — ver "Bugs encontrados y corregidos" más abajo — y se agregó disponibilidad visual (mapa de profesionales + línea de tiempo clicable) para que agendar no dependa de adivinar un horario y esperar el rechazo del backend.

## Modelo de datos

- `Company` gana: `requireAppointmentApproval` (default `false`), `noShowAlertThreshold` (default `3`), `allowProfessionalChangeOnAppointment` (default `true`, solo editable por Platform Owner).
- `Client` gana: `noShowCount` (default `0`), incrementado automáticamente al marcar una cita como `NO_SHOW`.
- `Professional`: `companyId`, `userId?` (único, rol `PROFESSIONAL`), `name`, `isActive`.
- `ProfessionalSchedule`: `professionalId`, `branchId`, `dayOfWeek` (0=domingo…6=sábado), `startsAt`/`endsAt` (`HH:mm`, comparación lexicográfica simple).
- `ProfessionalBlock`: `professionalId`, `type` (`LUNCH`/`TRAINING`/`VACATION`/`OTHER`), `startAt`/`endAt` (rango de fecha/hora completo — una vacación es un bloque de varios días), `notes?`.
- `Resource`: `companyId`, `branchId`, `type` (`ROOM`/`CHAIR`/`CABIN`/`MACHINE`/`STRETCHER`, mismo enum de la Etapa 6), `name`, `isActive`.
- `ScheduleException`: `companyId`, `branchId?` (nulo = toda la empresa), `date` (día completo), `reason`.
- `Appointment`: `companyId`, `branchId`, `clientId?`, `serviceId`, `professionalId`, `secondProfessionalId?` (servicios en pareja), `resourceId?`, `startAt`, `endAt` (calculado desde `service.durationMinutes`), `blockedUntil` (`endAt` + `service.bufferMinutes`, guardado aparte para que una consulta de overlap sea un simple rango SQL), `status` (8 estados), `notes?`.
- `AppointmentHistoryEvent`: `appointmentId`, `description` (texto en español ya armado con diff de cambios), `createdAt` — mismo patrón que `ClientTimelineEvent` de la Etapa 7.
- `Waitlist`: `companyId`, `branchId`, `clientId`, `serviceId`, `professionalId?` (nulo = cualquiera sirve), `status` (`WAITING`/`OFFERED`/`CONVERTED`/`EXPIRED`/`CANCELLED`), `offeredAt?`.

## Endpoints

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST/GET | `/scheduling/professionals` | Business Admin | Alta y listado de profesionales. |
| GET/PATCH | `/scheduling/professionals/:id` | Business Admin | Detalle (con horarios y bloqueos) y edición. |
| POST | `/scheduling/professionals/:id/schedule` | Business Admin | Reemplaza el horario semanal completo (borra e inserta en una transacción). |
| POST/DELETE | `/scheduling/professionals/:id/blocks` / `/blocks/:blockId` | Business Admin | Crea/elimina un bloqueo puntual. |
| POST/GET/PATCH | `/scheduling/resources` | Business Admin | CRUD de recursos por sucursal. |
| POST/GET/DELETE | `/scheduling/schedule-exceptions` | Business Admin | Festivos/cierres. |
| POST/GET | `/scheduling/waitlist` | Business Admin, Supervisor, Recepcionista/Cajero | Alta y listado de lista de espera. |
| PATCH | `/scheduling/waitlist/:id/cancel` | Business Admin, Supervisor, Recepcionista/Cajero | Cancela una entrada (rechaza si ya fue convertida). |
| POST/GET | `/scheduling/appointments` | Business Admin, Supervisor, Recepcionista/Cajero | Crea/lista citas (filtros por sucursal, profesional, cliente, estado). |
| GET/PATCH | `/scheduling/appointments/:id` | Business Admin, Supervisor, Recepcionista/Cajero | Detalle (con historial) y edición (estado, profesional, servicio, horario, notas). |
| GET | `/scheduling/appointments/availability` | Business Admin, Supervisor, Recepcionista/Cajero | Horario del día + rangos ocupados (bloqueos y citas) de un profesional en una sucursal/fecha, para dibujar la línea de tiempo visual. |
| PATCH | `/platform/companies/:id/agenda-policy` | Platform Owner | Único punto para cambiar `allowProfessionalChangeOnAppointment`. |

Aislamiento entre empresas igual que en el resto de módulos: `findFirst({ where: { id, companyId } })`, nunca por `id` solo.

**Lectura vs. escritura en `/settings/branches`, `/scheduling/professionals` y `/catalog/services`**: el `GET` (listar/detalle) de estos tres recursos está disponible también para Supervisor y Recepcionista/Cajero — no solo Business Admin — porque la pantalla de Agenda (que sí es de esos roles) necesita leerlos para armar sus listas desplegables. Crear/editar/eliminar sigue siendo exclusivo de Business Admin. El permiso se define por método HTTP (`@Roles` a nivel de cada handler), no a nivel de controlador completo.

## Decisiones técnicas y por qué

- **`blockedUntil` precalculado en vez de sumar el buffer en cada consulta**: si el buffer del servicio cambiara después de creada la cita, recalcularlo en cada chequeo de disponibilidad daría resultados inconsistentes con lo que de verdad se reservó. Al guardarlo en el momento de crear/reagendar, la consulta de solapamiento es un simple `startAt < blockedUntil AND blockedUntil > startAt` contra las citas existentes.
- **Horario del profesional como strings `HH:mm`, no objetos de tiempo**: permite comparación lexicográfica directa (`'08:00' <= '09:00'`) sin lidiar con zonas horarias en esta capa — mismo patrón que `Branch.openingHours` de la Etapa 6.
- **Orden de validación de disponibilidad**: festivo/excepción → horario del profesional → bloqueos → solapamiento con otras citas. El festivo se revisa primero porque es la razón más "de todo o nada" (ni con horario ni sin bloqueos importa si la sucursal está cerrada ese día).
- **Recurso: asignación automática si no se indica uno explícito**: si el servicio requiere un tipo de recurso y el DTO no trae `resourceId`, el sistema recorre los recursos activos de ese tipo en la sucursal y asigna el primero libre; si se indica uno explícito, se valida que sea del tipo correcto y que esté libre. Igual criterio se aplica al reagendar.
- **Historial por diff, reutilizando el patrón de Clientes (Etapa 7)**: cada `PATCH` compara campo por campo contra el valor actual y arma una sola frase en español con lo que de verdad cambió (`"recepcionista@... actualizó: estado de "Confirmada" a "En atención"."`); si no cambió nada relevante, no se crea un evento vacío.
- **Oferta a la lista de espera se dispara después de la transacción, no dentro de ella**: cancelar una cita y marcar la siguiente entrada de espera como `OFFERED` son dos operaciones independientes; si la segunda fallara no tendría sentido revertir la cancelación ya confirmada al staff.
- **`noShowAlertThreshold` sin un canal de notificación dedicado**: por ahora la "alerta" (AC del backlog) es visual — la pantalla de Clientes muestra el contador de inasistencias de cada cliente y una insignia de advertencia cuando alcanza el umbral configurado por la empresa; no hay email/push, eso encajaría mejor cuando exista un sistema de notificaciones real.

## Bugs encontrados y corregidos

Encontrados probando la etapa como Recepcionista/Cajero real y en el flujo visual nuevo, no durante la construcción original:

- **Cajero recibía 403 al abrir Agenda**: la pantalla necesita leer sucursales, profesionales y servicios para sus listas desplegables, pero esos tres controladores tenían `@Roles(BUSINESS_ADMIN)` a nivel de clase, bloqueando también la lectura. Se movió `@Roles` a nivel de cada handler: los `GET` ahora aceptan también Supervisor y Recepcionista/Cajero; los `POST/PATCH/DELETE` siguen exclusivos de Business Admin.
- **Cita guardada en la hora equivocada según la zona horaria del navegador**: al elegir una hora en la línea de tiempo (que se dibuja en hora "de reloj" UTC, igual que `ProfessionalSchedule`), el frontend armaba `startAt` como `"${fecha}T${hora}"` y dejaba que `new Date(...)` lo interpretara — JavaScript interpreta ese formato como hora **local** del navegador, no UTC. Con un profesional de horario 08:00–18:00 y un usuario en un huso distinto de UTC+0, la cita terminaba guardándose varias horas desplazada respecto a la hora elegida. Se corrigió armando el ISO explícitamente en UTC (`"...T12:00:00.000Z"`). No se detectó antes porque todas las pruebas anteriores usaban profesionales con horario abierto 00:00–23:59 (cualquier desplazamiento caía igual dentro del rango).
- **El historial de una cita aparecía vacío justo después de cambiar su estado**: `toggleHistory()` fusionaba el detalle recién pedido dentro de la lista compartida `appointments()`; si el `reload()` disparado por el cambio de estado todavía estaba en vuelo, terminaba resolviéndose después y pisaba esa fusión, dejando el historial vacío en pantalla aunque sí existiera en la base de datos. Se separó en una señal propia (`expandedHistoryEvents`) que no depende del array compartido.
- **Layout roto del formulario "Nueva cita"**: la clase global `.create-form` fija `align-items: flex-end`; al no sobreescribirlo, cada fila del formulario (y el mapa/línea de tiempo) se encogía a su contenido y quedaba pegada a la derecha con un vacío enorme a la izquierda. Se agregó `align-items: stretch` en `.agenda-form`.

## Disponibilidad visual (mapa de profesionales + línea de tiempo)

Agendar una cita ya no depende de escribir una fecha/hora a ciegas y esperar a que el backend la rechace:

- Al elegir la sucursal, aparece una **matriz semanal** (profesional × día) con el horario de cada uno en esa sucursal, tomada de los mismos datos que ya trae `GET /scheduling/professionals` (se le agregó `include: { schedules, blocks }` también en el listado — antes solo el detalle por id los traía, así que la pantalla de Profesionales tampoco los mostraba correctamente tras crear/guardar). Hacer clic en una fila selecciona ese profesional.
- Al tener sucursal + profesional + fecha, se pinta una **línea de tiempo** (`AvailabilityTimelineComponent`) alimentada por `GET /scheduling/appointments/availability`: franja verde para el horario disponible, bloques rojos para bloqueos/citas existentes (con su nombre/motivo), y una selección punteada donde el usuario hace clic. La hora elegida se snapea a 5 minutos; también se puede mover con las flechas del teclado (accesibilidad).
- El backend sigue siendo la única fuente de verdad — la línea de tiempo es una ayuda visual, no reemplaza la validación real de `assertAvailability()`. Si el usuario hace clic sobre una franja ocupada, el intento de agendar igual se envía y el backend lo rechaza con el mismo toast de siempre.

## Permisos

| Endpoint | Business Admin | Supervisor | Recepcionista/Cajero | Platform Owner (sin impersonar) | Profesional |
|---|---|---|---|---|---|
| `/scheduling/professionals`, `/scheduling/resources`, `/scheduling/schedule-exceptions` (escritura) | ✅ | 403 | 403 | 403 | 403 |
| `/scheduling/professionals` (lectura), `/settings/branches` (lectura), `/catalog/services` (lectura) | ✅ | ✅ | ✅ | 403 | 403 |
| `/scheduling/appointments` (incluida `/availability`), `/scheduling/waitlist` | ✅ | ✅ | ✅ | 403 | 403 |
| `/platform/companies/:id/agenda-policy` | 403 | 403 | 403 | ✅ | 403 |

## Frontend

- `core/models/scheduling.model.ts` / `core/services/scheduling.service.ts`: tipos y llamadas HTTP para los cinco submódulos (profesionales, recursos, excepciones, citas, lista de espera) en un solo servicio, siguiendo el mismo criterio de `settings.service.ts` (varias entidades relacionadas, un solo archivo).
- `features/settings/professionals/`: pantalla nueva (Business Admin) — alta de profesional con vínculo opcional a un usuario con rol Profesional, editor de horario semanal por sucursal/día y gestión de bloqueos.
- `features/settings/branches/`: gana una sección "Recursos" por sucursal (alta, activar/desactivar), sin pantalla nueva porque el recurso pertenece conceptualmente a la sucursal.
- `features/agenda/`: pantalla nueva (Business Admin, Supervisor, Recepcionista/Cajero) — alta de cita con validación guiada, matriz semanal de profesionales por sucursal, línea de tiempo visual de disponibilidad (`availability-timeline/`, componente reutilizable con navegación por teclado), tabla con filtros por sucursal/estado, cambio de estado inline, historial expandible por fila (con su propia señal, ver "Bugs encontrados"), y sección de lista de espera (alta, cancelar).
- `features/clients/`: gana una columna "Inasistencias" con insignia de alerta (⚠) cuando el cliente alcanza el umbral configurado — visible solo para Business Admin, ya que `/settings/company` (de donde sale el umbral) es un endpoint restringido a ese rol.
- `features/platform/companies/`: gana un interruptor "Cambio de profesional en citas" por empresa, para que el Platform Owner controle `allowProfessionalChangeOnAppointment` sin salir de su panel.
- Las pantallas de Configuración, Clientes y Agenda ganan enlaces cruzados en su barra de pestañas ("Profesionales", "Agenda"), mismo criterio que la Etapa 7 con "Clientes".

## Pruebas

- **Unitarias**: `professionals.service.spec.ts`, `resources.service.spec.ts`, `schedule-exceptions.service.spec.ts`, `waitlist.service.spec.ts`, `appointments.service.spec.ts` — validan aislamiento por `companyId`, vínculo profesional↔usuario (rol correcto, no duplicado), reemplazo de horario, bloqueos, y en `AppointmentsService`: cada paso del chequeo de disponibilidad (festivo, horario, bloqueo, solapamiento), asignación de recurso automática/explícita, requerimiento de segundo profesional, bloqueo de cambio de servicio en cita finalizada, bloqueo de cambio de profesional según política, incremento de inasistencias, y disparo de oferta a lista de espera al cancelar.
- **E2E** (`test/scheduling.e2e-spec.ts`, contra PostgreSQL real): flujo completo de creación de cita con validación de disponibilidad (overbooking, fuera de horario, festivo, bloqueo), servicio de dos profesionales, asignación automática de recurso y rechazo cuando no hay ninguno libre, cambio de estado con historial, bloqueo de cambio de servicio al finalizar, incremento de inasistencias, oferta a lista de espera al cancelar, política de cambio de profesional controlada por el Platform Owner, aislamiento entre empresas, el endpoint de disponibilidad (horario + bloqueos + citas del día, ordenados; rechazo si el profesional/sucursal es de otra empresa), y un Recepcionista/Cajero real listando sucursales/profesionales/servicios sin poder crearlos.
- **Manual (navegador, Playwright, `tools/browser-check/check.mjs`)**: crear profesional con horario y bloqueo, crear recurso, crear cita usando la matriz de profesionales y la línea de tiempo (clic para elegir hora), intentar una doble reserva (debe rechazarse con el toast global), ver el historial de la cita, y — como Recepcionista/Cajero real (no impersonado) — entrar a Agenda y confirmar que no aparece el 403 corregido en esta ronda.
