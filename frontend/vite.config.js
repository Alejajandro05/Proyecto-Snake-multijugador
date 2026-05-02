import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:2567';
const backendProxy = {
  target: backendTarget,
  changeOrigin: true,
  ws: true,
};

export default defineConfig({
  // Serve/copy frontend/assets as static files available at /...
  // so Phaser runtime loads (bg.png, fondo_duelo.png, map/*, audio/*) work in dist.
  publicDir: 'assets',
  server: {
    proxy: {
      '/api': backendProxy,
      '/matchmake': backendProxy,
      '^/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+(?:\\?.*)?$': backendProxy,
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src/domain'),
    },
  },
});
