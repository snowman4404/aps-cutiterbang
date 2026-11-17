// AlokasiKursi: entitas desain di dalam agregat Penerbangan yang menjaga inv TidakOverbooking (spec "Batas agregat").

export const PESAN_KURSI_HABIS = 'Kursi sudah habis'

/**
 * Apakah `jumlah` kursi boleh dialokasikan: jumlahKursi - (terpakai + jumlah) >= 0.
 * Aturan ini yang berlaku: `PengendaliPemesanan.konfirmasi` memakainya untuk jalan pintas 7b, dan
 * `antarmukaPemesanan.alokasiKursi` adalah implementasi atomiknya di SQL (INSERT ... SELECT ... WHERE), satu-satunya
 * cara yang aman dari balapan. Tes API mengikat keduanya: SQL menerima tepat bila `bolehAlokasi` menerima.
 */
export const bolehAlokasi = (jumlahKursi: number, terpakai: number, jumlah: number): boolean =>
  jumlah > 0 && jumlahKursi - (terpakai + jumlah) >= 0
