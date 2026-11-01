import { BadRequestException, Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProfessionalsModule } from './professionals/professionals.module.js';

@Module({
  imports: [PrismaModule, ProfessionalsModule, AuthModule],
  providers: [
    // Global vía APP_PIPE (y no en main.ts) para que también aplique en los tests e2e.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        // Un solo mensaje en texto, el primero, para que el front lo muestre tal cual.
        exceptionFactory: (validationErrors) =>
          new BadRequestException(
            Object.values(validationErrors[0]?.constraints ?? {})[0],
          ),
      }),
    },
  ],
})
export class AppModule {}
