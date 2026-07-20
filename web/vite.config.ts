import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor';
          if (id.includes('lucide-react')) return 'icons-vendor';
          if (id.includes('@reduxjs') || id.includes('react-redux') || id.includes('@tanstack')) return 'state-vendor';
          if (id.includes('axios') || id.includes('react-hook-form')) return 'forms-api-vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
