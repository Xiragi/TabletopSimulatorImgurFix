import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-oxc';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  }
});
