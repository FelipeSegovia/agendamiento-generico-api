# API de agendamiento genérico

Backend de la plataforma donde cualquier profesional que atiende con hora (psicólogo, abogado, profesor, etc.) organiza su agenda y sus clientes reservan solos en su página pública. Aquí viven las reglas de negocio, los datos y la autenticación. Las reglas completas están en [`../requerimientos_funcionales.md`](../requerimientos_funcionales.md) y las decisiones técnicas en [`../requerimientos_tecnicos.md`](../requerimientos_tecnicos.md).

## Qué hace hoy

Están construidas las historias H1.1 (registro de profesionales) y H1.2 (iniciar y cerrar sesión).

- `POST /api/professionals` crea la cuenta de un profesional. La clave se guarda con argon2, la zona horaria inicial es `America/Santiago` y el slug (la dirección de su página pública) debe ser único.
- `POST /api/auth/login` inicia la sesión y la entrega en una cookie `httpOnly`.
- `GET /api/auth/me` devuelve el profesional de la sesión.

## Stack

- NestJS 12 sobre Fastify
- Prisma 7 con PostgreSQL 17 (driver adapter `@prisma/adapter-pg`)
- class-validator y class-transformer para validar los datos de entrada (DTOs)
- zod para validar la configuración
- argon2 para las claves
- Vitest y Supertest para los tests
- Biome para lint y formato

## Requisitos

- Node.js 24
- pnpm 12
- Docker, para levantar PostgreSQL

## Puesta en marcha

1. Instala las dependencias. `pnpm install` también genera el cliente de Prisma.

   ```bash
   pnpm install
   ```

2. Crea tus archivos de variables de entorno. En ambos, define la clave de la base y un `JWT_SECRET_PROFESSIONAL` propio (puedes generarlo con `openssl rand -base64 48`). En `DATABASE_URL`, los símbolos de la clave van codificados para URL (por ejemplo, `@` es `%40` y `#` es `%23`).

   ```bash
   cp .env.example .env
   cp .env.test.example .env.test
   ```

3. Levanta la base de datos con las credenciales de `.env`. Queda en `localhost:5434` (o en `DB_PORT`) y crea dos bases: `generic_scheduling` (desarrollo) y `generic_scheduling_test` (tests).

   ```bash
   docker compose up -d db
   ```

   Postgres solo usa `DB_USER`, `DB_PASSWORD` y `DB_NAME` al crear el volumen por primera vez. Si cambias esas variables con la base ya creada, debes crear el usuario a mano o recrear el volumen (`docker compose down -v`, que borra los datos).

4. Aplica las migraciones a la base de desarrollo.

   ```bash
   pnpm exec prisma migrate dev
   ```

5. Arranca la API en modo desarrollo. Queda en `http://localhost:8080`.

   ```bash
   pnpm start:dev
   ```

## Variables de entorno

| Variable                            | Obligatoria | Para qué                                                                                                                                |
| ----------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Sí          | Credenciales y base del Postgres de `docker-compose.yml`. Solo las usa Docker Compose.                                                  |
| `DB_PORT`                           | No          | Puerto del Postgres local en tu máquina. Por defecto, `5434`.                                                                           |
| `DATABASE_URL`                      | Sí          | Conexión de la API a PostgreSQL, con las mismas credenciales. En `.env` apunta a la base de desarrollo y en `.env.test`, a la de tests. |
| `JWT_SECRET_PROFESSIONAL`           | Sí          | Firma de la sesión del profesional. Mínimo 32 caracteres. Si cambia, todas las sesiones abiertas dejan de valer.                        |
| `PORT`                              | No          | Puerto de la API. Por defecto, `8080`.                                                                                                  |

`.env` y `.env.test` tienen claves y no se suben al repositorio. Los ejemplos (`.env.example` y `.env.test.example`) sí.

Si faltan variables obligatorias, la API no arranca.

## Endpoint: registrar un profesional

`POST /api/professionals` recibe un JSON con estos campos:

| Campo      | Regla                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `name`     | Obligatorio, hasta 100 caracteres.                                                                |
| `email`    | Obligatorio y válido, hasta 254 caracteres. Se guarda en minúsculas, y es único en la plataforma. |
| `password` | De 8 a 128 caracteres.                                                                            |
| `slug`     | Solo minúsculas, números y guiones, hasta 60 caracteres. Es único.                                |

Ejemplo:

```bash
curl -X POST http://localhost:8080/api/professionals \
  -H 'content-type: application/json' \
  -d '{"name":"Ana Pérez","email":"ana@ejemplo.cl","password":"clave-segura","slug":"ana-perez"}'
```

Respuestas:

- `201`: cuenta creada. Devuelve `{"id":"…","name":"Ana Pérez","email":"ana@ejemplo.cl","slug":"ana-perez","timezone":"America/Santiago"}`. La clave nunca se devuelve.
- `400`: falta un dato o no cumple una regla. El campo `message` dice cuál.
- `409`: el correo o el slug ya existen. El campo `message` dice cuál.

## Endpoints: sesión del profesional

`POST /api/auth/login` recibe `{"email": "...", "password": "..."}`.

- `204`: sesión iniciada. La respuesta trae la cookie `professional_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`, válida por 7 días; en producción también `Secure`).
- `401`: el correo o la clave no coinciden. El mensaje es el mismo en ambos casos («Correo o clave incorrectos.»), así no revela si el correo existe.

`GET /api/auth/me` necesita esa cookie.

- `200`: devuelve `{"id","name","email","slug","timezone"}` del profesional de la sesión.
- `401`: no hay cookie, o la cookie no es válida o venció.

Para cerrar sesión basta con borrar la cookie; eso lo hace el front.

## Scripts

| Comando           | Qué hace                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `pnpm start:dev`  | Arranca la API con recarga al guardar.                                                       |
| `pnpm build`      | Compila a `dist/`.                                                                           |
| `pnpm start:prod` | Arranca la versión compilada.                                                                |
| `pnpm test`       | Tests unitarios.                                                                             |
| `pnpm test:e2e`   | Tests e2e contra la base `generic_scheduling_test`. Antes aplica las migraciones a esa base. |
| `pnpm test:watch` | Tests unitarios en modo observación.                                                         |
| `pnpm test:cov`   | Tests unitarios con cobertura.                                                               |
| `pnpm lint`       | Revisa el código con Biome.                                                                  |
| `pnpm format`     | Corrige el formato y los imports con Biome.                                                  |

Los tests e2e necesitan la base de datos levantada (paso 2).

## Estructura

```
prisma/             esquema y migraciones de la base de datos
src/
  auth/             sesión del profesional: login, guard y decorador del professionalId
  config/           variables de entorno validadas con zod
  prisma/           PrismaService y su módulo
  professionals/    registro de profesionales (controlador, servicio y módulo)
    dto/            DTOs de entrada validados con class-validator
  app.module.ts     módulo raíz
  configure-app.ts  plugins de Fastify (cookies), compartidos por main.ts y los tests
  main.ts           arranque con Fastify
test/               tests e2e y create-test-app.ts
docker/             script que crea la base de tests
docker-compose.yml  PostgreSQL local
```

`src/generated/` contiene el cliente de Prisma. Se regenera con `pnpm install` y no se edita a mano.

## Notas

- La API corre con una sola réplica. Los avisos en tiempo real que vienen más adelante dependen de eso.
