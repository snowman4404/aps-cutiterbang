// Control PengendaliPemesanan (US-2a, kontrak C1).
import {
  validasiDataPenumpang as validasiDataWajib,
  type DataWajibMentah,
  type GalatDataWajib,
  type InformasiPenerbangan,
  type TanggalIso,
  type TiketSaya,
} from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaPemesanan } from './antarmukaPemesanan.ts'
import { buatPembuatPemesanan, GALAT_KODE_TIDAK_UNIK } from './pembuatPemesanan.ts'
import { keInformasiPenerbangan } from './tiketSaya.ts'

export { GALAT_KODE_TIDAK_UNIK }

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
  const pembuat = buatPembuatPemesanan(katalog, data, sekarang, acak)

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
   * konfirmasi(f, dataPenumpang) = kontrak C1: penerbangan ada, validasi (7a), penerbangan tersedia, alokasiKursi(kode, 1) (7b),
   * lalu Pemesanan(WaitingForThePayment) dengan satu Penumpang yang mewakili akun. Gagal = tidak ada yang dibuat.
   */
  async function konfirmasi(akun: Akun, idPenerbangan: number, mentah: DataWajibMentah): Promise<HasilKonfirmasi> {
    const f = await katalog.ambilPenerbangan(idPenerbangan)
    if (!f) return { hasil: 'tidakDitemukan' }

    const v = validasiDataPenumpang(mentah)
    if ('galat' in v) return { hasil: 'galat', galat: v.galat }

    // 7b: kursi habis atau sudah berangkat; penolakan sahih dari alokasiKursi (atomik) di dalam `buat`.
    return pembuat.buat(f, akun, [{ akunId: akun.id, ...v.data }])
  }

  return { informasiPenerbangan, siapkanRingkasan, validasiDataPenumpang, buatKodeUnik: pembuat.buatKodeUnik, konfirmasi }
}
