import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };

// Tauri dev/build 时会设置 TAURI_ENV_PLATFORM
const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig(({ command }) => ({
  // Web build → '/api-tester-rust/'；Tauri 或 dev → '/'
  base: command === 'build' && !isTauri ? '/api-tester-rust/' : '/',
  plugins: [tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:52081',
    },
  },
  build: {
    outDir: '../crates/http-server/static',
    emptyOutDir: true,
    // @tauri-apps/api 在 Tauri 2 中是普通 npm 包，正常打包即可
    // Web 构建时虽然打包进去但 isTauri=false 不会执行该分支
  },
}));
