// Control PengendaliPemesanan (US-2a, kontrak C1) dan pemetaan Pemesanan -> baris "Tiket Saya" yang dipakai
// juga oleh PengendaliPembatalan.
import {
  buatKodeBooking,
  dapatDibatalkanPada,
  LABEL_STATUS_BOOKING,
  PESAN_KURSI_HABIS,
  tersedia,
  validasiDataPenumpang,
  type DataWajibMentah,
  type GalatDataWajib,
  type InformasiPenerbangan,
  type TanggalIso,
  type TiketSaya,
} from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import { keHasilPencarian, type AntarmukaKatalogPenerbangan, type PenerbanganLengkap } from './antarmukaKatalogPenerbangan.ts'
import { adalahKodeBentrok, type AntarmukaPemesanan, type PemesananBaris } from './antarmukaPemesanan.ts'

const PERCOBAAN_KODE = 5

/** informasiPenerbangan: baris hasil pencarian + /tersedia. */
export const keInformasiPenerbangan = (f: PenerbanganLengkap, penumpangAktif: number, sekarang: Date): InformasiPenerbangan => ({
  ...keHasilPencarian(f, penumpangAktif),
  tersedia: tersedia(f, sekarang, penumpangAktif),
})

/**
 * Baris Tiket Saya untuk `akun`. `dapatDibatalkan` hanya benar bila akun adalah pemesan (G4) dan
 * Pemesanan.dapatDibatalkan() berlaku (belum Cancelled, belum berangkat menurut waktu setempat, G1).
 */
export async function muatTiketSaya(
  katalog: AntarmukaKatalogPenerbangan,
  baris: PemesananBaris[],
  akun: Pick<Akun, 'id'>,
  sekarang: Date,
): Promise<TiketSaya[]> {
  const ids = [...new Set(baris.map((b) => b.penerbanganId))]
  const [penerbangan, aktif] = await Promise.all([katalog.ambilPenerbanganUntuk(ids), katalog.jumlahPenumpangAktif(ids)])
  return baris.map((b) => {
    const f = penerbangan.get(b.penerbanganId)!
    return {
      kode: b.kode,
      status: b.status,
      label: LABEL_STATUS_BOOKING[b.status],
      waktuDibuat: b.waktuDibuat.toISOString(),
      dapatDibatalkan: b.pemesanId === akun.id && dapatDibatalkanPada(b.status, f, sekarang),
      penumpang: b.penumpang.map((p) => p.namaLengkap),
      penerbangan: keInformasiPenerbangan(f, aktif.get(f.id) ?? 0, sekarang),
    }
  })
}

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
  const validasiPenumpang = (mentah: DataWajibMentah) => validasiDataPenumpang(mentah, hariIni())

  /** buatKodeUnik (langkah 8): kode acak yang belum dipakai pemesanan mana pun (kode normal unik, G3). */
  async function buatKodeUnik(): Promise<string> {
    for (let i = 0; i < PERCOBAAN_KODE; i++) {
      const kode = buatKodeBooking(acak)
      if (!(await data.cariDenganKode(kode))) return kode
    }
    throw new Error('Tidak berhasil membuat kode booking yang unik')
  }

  /**
   * konfirmasi(f, dataPenumpang) = kontrak C1: penerbangan ada, validasi (7a), penerbangan tersedia, alokasiKursi(kode, 1) (7b),
   * lalu Pemesanan(WaitingForThePayment) dengan satu Penumpang yang mewakili akun. Gagal = tidak ada yang dibuat.
   */
  async function konfirmasi(akun: Akun, idPenerbangan: number, mentah: DataWajibMentah): Promise<HasilKonfirmasi> {
    const info = await informasiPenerbangan(idPenerbangan)
    if (!info) return { hasil: 'tidakDitemukan' }

    const v = validasiPenumpang(mentah)
    if ('galat' in v) return { hasil: 'galat', galat: v.galat }

    // 7b: sudah habis atau sudah berangkat. Ini hanya jalan pintas; penolakan sesungguhnya ada di alokasiKursi.
    if (!info.tersedia) return { hasil: 'habis', pesan: PESAN_KURSI_HABIS }

    for (let i = 0; i < PERCOBAAN_KODE; i++) {
      const kode = await buatKodeUnik()
      try {
        const alokasi = await data.alokasiKursi(
          { kode, penerbanganId: idPenerbangan, pemesanId: akun.id, waktuDibuat: sekarang(), data: v.data },
          1,
        )
        if (alokasi === 'ditolak') return { hasil: 'habis', pesan: PESAN_KURSI_HABIS }
        const baru = (await data.cariDenganKode(kode))!
        const [pemesanan] = await muatTiketSaya(katalog, [baru], akun, sekarang())
        return { hasil: 'berhasil', pemesanan: pemesanan! }
      } catch (e) {
        if (!adalahKodeBentrok(e)) throw e // bentrok kode karena balapan: buat kode baru dan ulangi
      }
    }
    throw new Error('Tidak berhasil membuat kode booking yang unik')
  }

  return { informasiPenerbangan, siapkanRingkasan, validasiDataPenumpang: validasiPenumpang, buatKodeUnik, konfirmasi }
}
