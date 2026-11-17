// Deletes the SQLite file, then re-runs migrations and seed. Used before e2e tests and demos.
import { rmSync } from 'node:fs'

for (const f of ['data/cutiterbang.db', 'data/cutiterbang.db-wal', 'data/cutiterbang.db-shm']) {
  rmSync(f, { force: true })
}
await import('./migrate.ts')
await import('./seed.ts')
