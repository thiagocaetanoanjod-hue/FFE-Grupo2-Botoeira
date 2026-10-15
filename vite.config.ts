/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Porta fixa do Grupo 2 (guia de ambiente): 8081. strictPort evita "pular" para outra porta
// e quebrar o override do import map no App Shell.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 8081,
    strictPort: true,
    host: true,
    cors: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  preview: { port: 8081, strictPort: true, headers: { 'Access-Control-Allow-Origin': '*' } },
  define: mode === 'spa' ? { 'process.env.NODE_ENV': '"production"' } : {},
  build:
    mode === 'spa'
      ? {
          // Bundle ES único para o App Shell / single-spa: dist-spa/main.js
          outDir: 'dist-spa',
          lib: { entry: 'src/spa-entry.tsx', formats: ['es'], fileName: () => 'main.js' },
        }
      : { outDir: 'dist' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'] /* src/lib/*.test.ts e src/state/store.test.ts são de outra implementação (excluídos) */,
  },
}));
