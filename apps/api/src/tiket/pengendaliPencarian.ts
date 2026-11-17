// Control PengendaliPencarian (US-3, tanpa login).
import {
  cocok,
  idKotaDariTeks,
  PESAN_ASAL_TIDAK_DIKENAL,
  PESAN_KOTA_SAMA,
  PESAN_TUJUAN_TIDAK_DIKENAL,
  rapikanIsian,
  urutkanMenurutWaktuBerangkat,
  validasiIsianPencarian,
  type GalatPencarian,
  type HasilPencarian,
  type IsianMentah,
  type TanggalIso,
} from '@cutiterbang/domain'
import { keHasilPencarian, type AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'

export function buatPengendaliPencarian(
  data: AntarmukaKatalogPenerbangan,
  hariIni: () => TanggalIso,
  sekarang: () => Date,
) {
  /** muatDaftarKota: US-3 langkah 1. */
  const muatDaftarKota = async () => ({ kota: await data.ambilDaftarKota() })

  /**
   * validasiIsian(asal, tujuan, tanggal): 3a, 3b, 3c, lalu kota harus ada dalam daftar kota yang dilayani.
   * Kota tidak dikenal didahulukan dari 3b (asal = tujuan dibandingkan sebagai id kota). Kosong = valid.
   */
  async function validasiIsian(mentah: IsianMentah): Promise<GalatPencarian> {
    const isian = rapikanIsian(mentah)
    const galat = validasiIsianPencarian(isian, hariIni())
    const idDikenal = new Set((await data.ambilDaftarKota()).map((kotaBaris) => kotaBaris.id))
    const tidakDikenal = (teks: string) => !idDikenal.has(idKotaDariTeks(teks) ?? NaN)
    if (!galat.asal && tidakDikenal(isian.asal)) galat.asal = PESAN_ASAL_TIDAK_DIKENAL
    if ((!galat.tujuan || galat.tujuan === PESAN_KOTA_SAMA) && tidakDikenal(isian.tujuan)) {
      galat.tujuan = PESAN_TUJUAN_TIDAK_DIKENAL
    }
    return galat
  }

  /** cariPenerbangan(isian): validasiIsian -> cocok -> urutkanMenurutWaktuBerangkat. Daftar kosong = tidak ditemukan. */
  async function cariPenerbangan(mentah: IsianMentah): Promise<{ galat: GalatPencarian } | { penerbangan: HasilPencarian[] }> {
    const galat = await validasiIsian(mentah)
    if (Object.keys(galat).length > 0) return { galat }

    const { asal, tujuan, tanggal } = rapikanIsian(mentah)
    const kriteria = { asalId: idKotaDariTeks(asal)!, tujuanId: idKotaDariTeks(tujuan)!, tanggal }
    const kandidat = await data.ambilPenerbanganRute(kriteria.asalId, kriteria.tujuanId, tanggal)
    const penumpangAktifPerId = await data.jumlahPenumpangAktif(kandidat.map((penerbanganKandidat) => penerbanganKandidat.id))
    const penumpangAktif = (id: number) => penumpangAktifPerId.get(id) ?? 0

    const sekarangIni = sekarang()
    const penerbanganCocok = kandidat.filter((kandidatPenerbangan) => cocok(kandidatPenerbangan, kriteria, sekarangIni, penumpangAktif(kandidatPenerbangan.id)))
    const penerbangan = urutkanMenurutWaktuBerangkat(penerbanganCocok).map((hasilCocok) => keHasilPencarian(hasilCocok, penumpangAktif(hasilCocok.id)))
    return { penerbangan }
  }

  return { muatDaftarKota, validasiIsian, cariPenerbangan }
}
