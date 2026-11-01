import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './session.js';

// Entrega el professionalId que dejó ProfessionalSessionGuard. Úsalo solo junto a ese guard.
// _data es undefined debido a que no se utiliza en este factory
export const CurrentProfessionalId = createParamDecorator(
  (_data: undefined, context: ExecutionContext): string =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().professionalId,
);
