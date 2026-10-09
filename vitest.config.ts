import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // URL.pathname은 한글·공백 경로를 퍼센트 인코딩해 Windows에서 별칭이 깨진다
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
