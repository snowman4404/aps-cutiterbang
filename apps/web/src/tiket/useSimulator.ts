import { useState } from 'react'
import type { RingkasanSimulator, SistemLuar } from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { useAksi } from '../lib/useAksi.ts'
import { PESAN_GALAT_UMUM, useMuat } from '../lib/useMuat.ts'

/**
 * Panel simulator demo (bukan bagian dari use case mana pun): memuat semua pemesanan dan kotak keluar email dari
 * GET /api/simulasi, lalu memicu sistem luar: pembayaran (WaitingForThePayment -> Booked) dan konfirmasi maskapai
 * (Booked -> Confirmed, lalu e-tiket dan email). API menjawab 404 bila simulator mati (produksi tanpa IZINKAN_RESET=1).
 */
export function useSimulator() {
  const { data: ringkasan, galat, memuat, muatUlang } = useMuat<RingkasanSimulator>('/simulasi')
  const [pesan, setPesan] = useState('')
  const { sibuk, jalankan } = useAksi(setPesan)

  const picu = (sistem: SistemLuar, kode: string) =>
    jalankan(async () => {
      setPesan('')
      try {
        const respons = await panggil<{ pesan?: string }>(`/simulasi/${sistem}/${encodeURIComponent(kode)}`, { method: 'POST' })
        if (respons.status !== 200) setPesan(respons.data.pesan ?? PESAN_GALAT_UMUM)
      } finally {
        muatUlang()
      }
    })

  return { ringkasan, galat, memuat, sibuk, pesan, picu }
}
