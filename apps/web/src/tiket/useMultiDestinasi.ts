import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  adaGalatSegmen,
  bolehHapusSegmen,
  bolehTambahSegmen,
  hariIniWib,
  JUMLAH_SEGMEN_MAKSIMAL,
  JUMLAH_SEGMEN_MINIMAL,
  jumlahSegmenSah,
  PESAN_JUMLAH_SEGMEN,
  SEGMEN_KOSONG,
  validasiSetiapSegmen,
  type GalatSegmen,
  type HasilPencarian,
  type Kota,
  type Segmen,
} from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { PESAN_GALAT_UMUM } from '../lib/useMuat.ts'

export interface HasilSegmen {
  jumlah: number
  penerbangan: HasilPencarian[]
}

const PARAM = 'seg'
const duaKosong = (): Segmen[] => Array.from({ length: JUMLAH_SEGMEN_MINIMAL }, () => ({ ...SEGMEN_KOSONG }))

/** Satu parameter `seg=<asal>,<tujuan>,<tanggal>` menjadi segmen (kolom yang kurang = kosong). */
const segmenDariParam = (teks: string): Segmen => {
  const [asal = '', tujuan = '', tanggal = ''] = teks.split(',')
  return { asal, tujuan, tanggal }
}
const keParam = (s: Segmen) => `${s.asal},${s.tujuan},${s.tanggal}`

/** Draf formulir dari segmen di URL: jumlahnya dijepit ke 2..5 (kelebihan dipotong, kekurangan diisi segmen kosong). */
const drafDariUrl = (dariUrl: Segmen[]): Segmen[] => {
  const jumlah = Math.min(Math.max(dariUrl.length, JUMLAH_SEGMEN_MINIMAL), JUMLAH_SEGMEN_MAKSIMAL)
  return Array.from({ length: jumlah }, (_, i) => dariUrl[i] ?? { ...SEGMEN_KOSONG })
}

