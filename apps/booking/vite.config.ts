import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5180 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /node_modules\/(react|react-dom|scheduler|zustand)\// },
            { name: 'motion', test: /node_modules\/(gsap|lenis)\// },
            { name: 'three', test: /node_modules\/three\// },
            { name: 'r3f', test: /node_modules\/(@react-three|postprocessing|three-stdlib|maath|@monogrid|n8ao|meshline|camera-controls|stats|detect-gpu|troika|hls|suspend|zustand|its-fine|react-reconciler)/ },
          ],
        },
      },
    },
  },
})
