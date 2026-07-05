# 03 — Roadmap

**Proyecto:** Atlas
**Depende de:** [00_Project_Charter.md](00_Project_Charter.md), [01_Product_Requirements_Document.md](01_Product_Requirements_Document.md), [02_Architecture.md](02_Architecture.md)

Este documento define el orden de construcción de Atlas: primero las 14 etapas de la Beta (MVP), y luego el alcance de las versiones 1.0, 2.0 y 3.0. También fija las reglas de progresión que gobiernan cómo se avanza de una etapa/módulo a la siguiente (Quality Gates, dependencias, regresión).

---

## 1. Filosofía de versionado

Atlas crece en cuatro grandes versiones, siguiendo el Principio #1 (MVP First) del Project Charter:

| Versión | Objetivo |
|---|---|
| **Beta (MVP)** | Núcleo imprescindible para operar el día a día de un negocio de servicios. Pequeña, estable, fácil de aprender. |
| **1.0** | Se incorpora feedback real de los primeros negocios: inventario completo, fidelización, lista de espera formal, más reportes y configuración. |
| **2.0** | Automatizaciones, WhatsApp avanzado / posible migración a API oficial, activación real de la API pública, integraciones externas. |
| **3.0** | IA conversacional, Marketplace/plugins, analítica avanzada. |

Ninguna funcionalidad de 1.0/2.0/3.0 se adelanta a la Beta salvo que el usuario lo apruebe explícitamente y documente por qué.

---

## 2. Beta (MVP) — Etapas de desarrollo

El orden es obligatorio: cada etapa solo empieza cuando la anterior fue aprobada (Quality Gate) y ninguna etapa puede depender de una posterior (Regla de Oro, ver sección 4).

### Etapa 0 — Documentación *(fase actual)*

Salida: los 5 documentos oficiales (`00`-`04`) aprobados + Master Prompt.

### Etapa 1 — Inicialización

Backend NestJS, frontend Angular, Docker Compose, PostgreSQL, Prisma, estructura de carpetas por dominio, configuración de ESLint/Prettier/Husky, Configuration Module, esqueleto de CI. Sin lógica de negocio todavía.

### Etapa 2 — Autenticación

Login, JWT + Refresh Tokens, modelo de `User`, Guards de autenticación, RBAC básico por rol (Platform Owner, Business Admin, Supervisor, Recepcionista/Cajero, Profesional).

### Etapa 3 — Platform Owner

`Company`, `License`, `Plan`, límites configurables, comportamiento de vencimiento de licencia, mecanismo de impersonación (con motivo obligatorio y auditoría), panel del Platform Owner.

### Etapa 4 — Configuración inicial del negocio

`Branch`, datos generales de la empresa (nombre, logo, colores), horarios de sucursal, métodos de pago habilitados por defecto, zona horaria/moneda/idioma por empresa.

### Etapa 5 — Usuarios

Creación de usuarios Business Admin, Supervisor, Recepcionista/Cajero y vínculo opcional Profesional↔Usuario.

### Etapa 6 — Servicios

`ServiceCategory`, `Service` (duración, precio, buffer, recursos requeridos, uno o dos profesionales), reglas de comisión por servicio.

### Etapa 7 — Clientes

CRUD de `Client`, campos configurables obligatorios, historial/línea de tiempo del cliente.

### Etapa 8 — Agenda ⭐

El corazón del sistema: `Professional` (horarios, jornadas, bloqueos, vacaciones), `Appointment` con sus 8 estados, reglas de overbooking, cambio de profesional/servicio, no-show, lista de espera, recordatorios, calendario de excepciones/festivos.

### Etapa 9 — WebSocket (tiempo real)

Conexión autenticada por rooms de empresa/sucursal; retransmisión de eventos de Agenda en tiempo real al panel del cajero.

### Etapa 10 — Ventas y Caja

`CashRegister` (una por sucursal), `Sale` (servicios + productos + descuentos + propinas), `Payment` (múltiples pagos por venta), cálculo de `Commission` sobre servicios y productos finalizados/pagados.

