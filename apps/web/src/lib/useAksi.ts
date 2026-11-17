// Aksi tulis (POST dan sejenisnya) netral modul: menjaga `sibuk` dan mengubah galat jaringan menjadi pesan umum.
// Tidak boleh mengimpor modul mana pun.
import { useCallback, useState } from 'react'
import { PESAN_GALAT_UMUM } from './useMuat.ts'

/**
 * `jalankan(aksi)` menyalakan `sibuk` selama `aksi` berjalan. Bila `aksi` melempar (jaringan putus, JSON rusak),
 * `saatGalat` dipanggil dengan `PESAN_GALAT_UMUM`. Jawaban API yang berisi galat ditangani `aksi` sendiri.
 */
export function useAksi(saatGalat: (pesan: string) => void) {
  const [sibuk, setSibuk] = useState(false)
  const jalankan = useCallback(
    async (aksi: () => Promise<void>) => {
      setSibuk(true)
      try {
        await aksi()
      } catch {
        saatGalat(PESAN_GALAT_UMUM)
      } finally {
        setSibuk(false)
      }
    },
    [saatGalat],
  )
  return { sibuk, jalankan }
}
