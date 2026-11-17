// Tanggal kalender tanpa jam, disimpan sebagai teks ISO `YYYY-MM-DD`.
// Semua hitungan dilakukan di UTC pada teks itu supaya tidak bergeser oleh zona waktu.
export type TanggalIso = string

const POLA = /^(\d{4})-(\d{2})-(\d{2})$/

export function adalahTanggalIso(s: unknown): s is TanggalIso {
  if (typeof s !== 'string') return false
  const m = POLA.exec(s)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.toISOString().slice(0, 10) === s
}

const keUtc = (t: TanggalIso) => Date.parse(`${t}T00:00:00Z`)
const dariUtc = (ms: number): TanggalIso => new Date(ms).toISOString().slice(0, 10)

/** 0 = Minggu ... 6 = Sabtu. */
export const hariDalamMinggu = (t: TanggalIso) => new Date(keUtc(t)).getUTCDay()

export const tambahHari = (t: TanggalIso, n: number): TanggalIso => dariUtc(keUtc(t) + n * 86_400_000)

export const tahunDari = (t: TanggalIso) => Number(t.slice(0, 4))

/** Tanggal hari ini menurut waktu server WIB (Asia/Jakarta). `sekarang` bisa disuntik untuk tes. */
export function hariIniWib(sekarang: Date = new Date()): TanggalIso {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(sekarang)
}
