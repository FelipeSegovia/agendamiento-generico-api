import type { TransformFnParams } from 'class-transformer';

// Para @Transform en los DTO. Si el valor no es texto, se deja tal cual para que lo rechace la validación.
export const trimText = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : value;

export const normalizeEmail = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
