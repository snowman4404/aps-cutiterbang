// Pembantu tanggal kecil milik modul tiket (salinan sengaja, supaya tidak mengimpor modul cuti).
// Tanggal kalender = teks ISO `YYYY-MM-DD`; waktu lokal = teks `HH:MM`.
const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/
const POLA_WAKTU = /^(\d{2}):(\d{2})$/

export function adalahTanggalValid(s: unknown): s is string {
  if (typeof s !== 'string') return false
  const m = POLA_TANGGAL.exec(s)
  if (!m) return false
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10) === s
}

/** Pecah tanggal + waktu lokal menjadi komponen; null bila format salah. */
export function pecahTanggalWaktu(tanggal: string, waktu: string) {
  const t = POLA_TANGGAL.exec(tanggal)
  const w = POLA_WAKTU.exec(waktu)
  if (!t || !w) return null
  return { tahun: Number(t[1]), bulan: Number(t[2]), hari: Number(t[3]), jam: Number(w[1]), menit: Number(w[2]) }
}
