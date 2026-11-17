// Control PengendaliPemesanan (US-2a, kontrak C1).
import {
  bolehAlokasi,
  buatKodeBooking,
  PESAN_KURSI_HABIS,
  validasiDataPenumpang as validasiDataWajib,
  waktuBerangkatAbsolut,
  type DataWajibMentah,
  type GalatDataWajib,
  type InformasiPenerbangan,
  type TanggalIso,
  type TiketSaya,
} from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { adalahKodeBentrok, type AntarmukaPemesanan } from './antarmukaPemesanan.ts'
import { keInformasiPenerbangan, muatTiketSaya } from './tiketSaya.ts'

const PERCOBAAN_KODE = 5
export const GALAT_KODE_TIDAK_UNIK = 'Tidak berhasil membuat kode booking yang unik'

export type HasilKonfirmasi =
  | { hasil: 'galat'; galat: GalatDataWajib }
  | { hasil: 'tidakDitemukan' }
  | { hasil: 'habis'; pesan: string }
  | { hasil: 'berhasil'; pemesanan: TiketSaya }

export function buatPengendaliPemesanan(
  katalog: AntarmukaKatalogPenerbangan,
  data: AntarmukaPemesanan,
  hariIni: () => TanggalIso,
  sekarang: () => Date,
  acak: () => number = Math.random,
) {
  /** informasiPenerbangan: info penerbangan + sisaKursi + tersedia, atau null bila tidak ada. */
  async function informasiPenerbangan(id: number): Promise<InformasiPenerbangan | null> {
    const f = await katalog.ambilPenerbangan(id)
    if (!f) return null
    const aktif = (await katalog.jumlahPenumpangAktif([id])).get(id) ?? 0
    return keInformasiPenerbangan(f, aktif, sekarang())
  }

  /** siapkanRingkasan (langkah 5): ringkasan informasi penerbangan yang dipilih. */
  const siapkanRingkasan = async (id: number) => {
    const penerbangan = await informasiPenerbangan(id)
    return penerbangan ? { penerbangan } : null
  }

  /** validasiDataPenumpang (langkah 7, 7a): setiap kolom wajib dan berformat valid. */
  const validasiDataPenumpang = (mentah: DataWajibMentah) => validasiDataWajib(mentah, hariIni())

  /**
   * buatKodeUnik (langkah 8): satu kode acak yang saat ini belum dipakai pemesanan mana pun (kode normal unik, G3),
   * atau null bila kode acak itu sudah dipakai. Pengulangan ada di `konfirmasi` (satu-satunya loop percobaan).
   */
  async function buatKodeUnik(): Promise<string | null> {
    const kode = buatKodeBooking(acak)
    return (await data.cariDenganKode(kode)) ? null : kode
  }

  /**
   * konfirmasi(f, dataPenumpang) = kontrak C1: penerbangan ada, validasi (7a), penerbangan tersedia, alokasiKursi(kode, 1) (7b),
   * lalu Pemesanan(WaitingForThePayment) dengan satu Penumpang yang mewakili akun. Gagal = tidak ada yang dibuat.
   */
  async function konfirmasi(akun: Akun, idPenerbangan: number, mentah: DataWajibMentah): Promise<HasilKonfirmasi> {
    const f = await katalog.ambilPenerbangan(idPenerbangan)
    if (!f) return { hasil: 'tidakDitemukan' }

    const v = validasiDataPenumpang(mentah)
    if ('galat' in v) return { hasil: 'galat', galat: v.galat }

    // 7b (jalan pintas): kursi tidak cukup menurut aturan domain bolehAlokasi. Penolakan yang sahih tetap dari
    // alokasiKursi, yang menerapkan aturan yang sama secara atomik di SQL; hitungan ini bisa usang karena balapan.
    const terpakai = (await katalog.jumlahPenumpangAktif([idPenerbangan])).get(idPenerbangan) ?? 0
    if (!bolehAlokasi(f.jumlahKursi, terpakai, 1)) return { hasil: 'habis', pesan: PESAN_KURSI_HABIS }

    for (let i = 0; i < PERCOBAAN_KODE; i++) {
      const kode = await buatKodeUnik()
      if (kode === null) continue // kode acak sudah dipakai: coba kode lain

      // 7b (sudah berangkat): waktu berangkat tidak pernah berubah, jadi memeriksanya dengan sekarang() yang baru
      // tepat sebelum alokasiKursi setara dengan memeriksanya di dalam transaksi; hanya jumlah kursi yang bisa
      // berubah serentak, dan itu dijaga SQL di alokasiKursi.
      const waktuDibuat = sekarang()
      if (!(waktuBerangkatAbsolut(f) > waktuDibuat.getTime())) return { hasil: 'habis', pesan: PESAN_KURSI_HABIS }

      try {
        const alokasi = await data.alokasiKursi(
          { kode, penerbanganId: idPenerbangan, pemesanId: akun.id, waktuDibuat, data: v.data },
          1,
        )
        if (alokasi === 'ditolak') return { hasil: 'habis', pesan: PESAN_KURSI_HABIS }
        const baru = (await data.cariDenganKode(kode))!
        const [pemesanan] = await muatTiketSaya(katalog, [baru], akun, sekarang())
        return { hasil: 'berhasil', pemesanan: pemesanan! }
      } catch (galat) {
        if (!adalahKodeBentrok(galat)) throw galat // bentrok kode karena balapan: buat kode baru dan ulangi
      }
    }
    throw new Error(GALAT_KODE_TIDAK_UNIK)
  }

  return { informasiPenerbangan, siapkanRingkasan, validasiDataPenumpang, buatKodeUnik, konfirmasi }
}
