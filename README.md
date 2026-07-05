# Atlas

Plataforma SaaS multiempresa para negocios de servicios por cita (barberías, spas, estudios de uñas y similares). "Atlas" es un nombre de trabajo temporal.

Este repositorio va por la **Etapa 4 — Configuración inicial del negocio** del roadmap.

## Documentación

Antes de tocar código, lee en orden:

1. [`docs/00_Project_Charter.md`](docs/00_Project_Charter.md)
2. [`docs/01_Product_Requirements_Document.md`](docs/01_Product_Requirements_Document.md)
3. [`docs/02_Architecture.md`](docs/02_Architecture.md)
4. [`docs/03_Roadmap.md`](docs/03_Roadmap.md)
5. [`docs/04_Backlog.md`](docs/04_Backlog.md)

**Para aprender a compilar, levantar, probar e inspeccionar el proyecto paso a paso** (incluye cómo ver las tablas de la base de datos), ver [`docs/05_Practical_Guide.md`](docs/05_Practical_Guide.md) — es un documento vivo que se amplía con cada etapa nueva.

El contexto para cualquier IA de desarrollo está en [`prompts/master_prompt.md`](prompts/master_prompt.md) y, por etapa, en `prompts/modules/`. La documentación funcional/técnica de cada módulo ya construido vive en `docs/modules/`.

## Estructura del repositorio

```text
Proyect Atlas/
├── docs/                 # Documentación oficial del producto
├── prompts/              # Master Prompt y Module Prompts para la IA de desarrollo
├── backend/               # API NestJS (monolito modular por dominios)
├── frontend/              # Angular
└── docker-compose.yml     # Entorno de desarrollo local
```

## Stack

Angular · NestJS · PostgreSQL · Prisma · Socket.IO · JWT + Refresh Tokens · Docker.

## Levantar el entorno de desarrollo

Requisitos: Docker Desktop.

```bash
docker compose up -d
```

Esto levanta tres servicios:

| Servicio | URL |
|---|---|
| Backend (API) | http://localhost:3000 |
| Backend — health check | http://localhost:3000/health |
| Backend — Swagger/OpenAPI | http://localhost:3000/api/docs |
| Frontend (Angular) | http://localhost:4200 |
| PostgreSQL | `localhost:5433` (usuario/clave/BD: ver `docker-compose.yml`) — se usa 5433 para no chocar con un PostgreSQL nativo en 5432 |

Para bajar el entorno:

```bash
docker compose down
```

### Migraciones de Prisma

Con el entorno levantado, ejecutar migraciones dentro del contenedor del backend:

```bash
docker compose exec backend npx prisma migrate dev
```

### Desarrollo sin Docker (opcional)

Cada proyecto puede correrse de forma independiente si ya tienes Node 22+ instalado:

```bash
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm start
```

Para el backend fuera de Docker, necesitas un PostgreSQL local y un `backend/.env` (ver `backend/.env.example`) apuntando a él.

## Calidad de código

- `npm run lint` en `backend/` y en `frontend/`.
- `npm test` en `backend/` (Jest) y en `frontend/` (Vitest vía Angular CLI).
- Un hook de pre-commit (Husky + lint-staged, configurado en la raíz del repo) bloquea automáticamente cualquier commit con errores de lint en archivos `.ts` de `backend/` o `frontend/`.

## Metodología

Este proyecto sigue documentación-primero y desarrollo incremental módulo por módulo, con Quality Gates obligatorios entre etapas. Ver `docs/03_Roadmap.md` sección 6 y `prompts/master_prompt.md` sección 4.
