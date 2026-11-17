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
import { panggil } from '../lib/api.ts'

const adaGalat = (galat: GalatPencarian) => Object.keys(galat).length > 0

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
  const tandaiKolomSalah = (galatBaru: GalatPencarian) => setGalat(galatBaru)
  /** tampilkanHasil(daftarCocok): daftar kosong = "Penerbangan tidak ditemukan". */
  const tampilkanHasil = (daftarCocok: HasilPencarian[]) => {
    setGalat({})
    setHasil(daftarCocok)
  }

  // Langkah 1: daftar kota yang dilayani.
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
    const kueri = new URLSearchParams({ asal: asalUrl, tujuan: tujuanUrl, tanggal: tanggalUrl })
    void panggil<{ penerbangan?: HasilPencarian[]; galat?: GalatPencarian; pesan?: string }>(
      `/penerbangan/cari?${kueri}`,
    ).then((respons) => {
      if (batal) return
      setSibuk(false)
      if (respons.status === 200) tampilkanHasil(respons.data.penerbangan ?? [])
      else if (respons.data.galat) tandaiKolomSalah(respons.data.galat)
      else tampilkanPesan(respons.data.pesan ?? 'Terjadi kesalahan, coba lagi')
    })
    return () => {
      batal = true
      setSibuk(false)
    }
  }, [asalUrl, tujuanUrl, tanggalUrl, ulang])

  const ubahIsian = (kolom: keyof IsianPencarian, nilai: string) => setIsian((isianLama) => ({ ...isianLama, [kolom]: nilai }))

  /** Kirim formulir: validasi lokal (3a-3c) menolak dan menandai kolom; bila valid, tulis ke URL. */
  function cari() {
    const lokal = validasiIsianPencarian(isian, hariIniWib())
    tandaiKolomSalah(lokal)
    if (adaGalat(lokal)) return
    const samaDenganUrl = isian.asal === asalUrl && isian.tujuan === tujuanUrl && isian.tanggal === tanggalUrl
    if (samaDenganUrl) setUlang((jumlahUlang) => jumlahUlang + 1)
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
    /** Berubah setiap pencarian baru (URL berubah); dipakai untuk mengatur ulang keadaan alat hasil. */
    kunciPencarian: kunciUrl,
  }
}
