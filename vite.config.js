import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // For GitHub Pages: if you'll publish as a project page (https://<user>.github.io/<repo>/)
  // replace base with `'/<repo>/'` (e.g. '/mgnrega-bihar-dashboard/').
  // Using './' makes the build work for both Pages and local file-serving.
  base: './',
  plugins: [react()],
})
