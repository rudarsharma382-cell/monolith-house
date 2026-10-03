import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    port: 3000,
    open: false,
    host: true,
    watch: {
      ignored: ['**/public/*.m4a', '**/public/*.mp4', '**/assets/**'],
    },
  },
});
