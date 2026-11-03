import {
  BadRequestException,
  Module,
  type ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { PrismaModule } from './db/prisma/prisma.module.js';
import { AuthModule } from './features/auth/auth.module.js';
import { ProfessionalsModule } from './features/professionals/professionals.module.js';
import { ServicesModule } from './features/services/services.module.js';
import { WeeklyTemplateModule } from './features/weekly-template/weekly-template.module.js';

// En un DTO anidado (una lista de rangos), el mensaje vive en los hijos del error.
const firstMessage = (error: ValidationError): string | undefined =>
  Object.values(error.constraints ?? {})[0] ??
  error.children?.map(firstMessage).find(Boolean);

@Module({
  imports: [
    PrismaModule,
    ProfessionalsModule,
    AuthModule,
    ServicesModule,
    WeeklyTemplateModule,
  ],
  providers: [
    // Global vía APP_PIPE (y no en main.ts) para que también aplique en los tests e2e.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        // Un solo mensaje en texto, el primero, para que el front lo muestre tal cual.
        exceptionFactory: (validationErrors) =>
          new BadRequestException(firstMessage(validationErrors[0])),
      }),
    },
  ],
})
export class AppModule {}
