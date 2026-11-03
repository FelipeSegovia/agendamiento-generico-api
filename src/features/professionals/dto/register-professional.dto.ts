import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normalizeEmail, trimText } from '../../../utils/dto-transforms.js';

// Los mensajes llegan tal cual a la persona usuaria: usan el lenguaje del formulario,
// nunca repiten el valor recibido ni nombres internos. Los largos máximos evitan abusos.
export class RegisterProfessionalDto {
  @Transform(trimText)
  @IsString({ message: 'Ingresa tu nombre.' })
  @IsNotEmpty({ message: 'Ingresa tu nombre.' })
  @MaxLength(100, { message: 'El nombre puede tener hasta 100 caracteres.' })
  name: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(50, { message: 'Ingresa un correo válido.' })
  email: string;

  @IsString({ message: 'La clave debe tener al menos 8 caracteres.' })
  @MinLength(8, { message: 'La clave debe tener al menos 8 caracteres.' })
  @MaxLength(70, { message: 'La clave puede tener hasta 70 caracteres.' })
  password: string;

  @Matches(/^[a-z0-9-]+$/, {
    message:
      'La dirección de tu página solo puede tener minúsculas, números y guiones.',
  })
  @MaxLength(60, {
    message: 'La dirección de tu página puede tener hasta 60 caracteres.',
  })
  slug: string;
}
