import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:52081',
    },
  },
  build: {
    outDir: '../crates/http-server/static',
    emptyOutDir: true,
    rollupOptions: {
      external: ['@tauri-apps/api/core'],
    },
  },
});
