import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  /** GitHub Pages project site: set VITE_BASE=/RepoName/ in CI (e.g. /NetForge/). */
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 3000
  }
})
