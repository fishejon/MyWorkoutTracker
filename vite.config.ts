import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      host: '0.0.0.0',
      // Prefer Vite's default port; override via `npm run dev -- --port <n>`.
      port: 5173,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
    },
  };
});
