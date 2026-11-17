// Data seed modul tiket (stand-in katalog penerbangan). Murni data, tanpa I/O, supaya tes dan e2e
// bisa memakainya. Semua tanggal dihitung dari `hariIni` (WIB) agar demo selalu bermakna.
import { tambahHari, type TanggalIso, type ZonaWaktu } from '@cutiterbang/domain'

export interface DataKota {
  nama: string
  zonaWaktu: ZonaWaktu
}
export interface DataPenerbangan {
  nomorPenerbangan: string
  maskapai: string
  asal: string
  tujuan: string
  tanggalKeberangkatan: TanggalIso
  waktuBerangkat: string
  waktuTiba: string
  harga: number
  jumlahKursi: number
}

export const JUMLAH_HARI_PENERBANGAN = 30

export const KOTA: DataKota[] = [
  { nama: 'Jakarta', zonaWaktu: 'Asia/Jakarta' },
  { nama: 'Surabaya', zonaWaktu: 'Asia/Jakarta' },
  { nama: 'Yogyakarta', zonaWaktu: 'Asia/Jakarta' },
  { nama: 'Medan', zonaWaktu: 'Asia/Jakarta' },
  { nama: 'Denpasar', zonaWaktu: 'Asia/Makassar' },
  { nama: 'Makassar', zonaWaktu: 'Asia/Makassar' },
  { nama: 'Balikpapan', zonaWaktu: 'Asia/Makassar' },
  { nama: 'Jayapura', zonaWaktu: 'Asia/Jayapura' },
]

// Nama karangan (bukan merek maskapai sungguhan) dan kode dua huruf nomor penerbangan.
export const MASKAPAI: { nama: string; kode: string }[] = [
  { nama: 'Nusa Air', kode: 'NA' },
  { nama: 'Samudra Jaya', kode: 'SJ' },
  { nama: 'Bayu Wings', kode: 'BW' },
  { nama: 'Pelangi Air', kode: 'PA' },
]

/** Rute dan hari yang dipakai demo/tes/e2e; semuanya ada di `buatDataPenerbangan`. */
export const DEMO = {
  /** Rute padat: 5 penerbangan per hari, urutan seed berbeda dari urutan berangkat pada `hariKe`. */
  rutePadat: { asal: 'Jakarta', tujuan: 'Denpasar', hariKe: 3 },
  /** G1: berangkat hari ini 00:00 WIT (sudah berangkat menurut WIB); satu-satunya di rute dan tanggal itu. */
  sudahBerangkat: { asal: 'Jayapura', tujuan: 'Makassar', nomorPenerbangan: 'PA990', waktuBerangkat: '00:00' },
  /** Lintas zona: waktu tiba dalam WIT, berbeda dari WIB. */
  lintasZona: { asal: 'Jakarta', tujuan: 'Jayapura', hariKe: 5 },
  /** Rute valid tanpa penerbangan sama sekali (untuk "Penerbangan tidak ditemukan"). */
  tanpaPenerbangan: { asal: 'Medan', tujuan: 'Jayapura' },
} as const

const OFFSET_JAM: Record<ZonaWaktu, number> = { 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 }
const ZONA = new Map(KOTA.map((k) => [k.nama, k.zonaWaktu]))

// [asal, tujuan, durasi terbang (menit), padat?]; dibuat dua arah. Medan-Jayapura sengaja tidak ada.
const RUTE_DASAR: [string, string, number, boolean][] = [
  ['Jakarta', 'Surabaya', 90, true],
  ['Jakarta', 'Yogyakarta', 70, false],
  ['Jakarta', 'Medan', 150, true],
  ['Jakarta', 'Denpasar', 120, true],
  ['Jakarta', 'Makassar', 150, true],
  ['Jakarta', 'Balikpapan', 130, false],
  ['Jakarta', 'Jayapura', 330, false],
  ['Surabaya', 'Denpasar', 60, true],
  ['Surabaya', 'Makassar', 105, false],
  ['Surabaya', 'Balikpapan', 100, false],
  ['Yogyakarta', 'Denpasar', 90, false],
  ['Denpasar', 'Makassar', 90, false],
  ['Makassar', 'Jayapura', 150, false],
  ['Makassar', 'Balikpapan', 75, false],
]

