import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': 'http://localhost:4000',
      '/logs': 'http://localhost:4000',
      '/alerts': 'http://localhost:4000',
      '/files': 'http://localhost:4000',
      '/classify': 'http://localhost:4000',
      '/policies': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
  preview: {
    port: 5173,
    host: true,
  },
});
