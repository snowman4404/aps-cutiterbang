// Menyiapkan basis data saat server mulai: migrasi, lalu seed yang idempoten (hanya mengisi yang belum ada), atau
// reset penuh ke seed bila `resetSaatMulai` (RESET_SAAT_MULAI=1, opsional).
import type { Db } from './client.ts'
import { jalankanMigrasi } from './migrate.ts'
import { resetData } from './reset.ts'
import { seed } from './seed.ts'

export async function siapkanDb(db: Db, opsi: { resetSaatMulai: boolean }) {
  await jalankanMigrasi(db)
  if (opsi.resetSaatMulai) await resetData(db)
  else await seed(db)
}
