# 01 — Product Requirements Document (PRD)

**Proyecto:** Atlas
**Depende de:** [00_Project_Charter.md](00_Project_Charter.md)

Este documento es la especificación funcional completa de Atlas: actores, modelo de negocio SaaS, diccionario del dominio y reglas de negocio por dominio. Es la fuente de verdad funcional para diseñar el modelo de datos, la API y para redactar los Module Prompts de cada etapa del roadmap.

---

## 1. Actores y roles

### 1.1 Jerarquía de roles

| Rol | Nivel | Alcance |
|---|---|---|
| **Platform Owner (PO)** | Plataforma | Dueño de Atlas. Gestiona empresas, licencias, planes, límites globales y estadísticas de toda la plataforma. |
| **Business Admin** | Empresa | Administra una empresa: sucursales, profesionales, horarios, servicios, usuarios, reportes y configuración permitida por su plan. |
| **Supervisor** | Empresa/Sucursal | Rol de staff con permisos ampliados de supervisión (ej. aprobar cierres de caja, aprobar cambios de horario propuestos por profesionales). |
| **Recepcionista / Cajero** | Sucursal | Opera la agenda, atiende clientes, cobra ventas, gestiona la caja y las conversaciones de WhatsApp. |
| **Profesional** | Sucursal | Puede o no tener usuario propio. Si lo tiene, ve su propia agenda y, si la empresa lo permite, propone su propio horario (sujeto a aprobación). |

### 1.2 Reglas transversales de rol

- Un **Profesional puede existir sin Usuario** (la recepción administra toda su agenda). Más adelante se le puede asignar un Usuario para que inicie sesión con rol "Profesional", sin migrar datos.
- Los **planes de suscripción afectan módulos disponibles y límites de uso, nunca los permisos**. Los permisos dependen exclusivamente del rol.
- **Impersonación del Platform Owner:** el PO puede "entrar como" Business Admin de cualquier empresa sin conocer sus credenciales. Es **obligatorio indicar un motivo** antes de entrar. Cada impersonación genera un **registro de auditoría inmutable** con: empresa, usuario (PO), timestamp, motivo, sesión, IP (cuando esté disponible).

---

## 2. Modelo de negocio SaaS (dominio Plataforma)

### 2.1 Empresa (`Company`)

Representa un negocio cliente independiente y completamente aislado (Opción A: sin compartir clientes ni datos entre empresas, ni siquiera entre sucursales de otra empresa). Cada empresa tiene su propio catálogo de servicios, clientes, agenda, caja, configuración, logo y colores.

### 2.2 Sucursal (`Branch`)

Una empresa puede tener una o varias sucursales. Cada sucursal tiene su propia caja, agenda, profesionales asignados, horario y dirección. El inventario puede ser opcional por sucursal.

### 2.3 Licencia (`License`)

Ciclo de facturación de una empresa. Cadencias soportadas: **mensual, trimestral, semestral, anual y trial (prueba)**. La arquitectura debe soportar estos ciclos **sin hardcodear precios ni lógica de facturación** — son datos de configuración administrados por el Platform Owner.

**Vencimiento de licencia** — comportamiento configurable por empresa, con las siguientes opciones:

| Opción | Comportamiento |
|---|---|
| **Immediate Read Only** (default) | La empresa pasa de inmediato a modo solo lectura: puede consultar su información pero no operar (no crear citas, ventas, etc.). |
| **Grace Period** | Existe un período de gracia antes de pasar a solo lectura. **Deshabilitado por defecto**; se habilitará y parametrizará en versiones futuras. |
| **Temporary Access** | Tras vencer, la empresa conserva acceso completo temporalmente. Duración **automática y global** (un mismo número de días para todas las empresas que entren en este modo, no un valor caso por caso). |
| **Full Block** | Bloqueo total inmediato al vencer. |

El Platform Owner decide cuál de estas opciones aplica a cada empresa.

### 2.4 Plan (`Plan`)

Combina **nivel** (ej. Starter/Pro/Enterprise) **y módulos opcionales activables** (ej. WhatsApp, Inventario, Reportes avanzados, Multi-sucursal). Cada plan define:

