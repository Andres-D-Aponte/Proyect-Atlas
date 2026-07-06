# 05 — Guía Práctica y de Aprendizaje

**Proyecto:** Atlas
**Para quién es este documento:** para ti. La idea es que puedas leerlo de arriba a abajo y quedar en capacidad de compilar, levantar, probar e inspeccionar el proyecto como si lo hubieras programado tú mismo, sin depender de recordar comandos sueltos de la conversación.

**Cómo se mantiene:** este documento crece **una sección por etapa**, en el mismo orden del roadmap ([`03_Roadmap.md`](03_Roadmap.md)). Cada vez que termine una etapa nueva, le agrego su propia sección al final con: qué se construyó, cómo compilarlo/probarlo y qué mirar en la base de datos. Las secciones de "Fundamentos" de más abajo casi no cambian; son la base que no depende de la etapa.

---

## Fundamentos (leer una sola vez)

### ¿Qué es cada pieza que vas a levantar?

- **PostgreSQL**: la base de datos. Corre dentro de un contenedor Docker.
- **Backend (NestJS)**: la API. También corre en un contenedor Docker, y se conecta a PostgreSQL.
- **Frontend (Angular)**: lo que ves en el navegador. Desde la Etapa 4 ya es funcional: login, panel del Platform Owner y configuración del negocio.
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

`http://localhost:4200` en el navegador. Desde la Etapa 4 ya es una aplicación real: te redirige a `/login`.

### Modo claro / oscuro

Desde la Etapa 4, cada pantalla tiene un botón 🌙/☀️ (junto a tu correo, en la esquina de la pantalla de login) que alterna entre modo claro y oscuro. La elección se recuerda en tu navegador (`localStorage`, clave `atlas.theme`) — si nunca lo tocas, la app sigue automáticamente la preferencia de tu sistema operativo. Es puramente visual (CSS, variables de color); no afecta ningún dato ni comportamiento.

### Diseño visual y configuración simplificada

Todas las pantallas comparten un mismo encabezado con la marca "Atlas" (`AppShellComponent`, en `frontend/src/app/shared/components/app-shell/`) y un sistema de diseño único (`frontend/src/styles.scss`): paleta de colores, tarjetas, botones, tablas y formularios consistentes en toda la app, en vez de que cada pantalla invente su propio estilo.

En la configuración de empresa, específicamente:

- **Moneda**: un selector con solo COP y USD por ahora (no hay que escribir un código a mano). El backend ya acepta cualquier código de 3 letras, así que agregar más monedas en el futuro es solo cuestión de sumar una opción en el frontend, sin tocar el backend.
- **Zona horaria** e **Idioma**: también selectores, con una lista corta de zonas horarias comunes y, por ahora, un único idioma disponible (Español).
- **Color principal**: un selector de color nativo del navegador (la típica rueda/paleta del sistema operativo) en vez de escribir un código hexadecimal a mano — al lado se muestra el código capturado, por si lo necesitas para otra cosa.
- **Métodos de pago**: casillas con nombres en español (Efectivo, Transferencia, Nequi...) en vez de los nombres técnicos en inglés que usa la base de datos.

### Volver al panel de plataforma tras impersonar

Cuando el Platform Owner usa "Entrar como Business Admin" (Etapa 3), ahora aparece una barra amarilla fija debajo del encabezado, en todas las pantallas de configuración: **"Estás viendo la aplicación como Business Admin de esta empresa. ← Volver al panel de plataforma"**. Al hacer clic, se restaura la sesión original del Platform Owner (sin pedir contraseña de nuevo) y se regresa a `/platform/companies`.

Por dentro: antes de impersonar, el frontend guarda los tokens del Platform Owner en `localStorage` (`atlas.previousAccessToken` / `atlas.previousRefreshToken`, `AuthService.beginImpersonation`); al volver, `AuthService.exitImpersonation` los restaura y los borra de ese storage temporal. No se necesitó ningún endpoint nuevo en el backend — el JWT original del Platform Owner sigue siendo válido, solo estaba "guardado a un lado".

### Notificaciones de error (toasts)

Cualquier error que devuelva el backend —un campo obligatorio que falta, un correo duplicado, una comisión mayor a 100, un permiso insuficiente, lo que sea— ahora aparece como una notificación (toast) en la esquina superior derecha, con el mensaje real que envió el backend (no un texto genérico inventado por el frontend). Se ve en cualquier pantalla, incluido el login, y se puede cerrar con la ✕ o esperar a que desaparezca sola (los errores duran 8 segundos en pantalla, los avisos de éxito 4).

Por dentro:

