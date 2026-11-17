import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/src/**/*.test.{ts,tsx}'],
    // Tes API menyiapkan DB memori + seed ~1.500 penerbangan dan hash scrypt per tes; lambat bila berkas tes jalan paralel.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
