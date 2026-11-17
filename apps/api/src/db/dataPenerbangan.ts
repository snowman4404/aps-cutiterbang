// Data seed modul tiket (stand-in katalog penerbangan). Murni data, tanpa I/O, supaya tes dan e2e
// bisa memakainya. Semua tanggal dihitung dari `hariIni` (WIB) agar demo selalu bermakna.
import {
  instanDariWaktuLokal,
  tambahHari,
  waktuLokalDariInstan,
  type TanggalIso,
  type ZonaWaktu,
} from '@cutiterbang/domain'

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

/** Hari ini sampai hari ini + 30 (31 hari); `seed` menambah hari yang belum ada setiap kali server mulai. */
export const JUMLAH_HARI_PENERBANGAN = 31

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
  /** Satu kursi, sudah terjual oleh pemesanan seed (CTB004): sisaKursi 0, jadi tidak muncul di pencarian. */
  habis: { asal: 'Yogyakarta', tujuan: 'Surabaya', hariKe: 4, nomorPenerbangan: 'SJ901', waktuBerangkat: '09:00', waktuTiba: '10:00', harga: 650_000, maskapai: 'Samudra Jaya', jumlahKursi: 1 },
  /** Satu kursi, belum terjual: sisaKursi 1 (untuk demo "Kursi sudah habis" saat dua orang memesan kursi terakhir). */
  kursiTerakhir: { asal: 'Yogyakarta', tujuan: 'Surabaya', hariKe: 4, nomorPenerbangan: 'BW902', waktuBerangkat: '13:00', waktuTiba: '14:00', harga: 700_000, maskapai: 'Bayu Wings', jumlahKursi: 1 },
} as const

const ZONA = new Map(KOTA.map((kota) => [kota.nama, kota.zonaWaktu]))

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
    const zonaAsal = ZONA.get(rute.asal)!
    const zonaTujuan = ZONA.get(rute.tujuan)!
    const waktu = rute.padat ? WAKTU_PADAT : WAKTU_BIASA
    for (let hari = 0; hari < JUMLAH_HARI_PENERBANGAN; hari++) {
      // Jayapura -> Makassar hanya dilayani penerbangan demo G1 (ditambahkan di bawah).
      if (rute.asal === DEMO.sudahBerangkat.asal && rute.tujuan === DEMO.sudahBerangkat.tujuan) continue
      const tanggal = tambahHari(hariIni, hari)
      waktu.forEach((berangkat, slot) => {
        // Waktu tiba lokal di kota tujuan; dilewati bila jatuh di tanggal lain (jaga: tiba di tanggal yang sama).
        const instanTiba = instanDariWaktuLokal(tanggal, berangkat, zonaAsal) + rute.durasi * 60_000
        const tiba = waktuLokalDariInstan(instanTiba, zonaTujuan)
        if (tiba.tanggal !== tanggal) return
        const maskapaiTerbang = MASKAPAI[(idxRute + slot) % MASKAPAI.length]!
        penerbangan.push({
          nomorPenerbangan: `${maskapaiTerbang.kode}${100 + idxRute * 10 + slot}`,
          maskapai: maskapaiTerbang.nama,
          asal: rute.asal,
          tujuan: rute.tujuan,
          tanggalKeberangkatan: tanggal,
          waktuBerangkat: berangkat,
          waktuTiba: tiba.waktu,
          harga: Math.round((hargaDasar(rute.durasi) * FAKTOR_HARGA[slot % FAKTOR_HARGA.length]!) / 5_000) * 5_000,
          jumlahKursi: 120 + ((idxRute + slot) % 4) * 20,
        })
      })
    }
  })

  // (a) Urutan seed berbeda dari urutan berangkat pada rute padat di hariKe: balik urutan penyisipannya.
  const { rutePadat } = DEMO
  const tanggalPadat = tambahHari(hariIni, rutePadat.hariKe)
  const cocokPadat = (data: DataPenerbangan) =>
    data.asal === rutePadat.asal && data.tujuan === rutePadat.tujuan && data.tanggalKeberangkatan === tanggalPadat
  const posisi = penerbangan.flatMap((data, indeks) => (cocokPadat(data) ? [indeks] : []))
  const terbalik = posisi.map((indeks) => penerbangan[indeks]!).reverse()
  posisi.forEach((indeks, urutan) => {
    penerbangan[indeks] = terbalik[urutan]!
  })

  // (b) G1: satu-satunya penerbangan Jayapura -> Makassar, setiap hari pukul 00:00 WIT (tiba 01:30 WITA).
  // 00:00 WIT hari ini = 22:00 WIB kemarin, jadi penerbangan hari ini selalu sudah berangkat, pada hari seed mana pun.
  const g1 = DEMO.sudahBerangkat
  for (let hari = 0; hari < JUMLAH_HARI_PENERBANGAN; hari++) {
    penerbangan.push({
      nomorPenerbangan: g1.nomorPenerbangan,
      maskapai: 'Pelangi Air',
      asal: g1.asal,
      tujuan: g1.tujuan,
      tanggalKeberangkatan: tambahHari(hariIni, hari),
      waktuBerangkat: g1.waktuBerangkat,
      waktuTiba: '01:30',
      harga: 900_000,
      jumlahKursi: 120,
    })
  }

  // (c) Penerbangan demo pemesanan: satu rute Yogyakarta -> Surabaya yang hanya berisi dua penerbangan satu kursi.
  for (const d of [DEMO.habis, DEMO.kursiTerakhir]) {
    penerbangan.push({
      nomorPenerbangan: d.nomorPenerbangan,
      maskapai: d.maskapai,
      asal: d.asal,
      tujuan: d.tujuan,
      tanggalKeberangkatan: tambahHari(hariIni, d.hariKe),
      waktuBerangkat: d.waktuBerangkat,
      waktuTiba: d.waktuTiba,
      harga: d.harga,
      jumlahKursi: d.jumlahKursi,
    })
  }

  return { kota: KOTA, maskapai: MASKAPAI.map(({ nama }) => ({ nama })), penerbangan }
}
