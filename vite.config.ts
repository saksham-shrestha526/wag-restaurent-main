import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
  server: {
    port: 5173,
    allowedHosts: [
      'localhost',
      '.railway.app',
      'wag-restaurant-production.up.railway.app',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3011',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3011',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 120000,
        timeout: 120000,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});