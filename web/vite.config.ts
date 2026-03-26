import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Set base to '/' for local dev; GitHub Actions will override via env
  base: process.env.VITE_BASE_PATH ?? '/',
})
