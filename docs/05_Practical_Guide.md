# 05 — Guía Práctica y de Aprendizaje

**Proyecto:** Atlas
**Para quién es este documento:** para ti. La idea es que puedas leerlo de arriba a abajo y quedar en capacidad de compilar, levantar, probar e inspeccionar el proyecto como si lo hubieras programado tú mismo, sin depender de recordar comandos sueltos de la conversación.

**Cómo se mantiene:** este documento crece **una sección por etapa**, en el mismo orden del roadmap ([`03_Roadmap.md`](03_Roadmap.md)). Cada vez que termine una etapa nueva, le agrego su propia sección al final con: qué se construyó, cómo compilarlo/probarlo y qué mirar en la base de datos. Las secciones de "Fundamentos" de más abajo casi no cambian; son la base que no depende de la etapa.

---

## Fundamentos (leer una sola vez)

### ¿Qué es cada pieza que vas a levantar?

- **PostgreSQL**: la base de datos. Corre dentro de un contenedor Docker.
- **Backend (NestJS)**: la API. También corre en un contenedor Docker, y se conecta a PostgreSQL.
- **Frontend (Angular)**: lo que eventualmente verás en el navegador. Por ahora (Etapa 1-2) es solo una pantalla de marcador de posición.
- **Prisma**: la herramienta que traduce entre el código TypeScript del backend y las tablas reales de PostgreSQL. Cuando cambiamos el modelo de datos (`backend/prisma/schema.prisma`), Prisma genera una "migración" (un archivo SQL) y lo aplica a la base de datos.
- **Docker Compose**: el archivo `docker-compose.yml` en la raíz del proyecto describe los tres servicios de arriba y cómo se conectan entre sí. Es lo único que necesitas levantar para tener todo el entorno funcionando.

### Requisito único

Tener **Docker Desktop** instalado y abierto. Todo lo demás (Node, Postgres, etc.) vive dentro de los contenedores — no necesitas instalar Node ni Postgres en tu máquina para que el proyecto funcione (aunque si quieres correr comandos sueltos como `npm run lint` desde tu terminal, sí ayuda tener Node instalado localmente, que es tu caso).

### Cómo se creó la base de datos (para que no sea magia)

En `docker-compose.yml`, el servicio `postgres` se define así, en resumen:

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: atlas
    POSTGRES_PASSWORD: atlas_dev_password
    POSTGRES_DB: atlas
  ports:
    - '5433:5432'
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

Lo que pasa la primera vez que este contenedor arranca:

1. Docker descarga la imagen oficial de PostgreSQL 16.
2. Como es la primera vez (el volumen `postgres_data` está vacío), Postgres se auto-inicializa creando un usuario `atlas`, una contraseña `atlas_dev_password` y una base de datos llamada `atlas`.
3. Ese volumen (`postgres_data`) es una carpeta que Docker administra por fuera de tu proyecto; es lo que hace que **tus datos sobrevivan** aunque apagues y prendas los contenedores. Solo se borra si haces `docker compose down -v` (el `-v` es el que borra volúmenes) o si eliminas el volumen a mano.
4. El puerto se expone como `5433` hacia tu máquina (no `5432`) porque detectamos que ya tienes un PostgreSQL nativo de Windows corriendo en el 5432 — así evitamos que choquen. Internamente, dentro de Docker, el backend sigue hablándole a Postgres por el puerto estándar 5432 (eso no lo notas tú, es tráfico entre contenedores).

Después de que el contenedor existe, **las tablas** las crea Prisma, no Postgres por sí solo: corremos `prisma migrate dev`, que lee `backend/prisma/schema.prisma`, genera un archivo SQL dentro de `backend/prisma/migrations/` y lo ejecuta contra la base `atlas`. Cada vez que agregamos una entidad nueva (como `User` en la Etapa 2), se genera una migración nueva — es un historial versionado de cómo ha cambiado la base de datos, carpeta por carpeta, con fecha en el nombre.

### Cómo levantar todo el entorno desde cero

Desde la raíz del proyecto (`Proyect Atlas/`):

```bash
docker compose up -d --build
```

- `-d` = en segundo plano (no bloquea tu terminal).
- `--build` = reconstruye las imágenes si cambiaste código o dependencias (`package.json`). Si no cambiaste nada desde la última vez, puedes omitirlo y usar solo `docker compose up -d`.

