import { config } from 'dotenv';
import { z } from 'zod';

config({ quiet: true });

// Falla al arrancar si falta una variable, no en la primera consulta.
export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET_PROFESSIONAL: z.string().min(32),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  })
  .parse(process.env);