- Módulos habilitados.
- Límites de uso (totalmente configurables por el Platform Owner): número de sucursales, profesionales, usuarios, citas por mes, conversaciones de WhatsApp, etc.

**Comportamiento por defecto al superar un límite de plan:** el sistema **advierte pero sigue funcionando con normalidad** (no bloquea al negocio); se notifica a Business Admin y a Platform Owner. Este comportamiento es configurable por empresa/plan si se desea bloquear en vez de advertir.

### 2.5 Dominio público / branding

El link público de reservas de cada empresa debe soportar los tres formatos: subdominio con ruta (`agenda.atlas.com/elegance`), subdominio propio (`elegance.atlas.com`) y dominio propio del cliente (`agenda.elegance.com`). Cada empresa puede personalizar logo, colores, nombre, redes sociales, WhatsApp y horario dentro de su portal — pero la marca de Atlas debe permanecer siempre visible (no hay White Label).

---

## 3. Diccionario del dominio

| Entidad | Descripción | Reglas clave |
|---|---|---|
| `Company` | Negocio cliente, tenant raíz | Aislamiento total de datos vs. otras empresas |
| `Branch` | Sucursal de una empresa | Caja, agenda y profesionales propios |
| `Professional` | Persona que presta un servicio (barbero, estilista, masajista, manicurista, etc.) | Puede existir sin `User`; puede trabajar en varias sucursales sin solaparse en el mismo horario |
| `Client` | Cliente final del negocio | Pertenece a una empresa; si visita otra empresa, historial 100% separado aunque comparta teléfono |
| `Contact` | Persona que escribió por WhatsApp antes de identificarse como cliente | Puede existir sin `Client`; se vincula al identificarse |
| `User` | Cuenta de acceso al sistema | Vinculable opcionalmente a un `Professional` |
| `Service` | Servicio ofrecido (nunca "Corte") | Catálogo propio por empresa, nunca global |
| `ServiceCategory` | Categoría de servicios | Propia por empresa |
| `Resource` | Recurso físico reservable (sala, silla, cabina, máquina, camilla) | Un servicio puede requerir un recurso |
| `Appointment` | Cita agendada | Ver reglas completas en sección 5 |
| `Sale` | Venta (servicios + productos + descuentos + propinas + notas) | Puede tener múltiples pagos |
| `Payment` | Pago asociado a una venta | Método configurable por empresa |
| `CashRegister` | Caja de una sucursal | Una sola caja abierta por sucursal a la vez |
| `Commission` | Comisión calculada sobre servicio, producto, propina, bonificación o descuento | Solo sobre servicios finalizados y pagados |
| `Product` | Producto vendible (pomadas, shampoo, etc.) | Puede o no generar comisión, configurable por producto |
| `WhatsAppConversation` | Hilo de conversación de WhatsApp | Puede existir sin `Client` vinculado |
| `AuditLog` | Registro inmutable de cambios importantes | Incluye impersonación del PO |
| `License` | Ciclo de facturación de una empresa | Ver sección 2.3 |
| `Plan` | Nivel + módulos + límites | Ver sección 2.4 |

---

## 4. Reglas de negocio por dominio

### 4.1 Dominio Personas

- **Cliente:** datos mínimos por defecto (nombre, teléfono/WhatsApp), con campos adicionales (correo, documento, dirección) configurables como obligatorios por empresa si el negocio lo requiere.
- **Profesional:** puede trabajar en varias sucursales con horarios distintos por sucursal/día, pero nunca puede estar disponible en dos sucursales al mismo tiempo — la disponibilidad depende exclusivamente de los turnos/horarios ya registrados.
- **Cambio de profesional en horario:** si un profesional está ocupado a una hora, esa hora aparece bloqueada solo para él; otros profesionales siguen apareciendo disponibles a la misma hora.
- **Historial del cliente:** se guarda todo (servicios, profesionales, productos, observaciones, fotos, cancelaciones, inasistencias) como línea de tiempo.

### 4.2 Dominio Agenda (el corazón del sistema)

