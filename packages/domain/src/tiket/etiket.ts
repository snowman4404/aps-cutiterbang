import { punyaPeran, type Peran } from '../akses/peran.ts'
import { singkatanZona } from './penerbangan.ts'
import type { HasilPencarian } from './pencarian.ts'
import type { StatusBooking } from './pemesanan.ts'

// US-8d dan keputusan G5/G6: e-tiket, penerimanya, dan isi emailnya. Murni, tanpa I/O.

/** G5: label e-tiket pemesanan yang sudah Cancelled (e-tiket tetap tersimpan, tetapi tidak sah). */
export const LABEL_ETIKET_DIBATALKAN = 'Dibatalkan'
/** G5: catatan yang menyertai e-tiket yang tidak berlaku. */
export const PESAN_ETIKET_TIDAK_BERLAKU = 'E-tiket ini tidak berlaku untuk perjalanan karena pemesanan dibatalkan'

/** G5: e-tiket hanya berlaku selama pemesanannya Confirmed (setelah Cancelled tetap ada, tetapi void). */
export const etiketBerlaku = (status: StatusBooking): boolean => status === 'Confirmed'

/** Nomor e-tiket yang diterbitkan `terbitkanETiket()` untuk satu kode booking reference (format seed: ET-CTB005). */
export const nomorETiketUntuk = (kode: string): string => `ET-${kode}`

/** Subjek email e-tiket. */
export const subjekETiket = (kode: string): string => `E-tiket ${kode}`

/**
 * Pemesanan.penerimaETiket() (US-8d AC1, keputusan G6): hanya pemesanan Manajer Travel yang dikirimi e-tiket, ke email pada
 * Profil setiap pengunjung yang diwakili sebuah Penumpang. Himpunan: email yang sama hanya sekali, urutan penumpang.
 * Pemesanan Calon Penumpang (US-2a) menghasilkan daftar kosong.
 */
export function penerimaETiket(peranPemesan: Peran, penumpang: readonly { profilEmail: string | null }[]): string[] {
  if (!punyaPeran(peranPemesan, ['ManajerTravel'])) return []
  const email = penumpang.map((p) => p.profilEmail?.trim() ?? '').filter((e) => e !== '')
  return [...new Set(email)]
}

/** Penerbangan.ringkasanPenerbangan() (US-9 langkah 5): nomor penerbangan dan tanggal keberangkatan. */
export const ringkasanPenerbangan = (f: Pick<HasilPencarian, 'nomorPenerbangan' | 'tanggalKeberangkatan'>) => ({
  nomorPenerbangan: f.nomorPenerbangan,
  tanggalKeberangkatan: f.tanggalKeberangkatan,
})

/** Isi e-tiket (US-8d langkah 2): nama semua penumpang, kode booking reference dan informasi penerbangan, plus nomor e-tiket. */
export interface IsiETiket {
  nomorETiket: string
  kode: string
  namaPenumpang: readonly string[]
  penerbangan: Pick<HasilPencarian, 'maskapai' | 'nomorPenerbangan' | 'asal' | 'tujuan' | 'tanggalKeberangkatan' | 'waktuBerangkat' | 'waktuTiba'>
}

/** Isi email e-tiket sebagai teks (satu baris per keterangan). */
export function teksETiket(e: IsiETiket): string {
  const { penerbangan: f } = e
  return [
    `E-tiket ${e.nomorETiket}`,
    `Kode booking reference: ${e.kode}`,
    `Penumpang: ${e.namaPenumpang.join(', ')}`,
    `Penerbangan: ${f.maskapai} ${f.nomorPenerbangan}`,
    `Tanggal keberangkatan: ${f.tanggalKeberangkatan}`,
    `Berangkat: ${f.asal.nama} ${f.waktuBerangkat} ${singkatanZona(f.asal.zonaWaktu)}`,
    `Tiba: ${f.tujuan.nama} ${f.waktuTiba} ${singkatanZona(f.tujuan.zonaWaktu)}`,
  ].join('\n')
}

/** Penumpang sebuah pemesanan saat e-tiket diterbitkan: nama pada baris Penumpang dan email Profil akun yang diwakilinya. */
export interface PenumpangETiket {
  akunId: number
  namaLengkap: string
  profilEmail: string | null
}

/** Satu email e-tiket untuk Layanan Email (`kirimETiket(e, email)`). */
export interface EmailETiket {
  akunId: number
  kepada: string
  subjek: string
  isi: string
}

/**
 * terbitkanETiket() dan penerimaETiket() (US-8d langkah 2 dan 3): nomor e-tiket dan satu email per alamat penerima (G6),
 * masing-masing dikaitkan dengan akun pengunjung pemilik alamat itu. Pemesanan Calon Penumpang: tanpa email.
 */
export function siapkanETiket(
  kode: string,
  peranPemesan: Peran,
  penumpang: readonly PenumpangETiket[],
  penerbangan: IsiETiket['penerbangan'],
): { nomorETiket: string; email: EmailETiket[] } {
  const nomorETiket = nomorETiketUntuk(kode)
  const penerima = penerimaETiket(peranPemesan, penumpang)
  if (penerima.length === 0) return { nomorETiket, email: [] }
  const isi = teksETiket({ nomorETiket, kode, namaPenumpang: penumpang.map((p) => p.namaLengkap), penerbangan })
  const email = penerima.map((kepada) => ({
    akunId: penumpang.find((p) => p.profilEmail?.trim() === kepada)!.akunId,
    kepada,
    subjek: subjekETiket(kode),
    isi,
  }))
  return { nomorETiket, email }
}