// US-4 di sisi web: pencarian yang berlaku ada di URL (`?seg=<asal>,<tujuan>,<tanggal>` berulang, satu per segmen),
// jadi bertahan saat dimuat ulang dan tombol kembali. Isian formulir (`segmen`) adalah draf: menambah atau menghapus
// segmen (2a, 2b) dan mengubah isian tidak menyentuh segmen lain (5a); mengirim menulis URL, dan efek di bawah
// memvalidasi (validasiSetiapSegmen) lalu mencari di API. Operasi boundary mengikuti diagram urutan US-4:
// `tampilkanSegmen`, `tandaiKolomSalah`, `tampilkanPesan`, `tampilkanPerSegmen`.
export function useMultiDestinasi() {
  const [params, setParams] = useSearchParams()
  // Semua `seg` di URL dihitung (tidak dipotong diam-diam): jumlah di luar 2..5 ditolak dengan pesan, seperti API.
  const semuaSegmenUrl = params.getAll(PARAM).map(segmenDariParam)
  const jumlahUrlSah = jumlahSegmenSah(semuaSegmenUrl.length)
  const segmenUrl = jumlahUrlSah ? semuaSegmenUrl : []
  const kunciUrl = semuaSegmenUrl.map(keParam).join('|')

  const [kota, setKota] = useState<Kota[] | null>(null)
  const [pesanKota, setPesanKota] = useState('')
  const [segmen, setSegmen] = useState<Segmen[]>(() => drafDariUrl(semuaSegmenUrl))
  const [galat, setGalat] = useState<GalatSegmen[]>([])
  const [pesan, setPesan] = useState('')
  const [hasil, setHasil] = useState<{ kunci: string; segmen: HasilSegmen[] } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  // Naik saat formulir dikirim ulang dengan isian yang sama dengan URL, agar pencarian tetap diulang.
  const [ulang, setUlang] = useState(0)

  // Isian formulir mengikuti URL setiap kali URL berubah (mis. tombol kembali).
  const [kunciIsian, setKunciIsian] = useState(kunciUrl)
  if (kunciIsian !== kunciUrl) {
    setKunciIsian(kunciUrl)
    setSegmen(drafDariUrl(semuaSegmenUrl))
    setGalat([])
  }

  /** tandaiKolomSalah(galat): kolom yang salah ditandai pada segmennya; hasil disembunyikan (isian tetap). */
  const tandaiKolomSalah = (galatBaru: GalatSegmen[]) => setGalat(galatBaru)
  /** tampilkanPesan(pesan): pesan kesalahan umum. */
  const tampilkanPesan = (teks: string) => setPesan(teks)

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

  // Langkah 3-5: URL berubah -> validasiSetiapSegmen -> cariMultiDestinasi di API -> tampilkanPerSegmen.
  useEffect(() => {
    setPesan('')
    if (!jumlahUrlSah) {
      setGalat([])
      setHasil(null)
      if (semuaSegmenUrl.length > 0) tampilkanPesan(PESAN_JUMLAH_SEGMEN) // URL dengan 1 atau lebih dari 5 segmen
      return
    }
    const lokal = validasiSetiapSegmen(segmenUrl, hariIniWib())
    setGalat(lokal)
    if (adaGalatSegmen(lokal)) return
    let batal = false
    setSibuk(true)
    void panggil<{ segmen?: HasilSegmen[]; galat?: GalatSegmen[]; pesan?: string }>('/penerbangan/multi', {
      body: { segmen: segmenUrl },
    })
      .then((respons) => {
        if (batal) return
        if (respons.status === 200) {
          setGalat([])
          setHasil({ kunci: kunciUrl, segmen: respons.data.segmen ?? [] })
        } else if (respons.data.galat) tandaiKolomSalah(respons.data.galat)
        else tampilkanPesan(respons.data.pesan ?? PESAN_GALAT_UMUM)
      })
      .catch(() => {
        if (!batal) tampilkanPesan(PESAN_GALAT_UMUM)
      })
      .finally(() => {
        if (!batal) setSibuk(false)
      })
    return () => {
      batal = true
      setSibuk(false)
    }
    // segmenUrl diturunkan dari kunciUrl.
  }, [kunciUrl, ulang])

  /** kelolaSegmen('tambah'): 2a, sampai 5 segmen. Segmen lain tidak berubah. */
  function tambahSegmen() {
    if (!bolehTambahSegmen(segmen.length)) return
    setSegmen([...segmen, { ...SEGMEN_KOSONG }])
    setGalat([])
  }
  /** kelolaSegmen('hapus'): 2b, selama masih tersisa 2 segmen. */
  function hapusSegmen(indeks: number) {
    if (!bolehHapusSegmen(segmen.length)) return
    setSegmen(segmen.filter((_, i) => i !== indeks))
    setGalat([])
  }
  /** 5a: hanya segmen yang diubah yang berubah. */
  const ubahIsian = (indeks: number, kolom: keyof Segmen, nilai: string) =>
    setSegmen((lama) => lama.map((s, i) => (i === indeks ? { ...s, [kolom]: nilai } : s)))

  /** cariMultiDestinasi(segmen): validasi lokal (3a-3d) menolak dan menandai kolom; bila valid, tulis ke URL. */
  function cari() {
    const lokal = validasiSetiapSegmen(segmen, hariIniWib())
    tandaiKolomSalah(lokal)
    if (adaGalatSegmen(lokal)) return
    if (segmen.map(keParam).join('|') === kunciUrl) setUlang((jumlahUlang) => jumlahUlang + 1)
    else setParams({ [PARAM]: segmen.map(keParam) })
  }

  const adaGalat = adaGalatSegmen(galat)
  return {
    kota,
    pesanKota,
    segmen,
    ubahIsian,
    tambahSegmen,
    hapusSegmen,
    cari,
    galat,
    pesan,
    sibuk,
    segmenDicari: segmenUrl,
    // Hasil yang basi (dari pencarian sebelumnya) disembunyikan selama kolom ditandai salah.
    hasil: adaGalat || hasil?.kunci !== kunciUrl ? null : hasil.segmen,
  }
}
