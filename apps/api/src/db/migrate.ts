import { existsSync } from 'node:fs'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from './client.ts'

if (existsSync('drizzle')) {
  await migrate(db, { migrationsFolder: 'drizzle' })
  console.log('Migrations applied')
} else {
  console.log('No migrations yet (run npm run db:generate after adding tables)')
}
