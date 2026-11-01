import fastifyCookie from '@fastify/cookie';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Plugins de Fastify que necesita la app; lo usan main.ts y los tests e2e por igual.
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  await app.register(fastifyCookie);
}
