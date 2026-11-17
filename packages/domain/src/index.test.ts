import { expect, test } from 'vitest'
import { NAMA_APLIKASI } from './index.ts'

test('nama aplikasi', () => {
  expect(NAMA_APLIKASI).toBe('CutiTerbang')
})
