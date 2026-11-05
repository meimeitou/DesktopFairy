import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@framework',
        replacement: path.resolve(__dirname, 'src/live2d/framework'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'electron/**/*.test.cjs'],
    css: false,
  },
})
