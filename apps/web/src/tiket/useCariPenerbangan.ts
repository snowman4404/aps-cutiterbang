import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  hariIniWib,
  validasiIsianPencarian,
  validasiIsianPencarianPengunjung,
  type HasilPencarian,
  type Kota,
  type TanggalIso,
} from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { PESAN_GALAT_UMUM } from '../lib/useMuat.ts'

/** Satu jenis pencarian penerbangan: kolom isian (juga nama parameter URL), validasi lokal dan endpoint API. */
interface JenisPencarian<K extends string> {
  kolom: readonly K[]
  validasi: (isian: Record<K, string>, hariIni: TanggalIso) => Partial<Record<K, string>>
  endpoint: string
}

const adaGalat = (galat: object) => Object.keys(galat).length > 0

// Pencarian yang berlaku diambil langsung dari URL (`?asal=<kotaId>&tujuan=<kotaId>&tanggal=YYYY-MM-DD`, ditambah
// `&jumlah=<n>` untuk US-8a), jadi bertahan saat dimuat ulang dan bisa ditautkan. Mengirim formulir hanya menulis URL;
// efek di bawah memvalidasi lalu mencari setiap kali URL berubah. Fungsi boundary mengikuti diagram urutan US-3.
function useCariDiUrl<K extends string>({ kolom, validasi, endpoint }: JenisPencarian<K>) {
  const [params, setParams] = useSearchParams()
  const isianUrl = Object.fromEntries(kolom.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>
  const kunci = (isian: Record<K, string>) => kolom.map((k) => isian[k]).join('|')
  const kunciUrl = kunci(isianUrl)

  const [kota, setKota] = useState<Kota[] | null>(null)
  const [pesanKota, setPesanKota] = useState('')
  const [isian, setIsian] = useState<Record<K, string>>(isianUrl)
  const [galat, setGalat] = useState<Partial<Record<K, string>>>({})
  const [pesan, setPesan] = useState('')
  const [hasil, setHasil] = useState<HasilPencarian[] | null>(null)
  const [sibuk, setSibuk] = useState(false)
  // Naik saat formulir dikirim ulang dengan isian yang sama dengan URL, agar pencarian tetap diulang (mis. setelah galat jaringan).
  const [ulang, setUlang] = useState(0)

  // Isian formulir mengikuti URL setiap kali URL berubah (mis. tombol kembali).
  const [kunciIsian, setKunciIsian] = useState(kunciUrl)
  if (kunciIsian !== kunciUrl) {
    setKunciIsian(kunciUrl)
    setIsian(isianUrl)
  }

  /** tampilkanPesan(pesan): pesan kesalahan umum (bukan milik satu kolom). */
  const tampilkanPesan = (teks: string) => setPesan(teks)
  /** tandaiKolomSalah(galat): kolom yang salah ditandai dengan pesannya; hasil disembunyikan (isian tetap). */
  const tandaiKolomSalah = (galatBaru: Partial<Record<K, string>>) => setGalat(galatBaru)
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

  // URL berubah -> validasi -> cari.
  useEffect(() => {
    setPesan('')
    if (kolom.every((k) => !isianUrl[k])) {
      setGalat({})
      setHasil(null)
      return
    }
    const lokal = validasi(isianUrl, hariIniWib())
    setGalat(lokal)
    if (adaGalat(lokal)) return
    let batal = false
    setSibuk(true)
    void panggil<{ penerbangan?: HasilPencarian[]; galat?: Partial<Record<K, string>>; pesan?: string }>(
      `${endpoint}?${new URLSearchParams(isianUrl)}`,
    ).then((respons) => {
      if (batal) return
      setSibuk(false)
      if (respons.status === 200) tampilkanHasil(respons.data.penerbangan ?? [])
      else if (respons.data.galat) tandaiKolomSalah(respons.data.galat)
      else tampilkanPesan(respons.data.pesan ?? PESAN_GALAT_UMUM)
    })
    return () => {
      batal = true
      setSibuk(false)
    }
    // isianUrl diturunkan dari kunciUrl; kolom, validasi dan endpoint tetap per jenis pencarian.
  }, [kunciUrl, ulang])

  const ubahIsian = (k: K, nilai: string) => setIsian((isianLama) => ({ ...isianLama, [k]: nilai }))

  /** Kirim formulir: validasi lokal menolak dan menandai kolom; bila valid, tulis ke URL. */
  function cari() {
    const lokal = validasi(isian, hariIniWib())
    tandaiKolomSalah(lokal)
    if (adaGalat(lokal)) return
    if (kunci(isian) === kunciUrl) setUlang((jumlahUlang) => jumlahUlang + 1)
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
    /** Isian pencarian yang berlaku (dari URL). */
    isianUrl,
    /** Berubah setiap pencarian baru (URL berubah); dipakai untuk mengatur ulang keadaan alat hasil. */
    kunciPencarian: kunciUrl,
  }
}

const PENCARIAN_US3: JenisPencarian<'asal' | 'tujuan' | 'tanggal'> = {
  kolom: ['asal', 'tujuan', 'tanggal'],
  validasi: validasiIsianPencarian,
  endpoint: '/penerbangan/cari',
}

const PENCARIAN_US8A: JenisPencarian<'asal' | 'tujuan' | 'tanggal' | 'jumlah'> = {
  kolom: ['asal', 'tujuan', 'tanggal', 'jumlah'],
  validasi: validasiIsianPencarianPengunjung,
  endpoint: '/travel/cari',
}

/** US-3 Mencari penerbangan (Formulir Pencarian dan Hasil Pencarian). */
export const useCariPenerbangan = () => useCariDiUrl(PENCARIAN_US3)

/** US-8a (Formulir Pencarian Pengunjung dan Hasil Pencarian Pengunjung): isian US-3 ditambah jumlah penumpang (2a-2d). */
export const useCariPengunjung = () => useCariDiUrl(PENCARIAN_US8A)
