import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  hariIniWib,
  validasiIsianPencarian,
  type GalatPencarian,
  type HasilPencarian,
  type IsianPencarian,
  type Kota,
} from '@cutiterbang/domain'
import { panggil } from '../akses/api.ts'

const adaGalat = (g: GalatPencarian) => Object.keys(g).length > 0

// US-3 di sisi web: pencarian yang berlaku diambil langsung dari URL (`?asal=<kotaId>&tujuan=<kotaId>&tanggal=YYYY-MM-DD`),
// jadi bertahan saat dimuat ulang dan bisa ditautkan. Mengirim formulir hanya menulis URL; efek di bawah
// memvalidasi lalu mencari setiap kali URL berubah. Fungsi boundary mengikuti diagram urutan US-3.
export function useCariPenerbangan() {
  const [params, setParams] = useSearchParams()
  const asalUrl = params.get('asal') ?? ''
  const tujuanUrl = params.get('tujuan') ?? ''
  const tanggalUrl = params.get('tanggal') ?? ''

  const [kota, setKota] = useState<Kota[] | null>(null)
  const [pesanKota, setPesanKota] = useState('')
  const [isian, setIsian] = useState<IsianPencarian>({ asal: asalUrl, tujuan: tujuanUrl, tanggal: tanggalUrl })
  const [galat, setGalat] = useState<GalatPencarian>({})
  const [pesan, setPesan] = useState('')
  const [hasil, setHasil] = useState<HasilPencarian[] | null>(null)
  const [sibuk, setSibuk] = useState(false)
  // Naik saat formulir dikirim ulang dengan isian yang sama dengan URL, agar pencarian tetap diulang (mis. setelah galat jaringan).
  const [ulang, setUlang] = useState(0)

  // Isian formulir mengikuti URL setiap kali URL berubah (mis. tombol kembali).
  const kunciUrl = `${asalUrl}|${tujuanUrl}|${tanggalUrl}`
  const [kunciIsian, setKunciIsian] = useState(kunciUrl)
  if (kunciIsian !== kunciUrl) {
    setKunciIsian(kunciUrl)
    setIsian({ asal: asalUrl, tujuan: tujuanUrl, tanggal: tanggalUrl })
  }

  /** tampilkanPesan(pesan): pesan kesalahan umum (bukan milik satu kolom). */
  const tampilkanPesan = (teks: string) => setPesan(teks)
  /** tandaiKolomSalah(galat): kolom yang salah ditandai dengan pesannya; hasil disembunyikan (isian tetap). */
  const tandaiKolomSalah = (g: GalatPencarian) => setGalat(g)
  /** tampilkanHasil(daftarCocok): daftar kosong = "Penerbangan tidak ditemukan". */
  const tampilkanHasil = (daftarCocok: HasilPencarian[]) => {
    setGalat({})
    setHasil(daftarCocok)
  }

  // Langkah 1: daftar kota yang dilayani.
  useEffect(() => {
    let batal = false
    void panggil<{ kota: Kota[]; pesan?: string }>('/penerbangan/kota').then((r) => {
      if (batal) return
      if (r.status === 200) setKota(r.data.kota)
      else setPesanKota(r.data.pesan ?? 'Gagal memuat daftar kota')
    })
    return () => {
      batal = true
    }
  }, [])

  // Langkah 3-5: URL berubah -> validasi -> cari.
  useEffect(() => {
    setPesan('')
    if (!asalUrl && !tujuanUrl && !tanggalUrl) {
      setGalat({})
      setHasil(null)
      return
    }
    const lokal = validasiIsianPencarian({ asal: asalUrl, tujuan: tujuanUrl, tanggal: tanggalUrl }, hariIniWib())
    setGalat(lokal)
    if (adaGalat(lokal)) return
    let batal = false
    setSibuk(true)
    const q = new URLSearchParams({ asal: asalUrl, tujuan: tujuanUrl, tanggal: tanggalUrl })
    void panggil<{ penerbangan?: HasilPencarian[]; galat?: GalatPencarian; pesan?: string }>(
      `/penerbangan/cari?${q}`,
    ).then((r) => {
      if (batal) return
      setSibuk(false)
      if (r.status === 200) tampilkanHasil(r.data.penerbangan ?? [])
      else if (r.data.galat) tandaiKolomSalah(r.data.galat)
      else tampilkanPesan(r.data.pesan ?? 'Terjadi kesalahan, coba lagi')
    })
    return () => {
      batal = true
      setSibuk(false)
    }
  }, [asalUrl, tujuanUrl, tanggalUrl, ulang])

  const ubahIsian = (kolom: keyof IsianPencarian, nilai: string) => setIsian((i) => ({ ...i, [kolom]: nilai }))

  /** Kirim formulir: validasi lokal (3a-3c) menolak dan menandai kolom; bila valid, tulis ke URL. */
  function cari() {
    const lokal = validasiIsianPencarian(isian, hariIniWib())
    tandaiKolomSalah(lokal)
    if (adaGalat(lokal)) return
    const samaDenganUrl = isian.asal === asalUrl && isian.tujuan === tujuanUrl && isian.tanggal === tanggalUrl
    if (samaDenganUrl) setUlang((n) => n + 1)
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
  }
}
