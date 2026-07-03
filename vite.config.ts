import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
  },
  esbuild: {
    loader: 'tsx',
    include: /\.(tsx?|jsx?)$/,
    exclude: [],
  },
  optimizeDeps: {
    exclude: ['src/utils/pdfGenerator.tsx'],
    esbuildOptions: {
      loader: {
        '.tsx': 'tsx',
      },
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': '/src',
    },
  },
});