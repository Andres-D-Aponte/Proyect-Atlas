# Module Prompt — Etapa 1: Inicialización

**Precondición:** haber leído [`prompts/master_prompt.md`](../master_prompt.md) completo.
**Roadmap:** [`docs/03_Roadmap.md`](../../docs/03_Roadmap.md) → Etapa 1.
**Backlog:** [`docs/04_Backlog.md`](../../docs/04_Backlog.md) → Épica 1.
**Arquitectura de referencia:** [`docs/02_Architecture.md`](../../docs/02_Architecture.md), secciones 2 a 4 y 14.

---

## 1. Objetivo de esta etapa

Dejar el proyecto **vacío pero perfectamente organizado**: sin lógica de negocio, sin entidades de dominio todavía, solo el esqueleto técnico sobre el que se construirán las etapas siguientes. Al finalizar esta etapa no debe existir ninguna entidad de negocio (`Company`, `User`, etc.) — eso empieza en la Etapa 2.

## 2. Alcance exacto de esta etapa

Incluye:

- Estructura de carpetas del backend (NestJS) organizada por dominios, tal como se define en `docs/02_Architecture.md` sección 3: `platform/`, `people/`, `scheduling/`, `commerce/`, `catalog/`, `communication/`, `settings/`, `shared/`.
- Estructura de carpetas del frontend (Angular standalone) con `core/` y `shared/`.
- `docker-compose` con los servicios `backend`, `postgres` y `frontend`.
- Prisma inicializado y conectado a PostgreSQL, con `schema.prisma` vacío (sin modelos de negocio todavía) pero funcional.
- Configuration Module de NestJS (variables de entorno tipadas, sin `process.env` disperso).
- ESLint + Prettier + Husky (pre-commit) configurados en backend y frontend.
- Un endpoint de salud (`GET /health`) que confirme que el backend está vivo y conectado a la base de datos.
- Esqueleto de Swagger/OpenAPI servido (aunque documente solo el endpoint de salud por ahora).

**No** incluye (queda para etapas posteriores): autenticación, cualquier entidad de negocio, cualquier regla de negocio del PRD, CI/CD real (solo el esqueleto de configuración si aplica, sin pipelines complejos).

## 3. Criterios de aceptación (de `docs/04_Backlog.md`, Épica 1)

- El backend NestJS compila y arranca sin errores.
- `GET /health` responde correctamente y verifica conexión activa a PostgreSQL.
- La app Angular sirve una pantalla base sin errores de consola.
- `docker compose up` levanta los tres servicios y quedan comunicados entre sí (backend alcanza postgres; frontend alcanza backend).
- `prisma migrate dev` corre sin errores contra la base de datos del compose.
- Un commit con errores de lint es rechazado por el hook de pre-commit (Husky).

## 4. Restricciones de arquitectura a respetar

- Backend: TypeScript estricto (`strict: true`), NestJS idiomático (nada de Express plano disfrazado).
- La estructura de carpetas debe reflejar los dominios ya definidos — no crear una carpeta `modules/` genérica ni mezclar responsabilidades de distintos dominios en una sola carpeta.
- El Configuration Module debe centralizar el acceso a variables de entorno; ningún otro archivo debe leer `process.env` directamente.
- Aunque no existan entidades de negocio todavía, dejar preparada (sin implementar) la convención de que todo modelo Prisma con datos de empresa incluirá `companyId` desde la Etapa 3 en adelante — no es necesario crear el campo ahora, solo no bloquearlo estructuralmente.

## 5. Antes de implementar

Sigue el flujo obligatorio del Master Prompt (sección 3): entender, identificar módulos afectados (en este caso, ninguno de negocio — es puramente infraestructura), explicar la estrategia, identificar riesgos (ej. elegir mal la versión de Node/Nest/Prisma puede generar fricción luego), identificar impacto arquitectónico (ninguno, es la base), y solo entonces implementar.

## 6. Definition of Done de esta etapa

- Todos los criterios de aceptación de la sección 3 cumplidos.
- Sin errores de consola en frontend ni backend.
- Estructura de carpetas revisada y coincide con `docs/02_Architecture.md`.
- Documentación mínima de esta etapa (un `README.md` de arranque: cómo levantar el entorno con Docker, cómo correr migraciones, cómo correr lint).
- Aprobación explícita del usuario antes de pasar a la Etapa 2 — Autenticación.