const WAKTU_PADAT = ['06:00', '08:30', '11:15', '14:00', '17:30']
const WAKTU_BIASA = ['07:30', '15:00']
const FAKTOR_HARGA = [0.9, 1.1, 1.0, 1.25, 1.05]

const pad = (n: number) => String(n).padStart(2, '0')
const keMenit = (w: string) => Number(w.slice(0, 2)) * 60 + Number(w.slice(3))
const keWaktu = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

/** Harga dasar per rute (Rupiah) dari durasi terbang, dibulatkan ke 5.000. */
const hargaDasar = (durasi: number) => 450_000 + durasi * 4_500

export function buatDataPenerbangan(hariIni: TanggalIso): {
  kota: DataKota[]
  maskapai: { nama: string }[]
  penerbangan: DataPenerbangan[]
} {
  const penerbangan: DataPenerbangan[] = []

  RUTE_DASAR.flatMap(([a, t, d, padat]) => [
    { asal: a, tujuan: t, durasi: d, padat },
    { asal: t, tujuan: a, durasi: d, padat },
  ]).forEach((rute, idxRute) => {
    const selisihZona = OFFSET_JAM[ZONA.get(rute.tujuan)!] - OFFSET_JAM[ZONA.get(rute.asal)!]
    const waktu = rute.padat ? WAKTU_PADAT : WAKTU_BIASA
    for (let hari = 0; hari < JUMLAH_HARI_PENERBANGAN; hari++) {
      // Jayapura -> Makassar hari ini hanya penerbangan demo G1 (ditambahkan di bawah).
      if (hari === 0 && rute.asal === 'Jayapura' && rute.tujuan === 'Makassar') continue
      const tanggal = tambahHari(hariIni, hari)
      waktu.forEach((berangkat, slot) => {
        const tiba = keMenit(berangkat) + rute.durasi + selisihZona * 60
        if (tiba < 0 || tiba >= 24 * 60) return // jaga: tiba di hari lokal yang sama
        const m = MASKAPAI[(idxRute + slot) % MASKAPAI.length]!
        penerbangan.push({
          nomorPenerbangan: `${m.kode}${100 + idxRute * 10 + slot}`,
          maskapai: m.nama,
          asal: rute.asal,
          tujuan: rute.tujuan,
          tanggalKeberangkatan: tanggal,
          waktuBerangkat: berangkat,
          waktuTiba: keWaktu(tiba),
          harga: Math.round((hargaDasar(rute.durasi) * FAKTOR_HARGA[slot % FAKTOR_HARGA.length]!) / 5_000) * 5_000,
          jumlahKursi: 120 + ((idxRute + slot) % 4) * 20,
        })
      })
    }
  })

  // (a) Urutan seed berbeda dari urutan berangkat pada rute padat di hariKe: balik urutan penyisipannya.
  const { rutePadat } = DEMO
  const tanggalPadat = tambahHari(hariIni, rutePadat.hariKe)
  const cocokPadat = (p: DataPenerbangan) =>
    p.asal === rutePadat.asal && p.tujuan === rutePadat.tujuan && p.tanggalKeberangkatan === tanggalPadat
  const posisi = penerbangan.flatMap((p, i) => (cocokPadat(p) ? [i] : []))
  const terbalik = posisi.map((i) => penerbangan[i]!).reverse()
  posisi.forEach((i, k) => {
    penerbangan[i] = terbalik[k]!
  })

  // (b) G1: 00:00 WIT hari ini = 22:00 WIB kemarin, jadi selalu sudah berangkat. Tiba 01:30 WITA.
  const g1 = DEMO.sudahBerangkat
  penerbangan.push({
    nomorPenerbangan: g1.nomorPenerbangan,
    maskapai: 'Pelangi Air',
    asal: g1.asal,
    tujuan: g1.tujuan,
    tanggalKeberangkatan: hariIni,
    waktuBerangkat: g1.waktuBerangkat,
    waktuTiba: '01:30',
    harga: 900_000,
    jumlahKursi: 120,
  })

  return { kota: KOTA, maskapai: MASKAPAI.map(({ nama }) => ({ nama })), penerbangan }
}
