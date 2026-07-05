# 04 — Backlog

**Proyecto:** Atlas
**Depende de:** [00_Project_Charter.md](00_Project_Charter.md), [01_Product_Requirements_Document.md](01_Product_Requirements_Document.md), [02_Architecture.md](02_Architecture.md), [03_Roadmap.md](03_Roadmap.md)

Backlog priorizado de la Beta (MVP), organizado en épicas alineadas 1 a 1 con las 14 etapas del roadmap. Cada épica contiene historias de usuario con criterios de aceptación, listos para derivar los Module Prompts de cada etapa. Al final se listan, sin desglosar en historias, las épicas de las versiones 1.0/2.0/3.0.

Formato de historia: **Como** `<rol>` **quiero** `<acción>` **para** `<beneficio>`.

---

## Épica 0 — Documentación

Ya completada con los documentos `00` a `04` y el Master Prompt derivado de ellos.

---

## Épica 1 — Inicialización del proyecto

**Objetivo:** dejar un proyecto vacío pero perfectamente organizado, sin lógica de negocio.

- Como Technical Lead, quiero un backend NestJS con estructura por dominios (`platform/`, `people/`, `scheduling/`, `commerce/`, `catalog/`, `communication/`, `settings/`, `shared/`) para empezar a desarrollar sobre una base ordenada.
  - AC: el proyecto compila y arranca; existe un endpoint de salud (`/health`).
- Como Technical Lead, quiero Angular inicializado en modo standalone con estructura `core/` y `shared/` para reflejar los mismos dominios del backend.
  - AC: la app Angular sirve una pantalla base sin errores de consola.
- Como Technical Lead, quiero Docker Compose con `backend`, `postgres` y `frontend` para levantar el entorno de desarrollo con un solo comando.
  - AC: `docker compose up` deja los tres servicios corriendo y comunicados entre sí.
- Como Technical Lead, quiero Prisma conectado a PostgreSQL con el primer `schema.prisma` versionado para empezar a modelar entidades.
  - AC: `prisma migrate dev` corre sin errores contra la base de datos del compose.
- Como Technical Lead, quiero ESLint, Prettier y Husky configurados para que ningún commit rompa el estilo de código acordado.
  - AC: un commit con errores de lint es rechazado por el hook de pre-commit.

---

## Épica 2 — Autenticación

**Objetivo:** login funcional con roles, base de todo lo demás.

- Como usuario del sistema, quiero iniciar sesión con correo y contraseña para acceder a mi panel correspondiente según mi rol.
  - AC: credenciales inválidas devuelven error claro; credenciales válidas devuelven JWT de acceso + refresh token.
- Como usuario autenticado, quiero que mi sesión se renueve automáticamente vía refresh token para no tener que iniciar sesión constantemente.
  - AC: el access token expira en minutos; el refresh token permite obtener uno nuevo sin reintroducir credenciales, con rotación del refresh token en cada uso.
- Como sistema, quiero verificar el rol del usuario en cada endpoint protegido para impedir accesos no autorizados.
  - AC: un usuario con rol Profesional no puede acceder a endpoints exclusivos de Business Admin (403).

---

## Épica 3 — Platform Owner

**Objetivo:** el dueño de Atlas puede crear y administrar empresas, licencias y planes.

- Como Platform Owner, quiero crear una nueva `Company` con sus datos básicos para dar de alta un nuevo cliente.
  - AC: la empresa creada queda aislada (sin acceso a datos de otras empresas).
- Como Platform Owner, quiero definir `Plan`es con módulos habilitados y límites de uso para ofrecer distintos niveles comerciales.
  - AC: los límites configurados (sucursales, profesionales, usuarios, citas/mes, conversaciones WhatsApp) se validan al ser superados y, por defecto, solo generan una advertencia sin bloquear la operación.
- Como Platform Owner, quiero asignar una `License` con su cadencia (mensual/trimestral/semestral/anual/trial) y fecha de corte a cada empresa.
  - AC: al vencer la licencia, la empresa entra en el comportamiento configurado (Immediate Read Only por defecto, o Grace Period/Temporary Access/Full Block si así se configuró).
- Como Platform Owner, quiero entrar temporalmente como Business Admin de cualquier empresa indicando un motivo obligatorio para dar soporte sin pedir credenciales.
  - AC: no se puede iniciar la impersonación sin motivo; se genera un registro de auditoría inmutable con empresa, usuario, timestamp, motivo, sesión e IP.

---

## Épica 4 — Configuración inicial del negocio

**Objetivo:** cada empresa puede configurarse a sí misma antes de operar.

