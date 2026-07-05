# 00 — Project Charter

**Proyecto:** Atlas (nombre de trabajo, temporal)
**Estado:** Aprobado para iniciar documentación técnica y desarrollo
**Última actualización:** 2026-07-05

> El branding ("Atlas") debe estar completamente aislado de la lógica de negocio y del modelo de datos. Ningún identificador técnico, tabla, endpoint o regla de negocio debe depender del nombre del producto, de forma que renombrar el producto en el futuro sea un cambio puramente cosmético (logo, textos, dominio) y nunca un cambio arquitectónico.

---

## 1. Visión del producto

Atlas es una **plataforma SaaS multiempresa (multi-tenant)** para la gestión operativa diaria de negocios de servicios por cita: barberías, peluquerías, spas, estudios de uñas, clínicas estéticas y negocios similares.

Atlas nació de la idea de un sistema para una barbería específica, pero fue diseñado desde el primer día para ser **genérico**: el dominio nunca habla de "barberos" ni "cortes", habla de **Profesionales** y **Servicios**. Cualquier negocio que opere agendando citas con profesionales y cobrando por servicios puede operar sobre Atlas sin cambios de arquitectura, solo de configuración y catálogo.

## 2. Problema que resuelve

La mayoría de estos negocios gestionan su operación diaria con planillas de Excel, cuadernos o WhatsApp desordenado. Esto genera:

- Pérdida de citas y dobles reservas.
- Falta de control sobre comisiones de profesionales.
- Ausencia de historial de clientes y ventas.
- Una imagen poco profesional frente al cliente final.

Atlas reemplaza todo eso con un sistema centralizado, con agenda en tiempo real, caja, comisiones automáticas y un canal de comunicación con clientes (WhatsApp) integrado al flujo del negocio.

## 3. A quién está dirigido

- **Negocios de servicios por cita** de pequeño y mediano tamaño (1 a varias sucursales), en un inicio principalmente barberías, spas y estudios de uñas/belleza.
- Dentro de cada negocio, tres perfiles de usuario: **administrador del negocio**, **staff operativo** (recepción/caja, profesionales) y, a nivel de toda la plataforma, el **Platform Owner** (el dueño de Atlas).

## 4. Qué NO es Atlas (non-goals explícitos)

Atlas **no** es, al menos durante el MVP y probablemente nunca dentro de su núcleo:

- Un ERP.
- Un sistema de contabilidad completa.
- Un sistema de facturación electrónica.
- Un sistema de nómina empresarial compleja.
- Una aplicación móvil nativa.
- Un sistema con soporte offline.
- Un producto White Label (marca blanca).

Toda funcionalidad que empuje a Atlas hacia alguno de estos escenarios debe cuestionarse activamente antes de implementarse, sin importar cuán razonable parezca en el momento.

## 5. Modelo de negocio

Atlas se monetiza mediante **suscripción por licencia**, vendida por el Platform Owner directamente a cada empresa cliente. Cadencias soportadas: mensual, trimestral, semestral, anual y licencias de prueba (trial). El Platform Owner administra empresas, licencias, planes y límites desde un panel propio, separado del panel operativo de cada negocio.

Los planes combinan **niveles** (ej. Starter/Pro/Enterprise) **y módulos opcionales activables** (ej. WhatsApp, Inventario avanzado, Multi-sucursal). Los planes afectan **módulos disponibles y límites de uso**, pero **nunca los permisos**, que dependen exclusivamente del rol del usuario.

No habrá White Label: cada empresa puede personalizar su logo, nombre, colores y redes sociales dentro de su propio catálogo/portal público, pero la marca "Atlas" (o el nombre final del producto) debe permanecer siempre visible en la experiencia, para favorecer el reconocimiento de marca y el crecimiento orgánico (boca a boca entre negocios).

## 6. Principios rectores del producto

Estos cinco principios gobiernan cualquier decisión de diseño o priorización durante todo el ciclo de vida de Atlas:

1. **Configurable antes que rígido** — toda regla de negocio que legítimamente varíe entre empresas debe ser parametrizable por empresa (y en algunos casos por el Platform Owner).
2. **Inteligente por defecto** — el sistema debe ser usable desde el minuto uno, con valores por defecto sensatos (moneda COP, idioma español, métodos de pago efectivo+transferencia), sin exigir configuración previa extensa.
3. **Escalable** — aunque el MVP sea reducido, la arquitectura debe soportar crecer a miles de empresas sin rediseño (multiempresa, multisucursal, eventos internos, auditoría, API preparada).
4. **Modular** — el sistema se organiza en dominios de negocio aislados, nunca en archivos o controladores monolíticos gigantes.
5. **SaaS First** — toda decisión debe superar la pregunta: *¿esto seguiría funcionando bien con 2.000 empresas usando Atlas simultáneamente?*

### Principio #1 — MVP First (el principio más importante)

> El objetivo no es construir el sistema definitivo. El objetivo es construir una primera versión (Beta) pequeña, sólida, estable y fácil de aprender, que resuelva el 80% de los problemas diarios de un negocio de servicios.

Toda funcionalidad nueva debe justificar su lugar en la versión actual respondiendo:

- ¿Simplifica realmente el negocio del cliente?
- ¿Resuelve un problema real y frecuente?
- ¿La mayoría de los clientes la usaría?
- ¿Un cliente nuevo la entendería sin necesitar capacitación?

Si la respuesta a alguna de estas preguntas es "no" o "no está claro", la funcionalidad se documenta en el backlog para una versión futura, pero **no se construye ahora**. Ver [03_Roadmap.md](03_Roadmap.md) para el detalle de qué entra en cada versión.

