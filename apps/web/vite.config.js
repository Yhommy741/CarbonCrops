import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // FastAPI runs on :8000 (docker compose up, or uvicorn in services/api).
    // 127.0.0.1, not localhost: on Windows localhost tries IPv6 (::1) first,
    // and docker-compose.yml publishes the API on IPv4 127.0.0.1 only.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/uploads': 'http://127.0.0.1:8000',
    },
  },
})
