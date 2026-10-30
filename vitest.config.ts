import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    // Las pruebas usan siempre los datos de ejemplo, aunque CI tenga configurado Supabase.
    env: { DATOS_FUENTE: 'ejemplo', PUBLIC_SUPABASE_URL: '', PUBLIC_SUPABASE_ANON_KEY: '' },
  },
});
