import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:7193', // 👈 puerto correcto del backend
        changeOrigin: true,
        secure: false // 👈 necesario porque ASP.NET usa certificados dev
      },
    },
  },
});