Verifica que los tres servicios estén sanos:

```bash
docker compose ps
```

Deberías ver `proyectatlas-postgres-1` (healthy), `proyectatlas-backend-1` y `proyectatlas-frontend-1`, todos "Up".

Para ver los logs en vivo de un servicio (útil si algo no arranca):

```bash
docker compose logs backend --tail 50 -f
```

(`Ctrl+C` para salir de los logs; los contenedores siguen corriendo).

Para apagar todo (sin borrar datos):

```bash
docker compose down
```

Para apagar todo **y borrar los datos de la base** (empezar de cero de verdad):

```bash
docker compose down -v
```

### Cómo saber que el backend está vivo

```bash
curl http://localhost:3000/health
```

Debería responder algo como:

```json
{"status":"ok","database":"up","timestamp":"..."}
```

Si `database` no dice `"up"`, el backend está corriendo pero no logra hablar con Postgres (revisa `docker compose logs postgres`).

### Explorar y probar la API sin escribir código

En `http://localhost:3000/api/docs` tienes **Swagger**: una página interactiva con todos los endpoints del backend. Puedes expandir cualquier endpoint, darle "Try it out", llenar el cuerpo de la petición y ejecutarlo desde el navegador, sin necesitar Postman ni curl. Es la forma más cómoda de probar cosas manualmente a medida que agregamos endpoints.

### Ver el frontend

`http://localhost:4200` en el navegador. Por ahora solo verás el texto "Atlas — Plataforma en construcción" (Etapa 1). Esto va a ir cambiando a medida que construyamos pantallas reales.

---

## Cómo ver las tablas y los datos de la base de datos

Tienes tres formas, de más cómoda a más manual. Con cualquiera de las tres ves exactamente lo mismo (es la misma base de datos).

### Opción A — Prisma Studio (recomendada)

Es una interfaz web que viene incluida con Prisma: te muestra cada tabla como una hoja de cálculo, con capacidad de filtrar, editar y borrar filas a mano. No necesitas instalar nada adicional.

Con el entorno levantado (`docker compose up -d`), desde tu terminal:

```bash
cd backend
npx prisma studio
```

Esto abre automáticamente `http://localhost:5555` en tu navegador. Ahí vas a ver, por ejemplo (desde la Etapa 2), las tablas `users` y `refresh_tokens` con sus columnas y filas reales.

> Nota: esto corre en tu máquina (no dentro de Docker), por eso usa el `DATABASE_URL` de `backend/.env`, que ya apunta a `localhost:5433` — el puerto que Docker expone hacia tu equipo.

### Opción B — `psql` dentro del contenedor

Si prefieres línea de comandos:

```bash
docker compose exec postgres psql -U atlas -d atlas
```

Una vez dentro, comandos útiles de `psql`:

```sql
\dt              -- lista todas las tablas
\d users         -- describe la estructura de la tabla "users"
SELECT * FROM users;
SELECT * FROM refresh_tokens;
\q               -- salir
```

### Opción C — Un cliente gráfico externo (DBeaver, TablePlus, pgAdmin)

Como ya tienes un PostgreSQL nativo instalado, es posible que también tengas **pgAdmin** en tu equipo. Puedes agregar una nueva conexión con estos datos:

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5433` |
| Usuario | `atlas` |
| Contraseña | `atlas_dev_password` |
| Base de datos | `atlas` |

Con eso deberías poder navegar el esquema `public` y ver todas las tablas igual que con las otras dos opciones.

---

## Cómo correr las pruebas automatizadas

Desde `backend/`:

```bash
npm test              # pruebas unitarias (no necesitan Docker corriendo)
npm run test:e2e       # pruebas de punta a punta (SÍ necesitan Postgres corriendo)
npm run lint           # revisa estilo y errores de código
```

Para `test:e2e`, como mínimo necesitas Postgres arriba (no hace falta el backend en Docker, las pruebas e2e levantan su propia instancia de la app en memoria):

```bash
docker compose up -d postgres
npm run test:e2e
```

Desde `frontend/`:

```bash
npm test               # pruebas unitarias (Vitest)
npm run lint
npm run build
```

---

## Registro por etapas

### Etapa 1 — Inicialización

**Qué se construyó:** el esqueleto técnico. Backend NestJS, frontend Angular, Docker Compose, Prisma sin ninguna tabla de negocio todavía, ESLint/Prettier/Husky.

**Cómo compilar:**

```bash
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
```

(o, más simple, `docker compose build`, que hace ambas cosas dentro de las imágenes).

**Cómo probar manualmente:**

1. `docker compose up -d --build`
2. `curl http://localhost:3000/health` → debe responder `{"status":"ok","database":"up",...}`.
3. Abrir `http://localhost:4200` → debe verse el placeholder "Atlas".
4. Abrir `http://localhost:3000/api/docs` → debe verse Swagger con el endpoint `/health`.

