// Pembantu tanggal netral modul (dipakai cuti dan tiket). Tanggal kalender tanpa jam = teks ISO `YYYY-MM-DD`;
// semua hitungan di UTC pada teks itu supaya tidak bergeser oleh zona waktu. Waktu lokal = teks `HH:MM`.
export type TanggalIso = string

const POLA = /^(\d{4})-(\d{2})-(\d{2})$/

export function adalahTanggalIso(nilai: unknown): nilai is TanggalIso {
  if (typeof nilai !== 'string') return false
  const cocok = POLA.exec(nilai)
  if (!cocok) return false
  const tanggal = new Date(Date.UTC(Number(cocok[1]), Number(cocok[2]) - 1, Number(cocok[3])))
  return tanggal.toISOString().slice(0, 10) === nilai
}

const keUtc = (tanggal: TanggalIso) => Date.parse(`${tanggal}T00:00:00Z`)
const dariUtc = (ms: number): TanggalIso => new Date(ms).toISOString().slice(0, 10)

/** 0 = Minggu ... 6 = Sabtu. */
export const hariDalamMinggu = (tanggal: TanggalIso) => new Date(keUtc(tanggal)).getUTCDay()

export const tambahHari = (tanggal: TanggalIso, jumlahHari: number): TanggalIso => dariUtc(keUtc(tanggal) + jumlahHari * 86_400_000)

export const tahunDari = (tanggal: TanggalIso) => Number(tanggal.slice(0, 4))

/** Tanggal hari ini menurut waktu server WIB (Asia/Jakarta). `sekarang` bisa disuntik untuk tes. */
export function hariIniWib(sekarang: Date = new Date()): TanggalIso {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(sekarang)
}

const POLA_WAKTU = /^(\d{2}):(\d{2})$/

/** Pecah tanggal ISO + waktu lokal `HH:MM` menjadi komponen; null bila format salah. */
export function pecahTanggalWaktu(tanggal: TanggalIso, waktu: string) {
  const bagianTanggal = POLA.exec(tanggal)
  const bagianWaktu = POLA_WAKTU.exec(waktu)
  if (!bagianTanggal || !bagianWaktu) return null
  return { tahun: Number(bagianTanggal[1]), bulan: Number(bagianTanggal[2]), hari: Number(bagianTanggal[3]), jam: Number(bagianWaktu[1]), menit: Number(bagianWaktu[2]) }
}
