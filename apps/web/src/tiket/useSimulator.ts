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
  const [versi, setVersi] = useState(0)
  const muat = useMuat<RingkasanSimulator>(`/simulasi?v=${versi}`)
  // Ringkasan terakhir tetap tampil selama dimuat ulang setelah pemicu.
  const [terakhir, setTerakhir] = useState<RingkasanSimulator | null>(null)
  if (muat.data && muat.data !== terakhir) setTerakhir(muat.data)
  const [pesan, setPesan] = useState('')
  const { sibuk, jalankan } = useAksi(setPesan)

  const picu = (sistem: SistemLuar, kode: string) =>
    jalankan(async () => {
      setPesan('')
      try {
        const respons = await panggil<{ pesan?: string }>(`/simulasi/${sistem}/${encodeURIComponent(kode)}`, { method: 'POST' })
        if (respons.status !== 200) setPesan(respons.data.pesan ?? PESAN_GALAT_UMUM)
      } finally {
        setVersi((v) => v + 1)
      }
    })

  return { ringkasan: muat.data ?? terakhir, galat: terakhir ? '' : muat.galat, memuat: muat.memuat && !terakhir, sibuk, pesan, picu }
}