**Jornada laboral:** cada profesional tiene una agenda configurable (horarios variables por día), con opción adicional de definir jornadas predefinidas (ej. un botón para fijar "trabaja de 6 a 8") para agilizar la configuración. Configurable si el propio profesional puede proponer su horario (sujeto a aprobación de un cajero/superior) o si solo el administrador lo define.

**Bloqueos:** se crean bloqueos explícitos sobre la agenda (almuerzo, capacitación, vacaciones, reunión) en vez de eliminar horario. Las vacaciones registradas bloquean automáticamente la agenda del profesional en ese rango.

**Estados de la cita (`Appointment`)** — 8 estados:

```
Pendiente → Confirmada → En espera → En atención → Finalizada
Cancelada
No asistió
Reagendada
```

**Cambios sobre una cita:**
- Puede cambiar de profesional (configurable por empresa, el Platform Owner define si una empresa puede o no permitirlo); el cambio queda registrado en el historial con quién lo hizo.
- Puede cambiar de servicio mientras no esté finalizada.

**Overbooking:** nunca se permite doble reserva para el mismo profesional/horario; sí pueden coexistir citas simultáneas con profesionales distintos. La política exacta de sobrecupo es configurable por empresa, pero el bloqueo real siempre ocurre a nivel de profesional según sus turnos registrados.

**Tiempo entre citas:** cada servicio define su duración + un tiempo de preparación/limpieza adicional (buffer), configurable.

**Inasistencia (No-show):** se registra el estado "No asistió" en el historial del cliente y se incrementa un contador; superado cierto umbral, el sistema puede alertar al negocio.

**Profesional con incapacidad/ausencia imprevista:** el sistema debe proponer automáticamente horarios y profesionales alternativos disponibles para las citas afectadas.

**Recordatorios:** configurables en momento y cantidad (ej. 48h, 24h, 3h, 30min antes).

**Lista de espera:** si no hay cupo, el cliente queda en espera; al liberarse un horario, se le ofrece automáticamente.

**Confirmación de la cita:** configurable por empresa entre automática o manual.

**Reserva:** configurable entre quedar reservada de inmediato o requerir aprobación del negocio.

**Quién puede agendar:** tanto el cliente desde el portal público como el staff desde el panel administrativo.

**Quién puede cancelar:** configurable — el negocio, el cliente, o ambos.

**Horarios especiales / festivos:** existe un calendario de excepciones (ej. 24 y 31 de diciembre) por empresa.

**Servicios con dos profesionales o con recurso requerido:** soportado y configurable (ej. peinado de novia con dos profesionales; masaje que requiere una sala).

### 4.3 Dominio Comercial

- **Caja:** una sola caja abierta por sucursal (nunca varias cajas simultáneas en la misma sucursal).
- **Venta:** puede incluir servicios, productos, descuentos, propinas, notas, y (a futuro) impuestos. Una venta admite **múltiples pagos** (ej. 50% efectivo + 50% transferencia).
- **Métodos de pago:** configurables por empresa; por defecto solo **efectivo y transferencia** habilitados, con opción de habilitar el resto (Nequi, Daviplata, tarjeta, crédito, otro) de una sola vez.
- **Propinas:** configurable por empresa si existen, si afectan la comisión y a quién pertenecen.
- **Comisiones:** motor de reglas, no limitado a un porcentaje único global. Se puede definir por servicio y por producto **de forma independiente**, en porcentaje o en valor fijo (mostrando la equivalencia entre ambos), y se calcula **solo sobre servicios finalizados y pagados**.
  - **Comisión de producto:** viene **deshabilitada por defecto**; la empresa la activa y decide si aplica al profesional que vendió el producto o solo queda para el negocio.
  - Puede calcularse también sobre propina, bonificación y descuento como conceptos adicionales.

### 4.4 Dominio Catálogo

- **Servicio:** creado por cada empresa (nunca global). Puede requerir uno o dos profesionales, y puede requerir un recurso.
- **Categoría de servicio:** propia de cada empresa (nunca global).
- **Recurso:** entidad genérica (sala, silla, cabina, máquina, camilla) — mismo modelo, distinto nombre según el negocio.
- **Producto:** vendible; puede o no generar comisión, de forma configurable por producto.

