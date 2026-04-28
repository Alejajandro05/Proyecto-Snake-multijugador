import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Serve/copy frontend/assets as static files available at /...
  // so Phaser runtime loads (bg.png, fondo_duelo.png, map/*, audio/*) work in dist.
  publicDir: 'assets',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src/domain'),
    },
  },
});
