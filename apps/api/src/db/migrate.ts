import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { buatDb, type Db } from './client.ts'

// Folder migrasi dihitung relatif terhadap paket api, bukan cwd.
const FOLDER_MIGRASI = fileURLToPath(new URL('../../drizzle', import.meta.url))

export async function jalankanMigrasi(db: Db) {
  await migrate(db, { migrationsFolder: FOLDER_MIGRASI })
}

// CLI: `npm run db:migrate`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await jalankanMigrasi(buatDb())
  console.log('Migrations applied')
}