### Etapa 11 — WhatsApp

Adaptador de mensajería (interfaz + primera implementación no oficial vía QR), `WhatsAppConversation`, `Contact`, eventos de Agenda escuchados para confirmaciones automáticas.

### Etapa 12 — Dashboard

Vista consolidada: ventas del día, clientes atendidos/esperando, próximos turnos, ingresos, comisiones — alimentado por los eventos de dominio ya emitidos por etapas anteriores.

### Etapa 13 — Reportes

Reportes básicos: ventas (día/semana/mes), por profesional, por servicio, por cliente, por método de pago, comisiones, caja.

---

## 3. Versión 1.0

Se prioriza según el feedback real de los primeros negocios usando la Beta:

- Inventario completo (entradas, salidas, consumo interno, ajustes, compras, traslados).
- Programa de fidelización (puntos/beneficios) — el modelo de datos ya queda preparado desde la Beta aunque no se implemente antes.
- Lista de espera formal (automatización completa de oferta de cupo liberado).
- Mejoras de reportes y más opciones de configuración según lo que pidan los primeros clientes.

## 4. Versión 2.0

- Automatizaciones adicionales sobre Agenda y WhatsApp.
- WhatsApp avanzado / evaluación de migración a la API oficial de WhatsApp Business (el adaptador ya está preparado desde ADR-005).
- Activación real de la API pública (ya preparada arquitectónicamente desde la Beta).
- Integraciones externas con otros sistemas.

## 5. Versión 3.0

- IA conversacional (respuestas automáticas en WhatsApp).
- Marketplace / plugins (arquitectura preparada desde el diseño, sin implementar antes).
- Analítica avanzada.

---

## 6. Reglas de progresión (obligatorias en toda etapa/módulo)

### Regla de Oro — sin dependencias hacia adelante

Ningún módulo se desarrolla si depende de otro que aún no existe. Ejemplo: no se construye `Commission` sin que `Sale` ya exista; no se construye `Sale` sin que `Service` ya exista. El orden de las 14 etapas de la Beta ya respeta esta regla.

### Regla de Oro — análisis de impacto antes de modificar un módulo aprobado

Ningún módulo ya aprobado se modifica sin antes analizar qué otros módulos dependen de él (ej. cambiar el modelo de `Appointment` obliga a revisar impacto en Agenda, Ventas, Comisiones, Reportes, WhatsApp, Dashboard y Auditoría).

### Ciclo de vida de cada módulo (Quality Gate)

```
Analizar módulo → Desarrollar → Pruebas unitarias → Pruebas manuales
→ Correcciones → Aprobación del usuario → Merge → Pruebas de regresión
→ Siguiente módulo
```

Un módulo no se considera terminado solo porque compile. Definition of Done: funciona correctamente, sin errores de consola, cumple las reglas de negocio del PRD, es responsive, tiene validaciones, WebSocket funcionando si aplica, auditoría, permisos correctos, pruebas, documentación propia del módulo en `docs/modules/` (objetivo, casos de uso, reglas, endpoints, eventos, permisos, pantallas, pruebas), **y su sección correspondiente añadida a [`05_Practical_Guide.md`](05_Practical_Guide.md)** (qué se construyó, cómo compilarlo/levantarlo, cómo probarlo paso a paso, qué mirar en la base de datos).

### Pruebas de regresión

Al terminar cada etapa importante, se verifica rápidamente que las etapas anteriores sigan funcionando (ej. al terminar Ventas y Caja, se revalida Login, Agenda y Clientes), antes de aprobar la nueva etapa.

### QA Funcional antes que QA Técnico

Primero se prueba como lo haría un usuario real completando un flujo de principio a fin (ej. recepcionista: crear cliente → crear cita → mover cita → cobrar → cerrar caja). Después se hace QA técnico buscando casos límite: reservas simultáneas, pérdida de conexión WebSocket, token vencido, permisos incorrectos, inyección SQL, XSS, etc.

---

**Documento siguiente:** [04_Backlog.md](04_Backlog.md)
