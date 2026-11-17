import { useEffect, useState } from 'react'
import type { SistemLuar } from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { useAksi } from '../lib/useAksi.ts'
import { PESAN_GALAT_UMUM } from '../lib/useMuat.ts'

/**
 * Simulator sistem luar untuk demo (bukan bagian dari use case mana pun): pembayaran (WaitingForThePayment -> Booked) dan
 * konfirmasi maskapai (Booked -> Confirmed, lalu e-tiket dan email). Aktif hanya bila API melaporkan `resetAktif`, sama
 * seperti reset data demo (di produksi mati kecuali IZINKAN_RESET=1). `setelah` dipanggil sesudah tiap pemicu supaya halaman memuat ulang.
 * Panel demo penuh menyusul di Fase 7.
 */
export function useSimulator(setelah: () => void) {
  const [aktif, setAktif] = useState(false)
  const [pesan, setPesan] = useState('')
  const { sibuk, jalankan } = useAksi(setPesan)

  useEffect(() => {
    void panggil<{ resetAktif?: boolean }>('/health')
      .then((respons) => setAktif(respons.data.resetAktif === true))
      .catch(() => setAktif(false))
  }, [])

  const picu = (sistem: SistemLuar, kode: string) =>
    jalankan(async () => {
      setPesan('')
      try {
        const respons = await panggil<{ pesan?: string }>(`/simulasi/${sistem}/${encodeURIComponent(kode)}`, { method: 'POST' })
        if (respons.status !== 200) setPesan(respons.data.pesan ?? PESAN_GALAT_UMUM)
      } finally {
        setelah()
      }
    })

  return { aktif, sibuk, pesan, picu }
}