- `core/services/notification.service.ts`: guarda la lista de toasts activos (`signal`), con `error()`/`success()`/`info()` y auto-descarte por temporizador.
- `shared/components/toast-container/`: los pinta; está montado en `app.html` (fuera del `router-outlet`), por eso se ve en toda la app.
- `core/interceptors/error-notification.interceptor.ts`: un interceptor HTTP global que atrapa **cualquier** error de **cualquier** llamada al backend y llama a `notificationService.error(...)` con el mensaje que venga en el cuerpo de la respuesta (NestJS manda `{ statusCode, message, error }`; `message` es una lista cuando son varias validaciones de `class-validator` a la vez, o un texto simple para errores como "ya existe un usuario con ese correo"). Va registrado **antes** que `authInterceptor` en `app.config.ts` para no mostrar un toast por una renovación de sesión (401) que `authInterceptor` resuelve solo, en silencio, con su refresh automático.
- Como el toast ahora es automático y global, se quitaron los mensajes de error locales que existían sueltos en varias pantallas (Empresas, Usuarios, Servicios, Login) — antes eran genéricos ("No se pudo crear el usuario...") y no decían el motivo real; ahora el motivo real llega solo, sin que cada pantalla tenga que repetir esa lógica.
- Todos los DTOs del backend (`backend/src/**/dto/*.dto.ts`) tienen sus mensajes de `class-validator` traducidos al español (antes eran el texto en inglés por defecto de la librería, ej. `"email must be an email"`) — así el toast siempre se lee en español, igual que el resto de la app.

Para verlo tú mismo: intenta crear dos categorías de servicio con el mismo nombre, o un servicio con una comisión porcentual de más de 100 — en ambos casos debe aparecer el toast rojo con el motivo exacto.

### Botón de logout en todas las pantallas + sesión estable ante la inactividad

Antes, el botón "Salir" solo existía en el panel de Empresas (Platform Owner) — ninguna de las 4 pantallas de Configuración (Empresa, Sucursales, Usuarios, Servicios), que es donde vive el día a día de un Business Admin/Supervisor/Recepcionista, tenía forma de cerrar sesión sin borrar manualmente el `localStorage`. Ahora las 5 pantallas pasan `[showLogout]="true"` y `(logout)="logout()"` al `AppShellComponent`, así que "Salir" siempre está visible arriba a la derecha, sin importar en qué pantalla estés.

Aparte, se corrigió una condición de carrera real que podía cerrar la sesión de golpe aunque el usuario no llevara horas inactivo, sino apenas al retomar actividad justo cuando el access token (dura 15 minutos) ya había expirado:

- El refresh token es de un solo uso (rotación): cada vez que se usa, el backend lo revoca y entrega uno nuevo.
- Si una pantalla dispara **dos o más peticiones al backend en paralelo** justo cuando el access token expiró (ej. la pestaña Servicios carga categorías y servicios a la vez con `Promise.all`), las dos reciben 401 casi al mismo tiempo, y **cada una intentaba renovar la sesión por su cuenta** con el mismo refresh token — la segunda en llegar se encontraba el token ya usado por la primera y fallaba, cerrando la sesión sin motivo real.
- **Arreglado en el frontend** (`core/services/auth.service.ts`): ahora todas las peticiones que necesitan renovar la sesión al mismo tiempo comparten una única llamada de refresh en vuelo (`refreshInFlight`), en vez de disparar una cada una.
- **Arreglado también en el backend** (`people/auth/refresh-token.service.ts`): la revocación del refresh token ahora es atómica (`updateMany` condicionado a que siga sin revocar, no un `update` simple), para que dos peticiones concurrentes con el mismo token nunca puedan "ganar" las dos a la vez — cierra el mismo hueco incluso si el usuario tiene dos pestañas abiertas con la misma sesión.
- El refresh token dura 30 días (`REFRESH_TOKEN_TTL_DAYS`) — de sobra para "horas sin tocar la pantalla"; el problema nunca fue la duración, sino esta carrera al retomar actividad.

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

### Ver la aplicación funcionando de verdad, en un navegador (sin hacerlo a mano)

Además de las pruebas automatizadas de arriba (que verifican lógica, no la experiencia visual), el proyecto tiene una herramienta que abre un navegador real (headless, con Playwright) y recorre la aplicación completa — login, crear empresa, impersonar, configuración, sucursales — tomando una captura de pantalla en cada paso y avisando si hubo algún error en la consola del navegador.

```bash
cd tools/browser-check
npm install                        # solo la primera vez
npx playwright install chromium    # solo la primera vez
npm run check
```

Las capturas quedan en `tools/browser-check/screenshots/`. Ábrelas y mira que se vean bien — el script solo te dice si hubo errores técnicos, no si algo se ve mal visualmente. Detalle completo en [`tools/browser-check/README.md`](../tools/browser-check/README.md) y en la skill `.claude/skills/atlas-browser-check/SKILL.md` (así es como yo, la IA, la vuelvo a correr en el futuro sin tener que rehacerla desde cero).

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

