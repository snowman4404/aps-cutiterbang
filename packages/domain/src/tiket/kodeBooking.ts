// KodeBookingReference: sama tanpa membedakan kapital dan spasi tepi (celah G3).

/** normal(): trim + huruf kecil. */
export const normalKode = (s: string): string => s.trim().toLowerCase()

/** Dua kode sama bila normal()-nya sama. */
export const samaKode = (a: string, b: string): boolean => normalKode(a) === normalKode(b)

/** Tanpa huruf/angka yang mudah tertukar (I, O, 0, 1). */
export const HURUF_KODE_BOOKING = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PANJANG_KODE_BOOKING = 6

/** Kode acak 6 karakter kapital. `acak` bisa disuntik untuk tes. Keunikan dijamin pemanggil (buatKodeUnik). */
export function buatKodeBooking(acak: () => number = Math.random): string {
  let kode = ''
  for (let i = 0; i < PANJANG_KODE_BOOKING; i++) {
    kode += HURUF_KODE_BOOKING[Math.min(HURUF_KODE_BOOKING.length - 1, Math.floor(acak() * HURUF_KODE_BOOKING.length))]
  }
  return kode
}
