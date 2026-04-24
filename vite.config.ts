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
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3010',   // ← changed from 3002 to 3003
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3010',   // ← changed from 3002 to 3003
        changeOrigin: true,
        secure: false,
        proxyTimeout: 120000,
        timeout: 120000,
      },
    },
  },
});