---

### Etapa 4 — Configuración inicial del negocio

**Qué se construyó:** identidad de marca de la empresa (logo, colores), zona horaria/moneda/idioma, métodos de pago habilitados, sucursales con horario semanal. **Primera etapa con frontend real** (antes solo existía el backend). Detalle completo en [`docs/modules/04_configuracion_inicial.md`](modules/04_configuracion_inicial.md).

**Cómo compilar:** igual que siempre para el backend. Para el frontend, si nunca lo hiciste: `cd frontend && npm install`.

**Paso a paso para probarlo tú mismo, desde cero, usando el navegador:**

1. Levanta el entorno y migra:
   ```bash
   docker compose up -d --build
   docker compose exec backend npx prisma migrate dev
   docker compose exec backend npm run db:seed
   ```
2. Abre `http://localhost:4200` en tu navegador. Debe redirigirte a `/login`.
3. Inicia sesión con `owner@atlas.dev` / `ChangeMe123!` (el Platform Owner del seed).
4. Vas a caer en **Atlas — Empresas**: el panel del Platform Owner. Crea una empresa nueva con el formulario de arriba.
5. Haz clic en **"Entrar como Business Admin"** en cualquier fila. El navegador te va a pedir un motivo (es obligatorio, recuerda la Etapa 3) — escribe cualquier texto y acepta.
6. Vas a caer en **Atlas — [nombre de la empresa]**: la pantalla de configuración. Verifica que por defecto la moneda es `COP`, el idioma `es`, y los métodos de pago `CASH` y `TRANSFER` ya están marcados (sin que nadie los haya configurado — es el comportamiento "inteligente por defecto").
7. Cambia el color principal o cualquier otro campo y presiona "Guardar cambios" — debe aparecer "Cambios guardados."
8. Ve a la pestaña **Sucursales**, crea una sucursal, y haz clic en "Editar horario" para agregarle un día con hora de apertura/cierre. Guarda y confirma que se ve reflejado en la tarjeta de la sucursal.
9. Para volver a entrar como Platform Owner, usa la barra amarilla "← Volver al panel de plataforma" que aparece arriba de cualquier pantalla de configuración mientras estás impersonando (ver sección "Volver al panel de plataforma tras impersonar" más arriba) — no hace falta cerrar sesión.

**Qué mirar en la base de datos:**

- Tabla `companies`: ahora con `logoUrl`, `primaryColor`, `timezone`, `currency`, `language`, `enabledPaymentMethods` (un arreglo de Postgres, vas a verlo como `{CASH,TRANSFER}`).
- Tabla `branches`: la sucursal creada, con `openingHours` como JSON — ábrela en Prisma Studio para ver el arreglo de días/horas tal cual lo guardó el formulario.

**Qué mirar en el navegador (DevTools):**

- Pestaña **Application → Local Storage** (`http://localhost:4200`): vas a ver `atlas.accessToken` y `atlas.refreshToken` — así es como el frontend recuerda tu sesión entre recargas de página.
- Pestaña **Network**: cada petición a `/settings/...` o `/platform/...` lleva un header `Authorization: Bearer <token>` — lo añade automáticamente el interceptor HTTP, no cada componente por separado.

**Pruebas automatizadas de esta etapa:**

```bash
cd backend
npm test          # 11 pruebas nuevas (45 en total): CompanySettingsService, BranchesService, TenantGuard
docker compose up -d postgres
npm run test:e2e  # 7 pruebas nuevas (20 en total): defaults de empresa nueva, actualización, validaciones, 403, aislamiento real entre dos empresas, horario inválido

cd ../frontend
npm run lint
npm run build
npm test -- --watch=false
```

Para la verificación en navegador, no hace falta Playwright instalado en el proyecto — si quieres repetirla tú mismo, basta con abrir `http://localhost:4200` y seguir los pasos de arriba a mano.

---

### Etapa 5 — Usuarios

**Qué se construyó:** el Platform Owner ahora puede crear el Business Admin real de una empresa (con su propio correo/contraseña, sin depender de impersonar para siempre); y ese Business Admin puede crear y activar/desactivar usuarios Supervisor y Recepcionista/Cajero de su propia empresa. Detalle completo en [`docs/modules/05_usuarios.md`](modules/05_usuarios.md), incluyendo un bug real que encontramos y corregimos (el login normal no llevaba `companyId` en el JWT).

**Paso a paso para probarlo tú mismo, desde cero, usando el navegador:**

1. Levanta el entorno (si ya lo tenías arriba de una etapa anterior, no hace falta repetir esto):
   ```bash
   docker compose up -d --build
   ```
