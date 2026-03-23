import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
    },
    preview: {
      host: true,
    },
    build: {
      sourcemap: env.VITE_BUILD_SOURCEMAP === 'true',
    },
  };
});
