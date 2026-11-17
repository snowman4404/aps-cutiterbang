import { fileURLToPath } from 'node:url'

/** True bila modul pemanggil dijalankan langsung (`tsx src/db/xxx.ts`), bukan diimpor. */
export function dijalankanLangsung(urlModul: string): boolean {
  const berkasUtama = process.argv[1]
  return Boolean(berkasUtama) && fileURLToPath(urlModul) === berkasUtama
}