**Qué mirar en la base de datos:** nada todavía — el schema estaba vacío a propósito (ver `docs/03_Roadmap.md` Etapa 1). Si corres Prisma Studio en esta etapa, verías una base de datos sin tablas de negocio.

---

### Etapa 2 — Autenticación

**Qué se construyó:** login con correo/contraseña, JWT de acceso + refresh token rotable, control de acceso por rol. Detalle completo en [`docs/modules/02_autenticacion.md`](modules/02_autenticacion.md).

**Cómo compilar:** igual que en la Etapa 1 (no cambió la forma de compilar, solo se agregó código nuevo dentro del backend).

**Paso a paso para probarlo tú mismo, desde cero:**

1. Levanta el entorno:
   ```bash
   docker compose up -d --build
   ```
2. Aplica la migración de esta etapa (crea las tablas `users` y `refresh_tokens`) si es la primera vez que levantas esta base de datos:
   ```bash
   docker compose exec backend npx prisma migrate dev
   ```
   Si las tablas ya existen (porque ya las habías migrado antes), este comando no hace nada — es seguro correrlo siempre.
3. Crea el primer usuario (Platform Owner). Las credenciales de desarrollo están en `backend/.env` (`SEED_PLATFORM_OWNER_EMAIL` / `SEED_PLATFORM_OWNER_PASSWORD`):
   ```bash
   docker compose exec backend npm run db:seed
   ```