- Como Business Admin, quiero registrar los datos generales de mi empresa (nombre, logo, colores) para personalizar mi experiencia dentro de Atlas.
  - AC: el logo/nombre/colores se reflejan en el portal público de reservas, con la marca de Atlas siempre visible.
- Como Business Admin, quiero crear una o varias `Branch` (sucursales) con su horario y dirección para operar en más de un lugar.
  - AC: cada sucursal tiene su propio horario y su propia caja disponible desde su creación.
- Como Business Admin, quiero definir la zona horaria por defecto de mi empresa y sobreescribirla por sucursal si aplica.
  - AC: todos los timestamps se guardan en UTC; la hora mostrada respeta la zona horaria de la sucursal correspondiente.
- Como Business Admin, quiero que mi empresa arranque con efectivo y transferencia habilitados por defecto, con opción de habilitar el resto de métodos de pago.
  - AC: sin configuración adicional, una venta ya puede cobrarse en efectivo o transferencia.

---

## Épica 5 — Usuarios

**Objetivo:** cada persona del negocio tiene acceso acorde a su rol.

- Como Business Admin, quiero crear usuarios con rol Supervisor, Recepcionista/Cajero para que mi equipo opere el sistema.
  - AC: cada usuario nuevo solo ve las funciones permitidas por su rol.
- Como Business Admin, quiero poder vincular opcionalmente un `User` a un `Professional` ya existente para que el profesional pueda iniciar sesión sin recrear sus datos.
  - AC: un profesional sin usuario sigue operando con normalidad gestionado por recepción; al vincularle un usuario, conserva todo su historial.

---

## Épica 6 — Servicios

**Objetivo:** catálogo de servicios propio de cada empresa.

- Como Business Admin, quiero crear categorías de servicio propias de mi empresa para organizar mi catálogo.
  - AC: dos empresas distintas pueden tener categorías con el mismo nombre sin conflicto entre sí.
- Como Business Admin, quiero crear un `Service` con duración, precio, tiempo de preparación (buffer) y comisión asociada para reflejar lo que realmente ofrezco.
  - AC: la comisión puede definirse en porcentaje o en valor fijo, mostrando la equivalencia entre ambos.
- Como Business Admin, quiero marcar que un servicio requiere un recurso (sala/silla/cabina/máquina/camilla) o dos profesionales para modelar servicios especiales (ej. spa, peinado de novia).
  - AC: al agendar ese servicio, el sistema exige seleccionar el recurso o los dos profesionales según corresponda.

---

## Épica 7 — Clientes

**Objetivo:** base de clientes con historial por empresa.

- Como Recepcionista, quiero registrar un `Client` con nombre y teléfono como mínimo para agendarle citas rápidamente.
  - AC: si la empresa configuró correo/documento/dirección como obligatorios, el formulario los exige; si no, no los pide.
- Como Recepcionista, quiero ver el historial completo de un cliente (servicios, profesionales, productos, cancelaciones, inasistencias) para atenderlo mejor.
  - AC: la línea de tiempo del cliente se actualiza automáticamente con cada evento relevante.

---

## Épica 8 — Agenda ⭐

**Objetivo:** el módulo central del sistema — profesionales, horarios y citas.

- Como Business Admin, quiero definir la jornada laboral de cada profesional (por día, con opción de jornadas predefinidas) para reflejar su disponibilidad real.
  - AC: un profesional puede tener horarios distintos por sucursal y día; nunca puede quedar disponible en dos sucursales a la misma hora.
- Como Business Admin o Profesional (si la empresa lo permite), quiero crear bloqueos en la agenda (almuerzo, capacitación, vacaciones) para que esas horas no se puedan reservar.
  - AC: las vacaciones registradas bloquean automáticamente el rango de fechas correspondiente sin acción manual adicional.
- Como Recepcionista o Cliente (desde el portal), quiero crear una `Appointment` seleccionando profesional, servicio y horario disponible para reservar un turno.
  - AC: no se permite doble reserva del mismo profesional en el mismo horario; sí puede coexistir con otro profesional libre a la misma hora.
- Como Recepcionista, quiero cambiar el estado de una cita entre sus 8 estados posibles (Pendiente, Confirmada, En espera, En atención, Finalizada, Cancelada, No asistió, Reagendada) para reflejar la operación real.
  - AC: el cambio de estado queda registrado en el historial de la cita con quién lo hizo.
- Como Recepcionista, quiero cambiar el profesional o el servicio de una cita ya creada (si la empresa lo permite) sin perder el resto de la información de la cita.
  - AC: el cambio de profesional/servicio queda visible en el historial de la cita; no se permite cambiar el servicio de una cita ya finalizada.
