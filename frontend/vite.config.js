import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // host: true expone en 0.0.0.0 — necesario para que Docker reenvíe el puerto.
    // Es inofensivo en desarrollo local.
    host: true,
    proxy: {
      '/api': {
        // En Docker: API_TARGET=http://backend:3001 (nombre de servicio)
        // En local:  sin variable → http://localhost:3001
        target: process.env.API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
