import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // <-- Remplacez le point par un slash
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
});