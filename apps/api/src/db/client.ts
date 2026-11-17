import { mkdirSync } from 'node:fs'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema.ts'

const url = process.env.DATABASE_URL ?? 'file:data/cutiterbang.db'
if (url.startsWith('file:')) mkdirSync('data', { recursive: true })

export const db = drizzle(createClient({ url }), { schema })