### Principio de configurabilidad

No todo debe ser configurable. Solo se convierte en ajuste de configuración aquello que **legítimamente varía entre empresas y afecta la operación real del negocio** (horarios, comisiones, políticas de cancelación, recordatorios, campos obligatorios, métodos de pago). Cosas como el orden de los botones o el texto de "Guardar" nunca se parametrizan. Se prefieren valores por defecto sensatos sobre pantallas de configuración que añaden complejidad sin aportar valor real.

### Principio de experiencia de usuario

La UX tiene una de las prioridades más altas del proyecto: mínimos clics posibles, interfaz moderna, limpia, profesional y rápida. La mayoría de las pantallas deben entenderse sin necesitar capacitación. Se evita activamente la complejidad típica del software empresarial, incluso si eso significa ocultar potencia interna del sistema detrás de una navegación agrupada y simple (ver agrupación de secciones en [01_Product_Requirements_Document.md](01_Product_Requirements_Document.md)).

## 7. Jerarquía de roles (resumen)

| Nivel | Rol | Resumen |
|---|---|---|
| 1 | **Platform Owner** | Dueño de Atlas. Administra empresas, licencias, planes y límites. Puede entrar temporalmente como Business Admin de cualquier empresa (impersonación con motivo obligatorio y auditoría inmutable). |
| 2 | **Business Admin** | Administrador del negocio cliente. Configura su empresa, sucursales, profesionales, horarios, usuarios y reglas permitidas por su plan. |
| 3 | **Staff** | Recepcionista/Cajero, Profesional, Supervisor — permisos operativos específicos por rol. |

Detalle completo de permisos en [01_Product_Requirements_Document.md](01_Product_Requirements_Document.md).

## 8. Alcance de la primera versión (Beta/MVP)

La Beta cubre únicamente los dominios imprescindibles para operar un negocio de servicios por cita de principio a fin: autenticación y roles, gestión de empresas/licencias (Platform Owner), configuración inicial del negocio, usuarios, servicios, clientes, **agenda** (el corazón del sistema), tiempo real, ventas y caja, WhatsApp, dashboard y reportes básicos. El detalle etapa por etapa está en [03_Roadmap.md](03_Roadmap.md); el detalle funcional completo está en [01_Product_Requirements_Document.md](01_Product_Requirements_Document.md).

Quedan explícitamente fuera de la Beta (ver roadmap para cuándo se incorporan): inventario completo, fidelización/puntos, lista de espera formal, automatizaciones avanzadas, API pública activa, IA conversacional, marketplace/plugins, analítica avanzada.

## 9. Metodología de desarrollo (resumen)

Atlas se construye siguiendo un proceso de **documentación primero, código después**, con desarrollo **incremental módulo por módulo** y **quality gates** obligatorios. Ningún módulo avanza sin aprobación explícita del anterior. El detalle completo de la metodología, ciclo de vida de cada módulo y reglas de oro (sin dependencias hacia adelante, análisis de impacto antes de modificar un módulo aprobado) vive como conocimiento de proceso del proyecto y se aplica transversalmente a todos los documentos siguientes.

Flujo documental → desarrollo:

```
Business Analysis (completado)
        ↓
Documentación oficial (este documento + 01 a 04)
        ↓
Master Prompt (contexto global para la IA de desarrollo)
        ↓
Module Prompt (uno por módulo, en el momento de construirlo)
        ↓
Desarrollo del módulo (Análisis → Implementación → Pruebas unitarias →
Pruebas manuales → Corrección → Aprobación → Merge → Regresión → Siguiente módulo)
```

## 10. Rol de la IA en este proyecto

A partir de esta fase, la IA asignada al proyecto actúa como **Product Architect, Software Architect, Technical Lead, Senior NestJS Engineer, Senior Angular Engineer, Database Architect, SaaS Consultant y Quality Advisor**, con la responsabilidad de proteger el proyecto. Debe:

- Cuestionar decisiones técnicas pobres y explicar por qué antes de implementar algo que amenace arquitectura, escalabilidad, simplicidad, UX o la visión de negocio.
- Nunca cambiar una decisión de negocio ya aprobada sin autorización explícita del dueño del producto.
- Antes de cada implementación: entender la solicitud → identificar módulos afectados → explicar la estrategia → identificar riesgos → identificar impacto arquitectónico → esperar aprobación si aplica → implementar.

## 11. Glosario esencial (ampliado en el PRD)

| Término de negocio (ES) | Entidad técnica (EN) | Nota |
|---|---|---|
| Empresa | `Company` | Tenant raíz, dueño de todos sus datos |
| Sucursal | `Branch` | Una empresa puede tener varias |
| Profesional | `Professional` | Nunca "Barbero"; puede existir sin usuario |
| Cliente | `Client` | Historial aislado por empresa |
| Contacto | `Contact` | Persona que escribe por WhatsApp antes de ser cliente |
| Usuario | `User` | Cuenta de acceso al sistema (staff, admin, PO) |
| Servicio | `Service` | Nunca "Corte"; catálogo propio por empresa |
| Cita | `Appointment` | Entidad central del dominio Agenda |
| Venta | `Sale` | Puede incluir servicios, productos, descuentos, propinas |
| Comisión | `Commission` | Motor de reglas por servicio/producto |
| Licencia | `License` | Ciclo de facturación de una empresa |
| Plan | `Plan` | Nivel + módulos opcionales que determina límites y features |

---

**Documento siguiente:** [01_Product_Requirements_Document.md](01_Product_Requirements_Document.md)
