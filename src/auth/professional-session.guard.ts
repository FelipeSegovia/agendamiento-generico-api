import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  type AuthenticatedRequest,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from './session.js';

// Exige una cookie de sesión válida y deja el professionalId del token en la request.
// El professionalId nunca sale del body ni de la URL.
@Injectable()
export class ProfessionalSessionGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const sessionToken = request.cookies[SESSION_COOKIE_NAME];
    if (!sessionToken) {
      throw new UnauthorizedException('Inicia sesión para continuar.');
    }

    try {
      const sessionPayload =
        await this.jwtService.verifyAsync<SessionPayload>(sessionToken);
      request.professionalId = sessionPayload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Inicia sesión para continuar.');
    }
  }
}
