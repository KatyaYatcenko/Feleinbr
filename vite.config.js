import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Проксі на віддалений бекенд (render) замість локального
      '/api': 'https://feleinbr.onrender.com',
      '/uploads': 'https://feleinbr.onrender.com',
    },
  },
});
