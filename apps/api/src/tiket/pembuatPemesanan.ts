// Pembuatan Pemesanan baru yang dipakai bersama PengendaliPemesanan (C1, satu penumpang) dan
// PengendaliPemesananPengunjung (C2, satu penumpang per pengunjung): buatKodeUnik, jalan pintas kursi (5b/7b),
// pemeriksaan sudah berangkat, alokasiKursi atomik dan satu-satunya loop percobaan kode.
import { bolehAlokasi, buatKodeBooking, PESAN_KURSI_HABIS, waktuBerangkatAbsolut, type TiketSaya } from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaKatalogPenerbangan, PenerbanganLengkap } from './antarmukaKatalogPenerbangan.ts'
import { adalahKodeBentrok, type AntarmukaPemesanan, type PenumpangBaris } from './antarmukaPemesanan.ts'
import { muatTiketSaya } from './tiketSaya.ts'

const PERCOBAAN_KODE = 5
export const GALAT_KODE_TIDAK_UNIK = 'Tidak berhasil membuat kode booking yang unik'

export type HasilBuatPemesanan = { hasil: 'habis'; pesan: string } | { hasil: 'berhasil'; pemesanan: TiketSaya }

export function buatPembuatPemesanan(
  katalog: AntarmukaKatalogPenerbangan,
  data: AntarmukaPemesanan,
  sekarang: () => Date,
  acak: () => number = Math.random,
) {
  /**
   * buatKodeUnik: satu kode acak yang saat ini belum dipakai pemesanan mana pun (kode normal unik, G3),
   * atau null bila kode acak itu sudah dipakai. Pengulangan ada di `buat` (satu-satunya loop percobaan).
   */
  async function buatKodeUnik(): Promise<string | null> {
    const kode = buatKodeBooking(acak)
    return (await data.cariDenganKode(kode)) ? null : kode
  }

  /**
   * Membuat Pemesanan(WaitingForThePayment) atas nama `pemesan` dengan satu Penumpang per entri `penumpang`
   * (data sudah divalidasi pemanggil), setelah alokasiKursi(kode, jumlah). Gagal (kursi kurang, sudah berangkat) =
   * tidak ada yang dibuat. Melempar `GALAT_KODE_TIDAK_UNIK` bila tidak ada kode unik setelah beberapa percobaan.
   */
  async function buat(f: PenerbanganLengkap, pemesan: Pick<Akun, 'id' | 'peran'>, penumpang: PenumpangBaris[]): Promise<HasilBuatPemesanan> {
    const jumlah = penumpang.length
    // 5b/7b (jalan pintas): kursi tidak cukup menurut aturan domain bolehAlokasi. Penolakan yang sahih tetap dari
    // alokasiKursi, yang menerapkan aturan yang sama secara atomik di SQL; hitungan ini bisa usang karena balapan.
    const terpakai = (await katalog.jumlahPenumpangAktif([f.id])).get(f.id) ?? 0
    if (!bolehAlokasi(f.jumlahKursi, terpakai, jumlah)) return { hasil: 'habis', pesan: PESAN_KURSI_HABIS }

    for (let i = 0; i < PERCOBAAN_KODE; i++) {
      const kode = await buatKodeUnik()
      if (kode === null) continue // kode acak sudah dipakai: coba kode lain

      // Sudah berangkat: waktu berangkat tidak pernah berubah, jadi memeriksanya dengan sekarang() yang baru
      // tepat sebelum alokasiKursi setara dengan memeriksanya di dalam transaksi; hanya jumlah kursi yang bisa
      // berubah serentak, dan itu dijaga SQL di alokasiKursi.
      const waktuDibuat = sekarang()
      if (!(waktuBerangkatAbsolut(f) > waktuDibuat.getTime())) return { hasil: 'habis', pesan: PESAN_KURSI_HABIS }

      try {
        const alokasi = await data.alokasiKursi({ kode, penerbanganId: f.id, pemesanId: pemesan.id, waktuDibuat, penumpang }, jumlah)
        if (alokasi === 'ditolak') return { hasil: 'habis', pesan: PESAN_KURSI_HABIS }
        const baru = (await data.cariDenganKode(kode))!
        const [pemesanan] = await muatTiketSaya(katalog, [baru], pemesan, sekarang())
        return { hasil: 'berhasil', pemesanan: pemesanan! }
      } catch (galat) {
        if (!adalahKodeBentrok(galat)) throw galat // bentrok kode karena balapan: buat kode baru dan ulangi
      }
    }
    throw new Error(GALAT_KODE_TIDAK_UNIK)
  }

  return { buatKodeUnik, buat }
}
