/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Project site: https://bgustavocosta-m.github.io/sdd-demo-4th-ed/ (see #5)
  base: '/sdd-demo-4th-ed/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
