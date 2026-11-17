import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    pool: 'threads',
    fileParallelism: false,
    isolate: false,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'src/test/setup.ts')],
    globals: true,
  },
  resolve: {
    alias: {
      '@test-utils': path.resolve(__dirname, 'src/test/utils.ts'),
    },
  },
})