- Como sistema, quiero marcar automáticamente el contador de inasistencias de un cliente al registrar "No asistió" para poder alertar al negocio tras cierto umbral.
  - AC: superado el umbral configurado, se genera una alerta visible para el Business Admin.
- Como cliente en lista de espera, quiero que se me ofrezca automáticamente un cupo liberado para no tener que estar consultando manualmente.
  - AC: al cancelarse una cita, el primer cliente en la lista de espera compatible recibe la oferta del cupo.

---

## Épica 9 — WebSocket (tiempo real)

**Objetivo:** la agenda y la caja se actualizan en tiempo real para todo el staff conectado.

- Como Recepcionista, quiero ver en tiempo real cuando se crea, cambia o cancela una cita sin recargar la pantalla.
  - AC: dos sesiones abiertas en la misma sucursal reflejan el cambio de una cita en menos de un segundo tras guardarse.
- Como sistema, quiero que cada cliente WebSocket se una solo a los rooms de su empresa/sucursal para no filtrar eventos entre tenants.
  - AC: un usuario de la Empresa A nunca recibe eventos de la Empresa B.

---

## Épica 10 — Ventas y Caja

**Objetivo:** cobrar servicios/productos y calcular comisiones automáticamente.

- Como Cajero, quiero abrir una `CashRegister` al inicio del turno para empezar a registrar ventas.
  - AC: no se puede abrir una segunda caja en la misma sucursal mientras haya una abierta.
- Como Cajero, quiero registrar una `Sale` con servicios, productos, descuentos y propina, y cobrarla con uno o varios métodos de pago.
  - AC: la suma de los pagos registrados debe coincidir con el total de la venta antes de poder cerrarla.
- Como sistema, quiero calcular automáticamente la `Commission` del profesional al finalizar y pagar una venta, según las reglas de servicio/producto configuradas.
  - AC: una venta cancelada o no pagada nunca genera comisión; la comisión de producto solo se calcula si la empresa la habilitó explícitamente.
- Como Cajero, quiero cerrar la caja al final del turno con un resumen de ventas, métodos de pago y diferencias para hacer el arqueo.
  - AC: el cierre de caja queda registrado en auditoría con el usuario que lo realizó.

---

## Épica 11 — WhatsApp

**Objetivo:** centro de conversaciones integrado a la operación diaria.

- Como Cajero, quiero ver y responder los mensajes de WhatsApp de mis clientes desde Atlas para no depender del teléfono físico.
  - AC: un mensaje entrante aparece en tiempo real en el panel del cajero (vía el evento de dominio correspondiente).
- Como Cajero, quiero crear una cita directamente desde una conversación de WhatsApp para agilizar la atención.
  - AC: la cita creada queda vinculada a la conversación y, al confirmarse, se envía automáticamente la confirmación por el mismo canal.
- Como sistema, quiero vincular una conversación (`Contact`) a un `Client` existente cuando se identifique, para unificar su historial.
  - AC: una conversación puede existir y operar (crear cita, responder) antes de estar vinculada a un cliente.

---

## Épica 12 — Dashboard

**Objetivo:** visión consolidada del día a día del negocio.

- Como Business Admin, quiero ver en un solo panel las ventas del día, clientes atendidos/esperando, próximos turnos, ingresos y comisiones para tomar decisiones rápidas.
  - AC: los datos del dashboard se actualizan a partir de los eventos de dominio ya emitidos por Agenda y Ventas, sin necesidad de recalcular todo desde cero.

---

## Épica 13 — Reportes

**Objetivo:** reportes básicos operativos.

- Como Business Admin, quiero generar reportes de ventas por día/semana/mes, por profesional, por servicio, por cliente, por método de pago y de comisiones para evaluar el desempeño del negocio.
  - AC: cada reporte puede exportarse (Excel, PDF o CSV según corresponda) y respeta el aislamiento de datos de la empresa.

---

## Épicas futuras (sin desglosar en historias todavía)

Se detallarán en su momento, respetando el Principio #1 (MVP First):

- **v1.0:** Inventario completo, Fidelización/puntos, Lista de espera formal avanzada, mejoras de reportes y configuración adicional.
- **v2.0:** Automatizaciones sobre Agenda/WhatsApp, evaluación de API oficial de WhatsApp, activación de la API pública, integraciones externas.
- **v3.0:** IA conversacional, Marketplace/plugins, analítica avanzada.

---

**Con esto quedan completos los 5 documentos oficiales de la fase de Análisis.** El siguiente paso, según el flujo acordado en el Project Charter, es construir el **Master Prompt** (en `prompts/master_prompt.md`, fuera de `docs/`) y, a partir de él, el primer **Module Prompt** correspondiente a la Etapa 1 — Inicialización.