2. Entra a `http://localhost:4200`, inicia sesión con `owner@atlas.dev` / `ChangeMe123!`.
3. En el panel de Empresas, en la fila de cualquier empresa, haz clic en **"+ Admin"**. Se despliega un formulario debajo de la fila: pon un correo (ej. `admin@mi-empresa.dev`) y una contraseña (mínimo 8 caracteres), y presiona "Crear".
4. Cierra sesión ("Salir") e inicia sesión de nuevo, pero ahora con el correo/contraseña del Business Admin que acabas de crear — es un login real, no impersonación. Debes caer directo en la pantalla de Configuración de esa empresa.
5. Ve a la nueva pestaña **Usuarios** (junto a Empresa y Sucursales). Crea un usuario con rol "Recepcionista / Cajero" usando el formulario de arriba.
6. En la tabla, haz clic en "Desactivar" sobre ese usuario — su estado debe cambiar a "Inactivo" de inmediato.
7. (Opcional, para confirmar que de verdad quedó bloqueado) Cierra sesión e intenta iniciar sesión con el correo del usuario desactivado — debe rechazar el login.

**Qué mirar en la base de datos:**

- Tabla `users`: ahora vas a ver más de una fila con `companyId` distinto de nulo — el Business Admin y el staff que le creaste, todos ligados a la misma empresa. La columna `role` distingue quién es quién; `isActive` refleja el estado que cambiaste en el paso 6.

**Qué mirar en el navegador (DevTools):**

- Si decodificas el `atlas.accessToken` (por ejemplo en [jwt.io](https://jwt.io), pegando solo el token, sin enviarlo a ningún sitio con datos reales) vas a ver que el payload del Business Admin real tiene `companyId` — antes de esta etapa, esto solo pasaba con el token de impersonación; ahora también pasa con un login normal.

**Pruebas automatizadas de esta etapa:**

```bash
cd backend
npm test          # 7 pruebas nuevas (59 en total): UsersService (crear admin/staff, conflictos, aislamiento)
docker compose up -d postgres
npx jest --config ./test/jest-e2e.json --runInBand  # 8 pruebas nuevas (28 en total) — usa --runInBand: correr los 5 archivos e2e en paralelo contra un solo Postgres es intermitente (ver nota en docs/modules/05_usuarios.md), no es un problema de esta etapa

cd ../frontend
npm run lint
npm run build
npm test -- --watch=false
```

---

### Etapa 6 — Servicios

**Qué se construyó:** el catálogo de servicios de cada empresa: categorías propias (con el mismo nombre permitido entre empresas distintas, no dentro de la misma), y servicios con duración, tiempo de preparación (buffer), precio, comisión (porcentaje o valor fijo, con equivalencia calculada en vivo) y si requieren dos profesionales o un tipo de recurso físico (sala, silla, cabina, máquina, camilla). Detalle completo en [`docs/modules/06_servicios.md`](modules/06_servicios.md).

**Paso a paso para probarlo tú mismo, desde cero, usando el navegador:**

1. Levanta el entorno si no lo tenías arriba: `docker compose up -d --build`.
2. Entra como Business Admin de alguna empresa (impersonando desde el panel de Empresas, o con el login real que creaste en la Etapa 5).
3. Ve a la pestaña **Servicios** (junto a Empresa, Sucursales y Usuarios).
4. En la sección "Categorías", crea una categoría (ej. "Cortes"). Puedes renombrarla (✎) o borrarla (✕) — bórrala y comprueba que no rompe nada (los servicios que la usaban simplemente quedan sin categoría).
5. Llena el formulario "Nuevo servicio": nombre, categoría, duración, tiempo de preparación, precio, comisión (elige % o Fijo y escribe un valor — fíjate que aparece "≈ ..." con la equivalencia calculada), y opcionalmente marca "Requiere dos profesionales" o selecciona un recurso requerido. Presiona "+ Crear servicio".
6. En la tabla, haz clic en "Editar" sobre el servicio recién creado, cambia el precio y guarda — confirma que la tabla refleja el cambio.
7. Haz clic en "Desactivar" — el estado debe cambiar a "Inactivo" en la tabla, sin desaparecer de la lista.

**Qué mirar en la base de datos:**

- Tabla `service_categories`: la categoría creada, con su `companyId`.
- Tabla `services`: el servicio con todos sus campos — fíjate que `price` y `commission_value` se guardan como números simples (no como texto), y que `category_id` queda en `NULL` si borraste la categoría en el paso 4.

**Pruebas automatizadas de esta etapa:**

```bash
cd backend
npm test          # 15 pruebas nuevas (82 en total): CategoriesService, ServicesService (conflictos, aislamiento, validación de categoría cruzada)
docker compose up -d postgres
npx jest --config ./test/jest-e2e.json --runInBand  # 10 pruebas nuevas (38 en total)

cd ../frontend
npm run lint
npm run build
npm test -- --watch=false
```
