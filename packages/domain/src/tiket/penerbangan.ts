import { pecahTanggalWaktu, type TanggalIso } from '../umum/tanggal.ts'

/** Zona waktu IANA sebuah Kota (keputusan G1). */
export type ZonaWaktu = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'

export const SINGKATAN_ZONA: Record<ZonaWaktu, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
}

/** Singkatan zona: WIB, WITA atau WIT. */
export const singkatanZona = (zona: ZonaWaktu): string => SINGKATAN_ZONA[zona]

export interface Kota {
  id: number
  nama: string
  zonaWaktu: ZonaWaktu
}

export interface Maskapai {
  nama: string
}

/** Penerbangan: tanggalKeberangkatan `YYYY-MM-DD`; waktuBerangkat dan waktuTiba `HH:MM` lokal (asal / tujuan); harga Rupiah per penumpang. */
export interface Penerbangan {
  nomorPenerbangan: string
  tanggalKeberangkatan: string
  waktuBerangkat: string
  waktuTiba: string
  harga: number
  jumlahKursi: number
  asal: Kota
  tujuan: Kota
}

/** Selisih zona dari UTC (ms) pada suatu instan. Bekerja untuk zona IANA apa pun, termasuk yang punya DST. */
function offsetZona(zona: ZonaWaktu, instan: number): number {
  const bagian = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instan))
  const nilai = (jenis: string) => Number(bagian.find((b) => b.type === jenis)!.value)
  const sebagaiUtc = Date.UTC(
    nilai('year'),
    nilai('month') - 1,
    nilai('day'),
    nilai('hour'),
    nilai('minute'),
    nilai('second'),
  )
  return sebagaiUtc - Math.floor(instan / 1000) * 1000
}

/** Ubah tanggal + waktu lokal di sebuah zona menjadi instan absolut (ms sejak epoch). NaN bila format salah. */
export function instanDariWaktuLokal(tanggal: TanggalIso, waktu: string, zona: ZonaWaktu): number {
  const p = pecahTanggalWaktu(tanggal, waktu)
  if (!p) return NaN
  const lokalSebagaiUtc = Date.UTC(p.tahun, p.bulan - 1, p.hari, p.jam, p.menit)
  // Dua iterasi menyelesaikan offset di sekitar pergantian DST; zona Indonesia tanpa DST selesai di iterasi pertama.
  let instan = lokalSebagaiUtc - offsetZona(zona, lokalSebagaiUtc)
  instan = lokalSebagaiUtc - offsetZona(zona, instan)
  return instan
}

/** Kebalikan `instanDariWaktuLokal`: tanggal ISO dan waktu `HH:MM` menurut jam dinding di zona itu pada suatu instan. */
export function waktuLokalDariInstan(instan: number, zona: ZonaWaktu): { tanggal: TanggalIso; waktu: string } {
  const iso = new Date(instan + offsetZona(zona, instan)).toISOString()
  return { tanggal: iso.slice(0, 10), waktu: iso.slice(11, 16) }
}

/** /waktuBerangkatAbsolut: waktu keberangkatan lokal di zona Kota asal sebagai instan absolut (G1). */
export const waktuBerangkatAbsolut = (
  f: Pick<Penerbangan, 'tanggalKeberangkatan' | 'waktuBerangkat' | 'asal'>,
): number => instanDariWaktuLokal(f.tanggalKeberangkatan, f.waktuBerangkat, f.asal.zonaWaktu)

/** /sisaKursi = jumlahKursi - penumpang pada Pemesanan yang tidak berstatus Cancelled. */
export const sisaKursi = (jumlahKursi: number, jumlahPenumpangAktif: number): number =>
  jumlahKursi - jumlahPenumpangAktif

/** /tersedia = waktuBerangkatAbsolut() > now() and sisaKursi >= 1. */
export const tersedia = (
  f: Pick<Penerbangan, 'tanggalKeberangkatan' | 'waktuBerangkat' | 'asal' | 'jumlahKursi'>,
  sekarang: Date,
  jumlahPenumpangAktif: number,
): boolean => waktuBerangkatAbsolut(f) > sekarang.getTime() && sisaKursi(f.jumlahKursi, jumlahPenumpangAktif) >= 1

/** inv KotaBerbeda: self.asal <> self.tujuan. */
export const memenuhiKotaBerbeda = (f: Pick<Penerbangan, 'asal' | 'tujuan'>): boolean => f.asal.id !== f.tujuan.id

/**
 * inv TidakOverbooking: self.sisaKursi >= 0. Basis data hanya menjaga `jumlah_kursi >= 0`;
 * perlindungan penuh terhadap overbooking adalah `AlokasiKursi` (tabel alokasi_kursi, lihat alokasiKursi.ts).
 */
export const memenuhiTidakOverbooking = (jumlahKursi: number, jumlahPenumpangAktif: number): boolean =>
  sisaKursi(jumlahKursi, jumlahPenumpangAktif) >= 0
