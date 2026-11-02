import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

// Injects a unique build hash into dist/sw.js on every production build so installed PWAs always detect new deploys
function injectSwBuildHash() {
  return {
    name: 'inject-sw-build-hash',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swPath)) {
        const buildHash = Date.now().toString(36);
        const content = fs.readFileSync(swPath, 'utf8');
        const updated = content.replace(
          /const CACHE_NAME = ['"][^'"]+['"];/,
          `const CACHE_NAME = 'seshat-notch-${buildHash}';`
        );
        fs.writeFileSync(swPath, updated, 'utf8');
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    injectSwBuildHash(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-db': ['dexie', 'dexie-react-hooks'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
