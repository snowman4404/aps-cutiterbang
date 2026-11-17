// Pengambil data GET netral modul (dipakai cuti dan tiket); tidak boleh mengimpor modul mana pun.
import { useEffect, useState } from 'react'
import { panggil } from '../akses/api.ts'

export const PESAN_GALAT_UMUM = 'Terjadi kesalahan, coba lagi'

interface Hasil<T> {
  url: string
  data: T | null
  galat: string
}

/**
 * Memuat `url` (null = jangan memuat). Respons untuk url yang sudah usang diabaikan, dan data/galat lama
 * tidak pernah dikembalikan untuk url yang baru: `memuat` bernilai true sampai url yang sekarang selesai.
 * Galat = `pesan` dari API, atau `galatCadangan`.
 */
export function useMuat<T>(url: string | null, galatCadangan: string = PESAN_GALAT_UMUM) {
  const [hasil, setHasil] = useState<Hasil<T> | null>(null)

  useEffect(() => {
    if (url === null) return
    let batal = false
    const selesai = (h: Omit<Hasil<T>, 'url'>) => {
      if (!batal) setHasil({ url, ...h })
    }
    panggil<T & { pesan?: string }>(url)
      .then((r) =>
        selesai(r.status === 200 ? { data: r.data, galat: '' } : { data: null, galat: r.data.pesan ?? galatCadangan }),
      )
      .catch(() => selesai({ data: null, galat: galatCadangan }))
    return () => {
      batal = true
    }
  }, [url, galatCadangan])

  const terkini = url !== null && hasil?.url === url ? hasil : null
  return { data: terkini?.data ?? null, galat: terkini?.galat ?? '', memuat: url !== null && !terkini }
}
