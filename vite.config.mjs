import { defineConfig } from 'vite';

// A portable static artifact, not an assertion that Sites has accepted a version.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
  },
});
