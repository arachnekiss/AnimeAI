import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@engine': resolve(__dirname, 'src/engine'),
      '@ai': resolve(__dirname, 'src/ai'),
      '@app': resolve(__dirname, 'src/app'),
      '@backend': resolve(__dirname, 'src/backend'),
    },
  },
  build: {
    outDir: mode === 'showcase' ? 'dist-showcase' : 'dist/frontend',
    sourcemap: true,
    rollupOptions: {
      input: mode === 'showcase' 
        ? resolve(__dirname, 'index.showcase.html')
        : resolve(__dirname, 'index.html'),
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: mode === 'showcase' ? 3001 : 3000,
    proxy: mode === 'showcase' ? {} : {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
}))
