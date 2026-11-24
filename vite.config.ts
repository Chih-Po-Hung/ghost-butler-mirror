import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from the project subpath on GitHub Pages:
  // https://chih-po-hung.github.io/ghost-butler-mirror/
  base: '/ghost-butler-mirror/',
  plugins: [react()],
})
