import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  hariIniWib,
  validasiIsianPencarianPengunjung,
  type GalatPencarianPengunjung,
  type HasilPencarian,
  type Kota,
} from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'

/** Isian formulir US-8a: isian US-3 ditambah jumlah penumpang (semuanya teks). */
export interface IsianCariPengunjung {
  asal: string
  tujuan: string
  tanggal: string
  jumlah: string
}

const adaGalat = (galat: GalatPencarianPengunjung) => Object.keys(galat).length > 0

// US-8a di sisi web (boundary Formulir Pencarian Pengunjung dan Hasil Pencarian Pengunjung): pencarian yang berlaku diambil
// dari URL (`?asal=<kotaId>&tujuan=<kotaId>&tanggal=YYYY-MM-DD&jumlah=<n>`), seperti `useCariPenerbangan` (US-3).
// Mengirim formulir hanya menulis URL; efek di bawah memvalidasi (2a-2d) lalu mencari setiap kali URL berubah.
export function useCariPengunjung() {
  const [params, setParams] = useSearchParams()
  const dariUrl: IsianCariPengunjung = {
    asal: params.get('asal') ?? '',
    tujuan: params.get('tujuan') ?? '',
    tanggal: params.get('tanggal') ?? '',
    jumlah: params.get('jumlah') ?? '',
  }
  const kunciUrl = `${dariUrl.asal}|${dariUrl.tujuan}|${dariUrl.tanggal}|${dariUrl.jumlah}`

  const [kota, setKota] = useState<Kota[] | null>(null)
  const [pesanKota, setPesanKota] = useState('')
  const [isian, setIsian] = useState<IsianCariPengunjung>(dariUrl)
  const [galat, setGalat] = useState<GalatPencarianPengunjung>({})
  const [pesan, setPesan] = useState('')
  const [hasil, setHasil] = useState<HasilPencarian[] | null>(null)
  const [sibuk, setSibuk] = useState(false)
  // Naik saat formulir dikirim ulang dengan isian yang sama dengan URL, agar pencarian tetap diulang.
  const [ulang, setUlang] = useState(0)

  // Isian formulir mengikuti URL setiap kali URL berubah (mis. tombol kembali).
  const [kunciIsian, setKunciIsian] = useState(kunciUrl)
  if (kunciIsian !== kunciUrl) {
    setKunciIsian(kunciUrl)
    setIsian(dariUrl)
  }

  /** tandaiKolomSalah(): kolom yang salah ditandai dengan pesannya (2a-2d); hasil disembunyikan, isian tetap. */
  const tandaiKolomSalah = (galatBaru: GalatPencarianPengunjung) => setGalat(galatBaru)
  /** tampilkanHasil(daftar): daftar kosong = "Penerbangan tidak ditemukan" (3a). */
  const tampilkanHasil = (daftar: HasilPencarian[]) => {
    setGalat({})
    setHasil(daftar)
  }

  useEffect(() => {
    let batal = false
    void panggil<{ kota: Kota[]; pesan?: string }>('/penerbangan/kota').then((respons) => {
      if (batal) return
      if (respons.status === 200) setKota(respons.data.kota)
      else setPesanKota(respons.data.pesan ?? 'Gagal memuat daftar kota')
    })
    return () => {
      batal = true
    }
  }, [])

  useEffect(() => {
    setPesan('')
    const { asal, tujuan, tanggal, jumlah } = dariUrl
    if (!asal && !tujuan && !tanggal && !jumlah) {
      setGalat({})
      setHasil(null)
      return
    }
    const lokal = validasiIsianPencarianPengunjung({ asal, tujuan, tanggal, jumlah }, hariIniWib())
    setGalat(lokal)
    if (adaGalat(lokal)) return
    let batal = false
    setSibuk(true)
    void panggil<{ penerbangan?: HasilPencarian[]; galat?: GalatPencarianPengunjung; pesan?: string }>(
      `/travel/cari?${new URLSearchParams({ asal, tujuan, tanggal, jumlah })}`,
    ).then((respons) => {
      if (batal) return
      setSibuk(false)
      if (respons.status === 200) tampilkanHasil(respons.data.penerbangan ?? [])
      else if (respons.data.galat) tandaiKolomSalah(respons.data.galat)
      else setPesan(respons.data.pesan ?? 'Terjadi kesalahan, coba lagi')
    })
    return () => {
      batal = true
      setSibuk(false)
    }
    // dariUrl diturunkan dari kunciUrl, jadi cukup kunciUrl sebagai dependensi
  }, [kunciUrl, ulang])

  const ubahIsian = (kolom: keyof IsianCariPengunjung, nilai: string) => setIsian((isianLama) => ({ ...isianLama, [kolom]: nilai }))

  /** Kirim formulir: validasi lokal (2a-2d) menolak dan menandai kolom; bila valid, tulis ke URL. */
  function cari() {
    const lokal = validasiIsianPencarianPengunjung(isian, hariIniWib())
    tandaiKolomSalah(lokal)
    if (adaGalat(lokal)) return
    if (kunciUrl === `${isian.asal}|${isian.tujuan}|${isian.tanggal}|${isian.jumlah}`) setUlang((jumlahUlang) => jumlahUlang + 1)
    else setParams({ ...isian })
  }

  return {
    kota,
    pesanKota,
    isian,
    ubahIsian,
    cari,
    galat,
    pesan,
    sibuk,
    // Hasil yang basi (dari pencarian sebelumnya) disembunyikan selama kolom ditandai salah.
    hasil: adaGalat(galat) ? null : hasil,
    /** Jumlah penumpang pada pencarian yang berlaku (dari URL); diteruskan ke halaman pemesanan sebagai petunjuk. */
    jumlahDicari: dariUrl.jumlah,
  }
}
