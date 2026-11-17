import { mkdirSync } from 'node:fs'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema.ts'

export const URL_DB_BAWAAN = 'file:data/cutiterbang.db'

// Gunakan ':memory:' untuk tes. Untuk file, direktori datanya dibuat otomatis.
export function buatDb(url: string = process.env.DATABASE_URL ?? URL_DB_BAWAAN) {
  if (url.startsWith('file:')) mkdirSync('data', { recursive: true })
  return drizzle(createClient({ url }), { schema })
}

export type Db = ReturnType<typeof buatDb>
