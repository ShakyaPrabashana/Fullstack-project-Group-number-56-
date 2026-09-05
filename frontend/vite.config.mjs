import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Injected at build time instead of reading import.meta.env in the source.
  // Jest treats any file containing import.meta as ESM and refuses to transform
  // it, so keeping it out of src/ is what lets one codebase serve both.
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL ?? ''),
  },
  server: {
    port: 5173,
    proxy: {
      // Used once the Express API exists (M2). Harmless until then.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    // The end-to-end flows drive a lot of typing through jsdom. Generous, because a
    // shared CI runner under load is much slower than a local machine.
    testTimeout: 30000,
  },
})
