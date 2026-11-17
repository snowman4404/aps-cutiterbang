// AlokasiKursi: entitas desain di dalam agregat Penerbangan yang menjaga inv TidakOverbooking (spec "Batas agregat").

export const PESAN_KURSI_HABIS = 'Kursi sudah habis'

/**
 * Apakah `jumlah` kursi boleh dialokasikan: jumlahKursi - (terpakai + jumlah) >= 0.
 * Basis data menerapkan aturan yang sama secara atomik (INSERT ... WHERE); ini rumus konseptualnya.
 */
export const bolehAlokasi = (jumlahKursi: number, terpakai: number, jumlah: number): boolean =>
  jumlah > 0 && jumlahKursi - (terpakai + jumlah) >= 0
