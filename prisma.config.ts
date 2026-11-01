// Configuración del CLI de Prisma. El CLI no carga `.env` solo, por eso dotenv.
// El valor de relleno deja que `prisma generate` (postinstall) corra sin `.env`.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
