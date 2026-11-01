import { config } from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// Antes de cargar la app: así la conexión apunta a la base de tests, no a la de desarrollo.
config({ path: '.env.test', quiet: true });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Todos los archivos limpian la misma base de tests: en paralelo se pisarían.
    fileParallelism: false,
  },
});