### 4.5 Dominio Comunicación

- **WhatsApp:** módulo desacoplado del resto del sistema mediante eventos internos (Agenda no llama directamente a WhatsApp; publica eventos como `AppointmentCreated` y el módulo de WhatsApp reacciona). Empieza con integración no oficial tipo QR (similar a WhatsApp Web), pensada para migrar a la API oficial en el futuro sin rediseñar el resto del sistema.
  - Concebido como un **centro de conversaciones tipo CRM**: cada conversación puede crear un cliente, crear una cita, consultar historial, reagendar, cancelar y enviar recordatorios, todo desde la misma pantalla.
  - Una conversación puede existir sin cliente identificado (`Contact`) y vincularse después.
- **Notificaciones internas:** vía WebSocket (Socket.IO), en tiempo real, para eventos como nueva cita, nuevo mensaje, cancelación o cambio de horario.

### 4.6 Dominio Configuración

Centro de configuración por empresa, agrupado así:

- **General:** idioma (default español), moneda (default COP), zona horaria, logo, nombre, colores.
- **Agenda:** confirmación automática/manual, cambio de profesional permitido, tiempo entre citas, duración mínima, horarios especiales, lista de espera.
- **Clientes:** solicitar correo/documento/dirección, permitir reservas sin registro previo.
- **Comercial:** propinas, comisiones, productos, descuentos.
- **WhatsApp:** plantillas, mensajes automáticos, recordatorios, confirmaciones.
- **Licencia:** visible solo para el Platform Owner (plan, límites, comportamiento de vencimiento).

**Multi-zona horaria:** la empresa define una zona horaria por defecto; cada sucursal puede sobreescribirla. Todos los timestamps se almacenan siempre en UTC; la conversión a la zona horaria correspondiente ocurre únicamente en la capa de aplicación (nunca se guarda hora local en base de datos).

### 4.7 Transversales (aplican a todos los dominios)

- **Auditoría:** se registra todo cambio importante (quién, qué, cuándo). Incluye impersonación del Platform Owner (ver 1.2).
- **Papelera:** los elementos eliminados van a una papelera con período de retención, nunca borrado inmediato.
- **Backup:** exportación de información + backup automático.
- **Importación/Exportación:** importar datos (clientes, servicios, productos) desde Excel/CSV; exportar en Excel, PDF y CSV.
- **Historial/línea de tiempo:** cada entidad relevante (cliente, profesional, venta, cita, licencia, conversación) mantiene su propia línea de tiempo de eventos.

---

## 5. Requisitos no funcionales

- **Multi-tenancy:** una única base de datos PostgreSQL compartida; aislamiento lógico obligatorio por `company_id` en cada tabla relevante (ver estrategia técnica en [02_Architecture.md](02_Architecture.md)).
- **Seguridad:** JWT + Refresh Tokens; autenticación inicial solo con correo+contraseña (arquitectura preparada para añadir OAuth más adelante).
- **Disponibilidad:** 100% online, sin soporte offline en el MVP.
- **Internacionalización:** idioma y moneda configurables por empresa, con español y COP como valores por defecto.
- **Tiempo real:** actualizaciones vía WebSocket para agenda, caja y conversaciones de WhatsApp.
- **API pública:** arquitectura preparada desde el diseño, aunque no se active ni se use activamente durante el MVP.
- **UX:** interfaz agrupada en secciones (Operación, Comercial, Catálogo, Comunicación, Administración) para que el sistema se sienta simple aunque internamente existan muchos dominios.

---

## 6. Fuera de alcance del MVP

Ver el detalle de versiones en [03_Roadmap.md](03_Roadmap.md). Quedan fuera de la Beta: inventario completo (entradas/salidas/consumo/ajustes/compras/traslados), fidelización y puntos, lista de espera formal, automatizaciones avanzadas, API pública activa, integraciones externas, IA conversacional, marketplace/plugins, analítica avanzada, facturación electrónica, contabilidad completa, nómina compleja, app móvil, modo offline, White Label, login de clientes en el portal público, autenticación OAuth.

---

**Documento siguiente:** [02_Architecture.md](02_Architecture.md)
