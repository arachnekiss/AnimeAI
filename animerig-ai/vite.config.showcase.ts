import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@app': path.resolve(__dirname, 'src/app'),
    }
  },
  build: {
    outDir: 'dist-showcase',
    sourcemap: true,
    rollupOptions: {
      input: 'index.showcase.html',
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: {
    port: 3004,
    host: '0.0.0.0'
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