4. Inicia sesión (desde Swagger en `/api/docs`, endpoint `POST /auth/login`, "Try it out"; o por terminal):
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"owner@atlas.dev","password":"ChangeMe123!"}'
   ```
   Te responde un `accessToken` (dura 15 minutos) y un `refreshToken` (dura 30 días).
5. Usa el `accessToken` para consultar quién eres:
   ```bash
   curl http://localhost:3000/auth/me -H "Authorization: Bearer TU_ACCESS_TOKEN_AQUI"
   ```
   Debe devolver tu `id`, `email` y `role` (`PLATFORM_OWNER`).
6. (Opcional, para curiosos) Copia el `accessToken` y pégalo en [jwt.io](https://jwt.io) — vas a ver, sin necesidad de decodificarlo tú mismo, que por dentro contiene tu `id`, `email`, `role` y la fecha de expiración. Así es como el backend sabe quién eres sin consultar la base de datos en cada petición.
7. Cuando el `accessToken` expire (15 min), usa el `refreshToken` para obtener un par nuevo, sin volver a poner tu contraseña:
   ```bash
   curl -X POST http://localhost:3000/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"TU_REFRESH_TOKEN_AQUI"}'
   ```
   Fíjate que el `refreshToken` que te devuelve es **distinto** al que enviaste — se rota en cada uso. Si intentas reusar el viejo, te va a rechazar con un error 401.

**Qué mirar en la base de datos (con Prisma Studio, ver sección de arriba):**

- Tabla `users`: tu usuario Platform Owner, con su `passwordHash` (nunca la contraseña en texto plano — fíjate que es un texto largo sin sentido, eso es un hash bcrypt). El `id` es un número entero que empieza en 1 y sube (1, 2, 3...) — todas las tablas de Atlas usan llaves primarias seriales, no UUID.
- Tabla `refresh_tokens`: vas a ver una fila por cada login/refresh que hiciste. Los que ya usaste van a tener `revokedAt` con una fecha (revocados); solo el más reciente tendrá `revokedAt` en `null` (activo). Tampoco vas a ver el refresh token real ahí — solo su `tokenHash`, por la misma razón que la contraseña: si alguien accede a la base de datos, no puede reconstruir el token original.

**Pruebas automatizadas de esta etapa:**

```bash
cd backend
npm test          # 18 pruebas unitarias (AuthService, RefreshTokenService, RolesGuard, HealthService)
docker compose up -d postgres
npm run test:e2e  # 8 pruebas de punta a punta (login, refresh, permisos por rol, /auth/me)
```

---

### Etapa 3 — Platform Owner

**Qué se construyó:** planes, empresas, licencias e impersonación (entrar como Business Admin de una empresa, con motivo obligatorio y auditoría). Detalle completo en [`docs/modules/03_platform_owner.md`](modules/03_platform_owner.md).

**Cómo compilar:** igual que siempre. Si vienes de la Etapa 2, hay una migración nueva que aplicar (ver paso 2 abajo).

**Paso a paso para probarlo tú mismo, desde cero:**

1. Levanta el entorno y aplica las migraciones (si ya tenías la base de la Etapa 2, esto solo añade las tablas nuevas):
   ```bash
   docker compose up -d --build
   docker compose exec backend npx prisma migrate dev
   docker compose exec backend npm run db:seed
   ```
2. Inicia sesión como Platform Owner (igual que en la Etapa 2) y guarda el `accessToken`.
3. Crea un plan:
   ```bash
   curl -X POST http://localhost:3000/platform/plans \
     -H "Authorization: Bearer TU_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Pro","enabledModules":["whatsapp"],"maxUsers":10}'
   ```
   Anota el `id` que te devuelve.
4. Crea una empresa:
   ```bash
   curl -X POST http://localhost:3000/platform/companies \
     -H "Authorization: Bearer TU_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Barbería Elegance"}'
   ```
   Anota el `id` de la empresa.
5. Asígnale una licencia (usando los dos `id` anteriores):
   ```bash
   curl -X POST http://localhost:3000/platform/companies/ID_EMPRESA/license \
     -H "Authorization: Bearer TU_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"planId":ID_PLAN,"billingCycle":"MONTHLY","endDate":"2026-12-31T00:00:00.000Z"}'
   ```
6. Entra como Business Admin de esa empresa (impersonación) — el motivo es obligatorio:
   ```bash
   curl -X POST http://localhost:3000/platform/companies/ID_EMPRESA/impersonate \
     -H "Authorization: Bearer TU_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"reason":"Soporte técnico"}'
   ```
   Te devuelve un `accessToken`/`refreshToken` nuevos.
7. Comprueba que ese token nuevo "actúa como" Business Admin de la empresa:
   ```bash
   curl http://localhost:3000/auth/me -H "Authorization: Bearer TOKEN_DE_IMPERSONACION"
   ```
   Debe devolver `"role":"BUSINESS_ADMIN"`, `"companyId":ID_EMPRESA` y `"impersonatedBy"` con tu propio `id` de Platform Owner — es la misma persona, actuando temporalmente con otro rol.

**Qué mirar en la base de datos:**

- Tabla `plans`: el plan que creaste, con sus límites (los que no pusiste quedan en `null` = sin límite) y `enabledModules` como un arreglo.
- Tabla `companies`: la empresa creada.
- Tabla `licenses`: una fila por empresa (relación 1:1), con `billingCycle`, `endDate` y `expirationBehavior`.
- Tabla `impersonation_logs`: **esta es la que vale la pena mirar con atención** — cada vez que impersonas una empresa, aparece una fila nueva con el motivo que escribiste, el `platformOwnerId`, el `companyId` y la fecha. Nunca se puede editar ni borrar desde la aplicación (solo inserción).
- Tabla `users`: fíjate que tu usuario Platform Owner sigue teniendo `companyId` en `null` — nunca pertenece a una empresa.

**Pruebas automatizadas de esta etapa:**

```bash
cd backend
npm test          # 16 pruebas nuevas (34 en total): Plans, Companies, Licenses, Impersonation, AuthService.issueImpersonationTokens
docker compose up -d postgres
npm run test:e2e  # 5 pruebas nuevas (13 en total): 403 por rol, 401 sin token, flujo completo con verificación de auditoría, motivo vacío (400), empresa inexistente (404)
```
