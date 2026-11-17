// Control PengendaliPencarian (US-3, tanpa login).
import {
  adaGalatSegmen,
  cocok,
  idKotaDariTeks,
  jumlahSegmenSah,
  PESAN_ASAL_TIDAK_DIKENAL,
  PESAN_KOTA_SAMA,
  PESAN_TUJUAN_TIDAK_DIKENAL,
  rapikanIsian,
  saringSisaKursi,
  urutkanDariHargaTermurah,
  urutkanMenurutWaktuBerangkat,
  jumlahDariTeks,
  validasiIsianPencarian,
  validasiIsianPencarianPengunjung,
  validasiSetiapSegmen,
  type GalatPencarian,
  type GalatPencarianPengunjung,
  type GalatSegmen,
  type HasilPencarian,
  type IsianMentah,
  type IsianMentahPengunjung,
  type SegmenMentah,
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
    const galat = validasiIsianPencarian(rapikanIsian(mentah), hariIni())
    tandaiKotaTidakDikenal(mentah, galat, await ambilIdKotaDikenal())
    return galat
  }

  const ambilIdKotaDikenal = async () => new Set((await data.ambilDaftarKota()).map((kotaBaris) => kotaBaris.id))

  /** Kota yang tidak ada dalam daftar kota yang dilayani; mengubah `galat` (menang atas 3b). */
  function tandaiKotaTidakDikenal(mentah: IsianMentah, galat: GalatPencarian, idDikenal: Set<number>) {
    const isian = rapikanIsian(mentah)
    const tidakDikenal = (teks: string) => !idDikenal.has(idKotaDariTeks(teks) ?? NaN)
    if (!galat.asal && tidakDikenal(isian.asal)) galat.asal = PESAN_ASAL_TIDAK_DIKENAL
    if ((!galat.tujuan || galat.tujuan === PESAN_KOTA_SAMA) && tidakDikenal(isian.tujuan)) {
      galat.tujuan = PESAN_TUJUAN_TIDAK_DIKENAL
    }
  }

  /** cocok() sekali untuk satu isian yang sudah valid: urut waktu berangkat paling awal dulu. */
  async function cariCocok(mentah: IsianMentah): Promise<HasilPencarian[]> {
    const { asal, tujuan, tanggal } = rapikanIsian(mentah)
    const kriteria = { asalId: idKotaDariTeks(asal)!, tujuanId: idKotaDariTeks(tujuan)!, tanggal }
    const kandidat = await data.ambilPenerbanganRute(kriteria.asalId, kriteria.tujuanId, tanggal)
    const penumpangAktifPerId = await data.jumlahPenumpangAktif(kandidat.map((penerbanganKandidat) => penerbanganKandidat.id))
    const penumpangAktif = (id: number) => penumpangAktifPerId.get(id) ?? 0

    const sekarangIni = sekarang()
    const penerbanganCocok = kandidat.filter((kandidatPenerbangan) => cocok(kandidatPenerbangan, kriteria, sekarangIni, penumpangAktif(kandidatPenerbangan.id)))
    return urutkanMenurutWaktuBerangkat(penerbanganCocok).map((hasilCocok) => keHasilPencarian(hasilCocok, penumpangAktif(hasilCocok.id)))
  }

  /** cariPenerbangan(isian): validasiIsian -> cocok -> urutkanMenurutWaktuBerangkat. Daftar kosong = tidak ditemukan. */
  async function cariPenerbangan(mentah: IsianMentah): Promise<{ galat: GalatPencarian } | { penerbangan: HasilPencarian[] }> {
    const galat = await validasiIsian(mentah)
    if (Object.keys(galat).length > 0) return { galat }

    return { penerbangan: await cariCocok(mentah) }
  }

  /** validasiSetiapSegmen(segmen) (US-4 langkah 3): 3a-3d per segmen ditambah kota tidak dikenal. Sejajar dengan masukan. */
  async function validasiSetiapSegmenDenganKota(segmen: readonly SegmenMentah[]): Promise<GalatSegmen[]> {
    const galat = validasiSetiapSegmen(segmen, hariIni())
    const idDikenal = await ambilIdKotaDikenal()
    segmen.forEach((isian, i) => tandaiKotaTidakDikenal(isian, galat[i]!, idDikenal))
    return galat
  }

  /**
   * cariMultiDestinasi(segmen) (US-4): jumlah segmen 2 sampai 5 (di luar itu `jumlahTidakSah`), validasiSetiapSegmen
   * (satu galat menolak semuanya), lalu per segmen cocok() sekali dan urutkanDariHargaTermurah. Segmen tanpa hasil =
   * daftar kosong (4a).
   */
  async function cariMultiDestinasi(
    segmen: readonly SegmenMentah[],
  ): Promise<{ jumlahTidakSah: true } | { galat: GalatSegmen[] } | { segmen: { jumlah: number; penerbangan: HasilPencarian[] }[] }> {
    if (!jumlahSegmenSah(segmen.length)) return { jumlahTidakSah: true }
    const galat = await validasiSetiapSegmenDenganKota(segmen)
    if (adaGalatSegmen(galat)) return { galat }
    const hasil = []
    for (const isian of segmen) {
      const penerbangan = urutkanDariHargaTermurah(await cariCocok(isian))
      hasil.push({ jumlah: penerbangan.length, penerbangan })
    }
    return { segmen: hasil }
  }

  /** validasiIsian(asal, tujuan, tanggal, jumlah) (US-8a langkah 2, 2a-2d): US-3 plus jumlah penumpang. Kosong = valid. */
  async function validasiIsianPengunjung(mentah: IsianMentahPengunjung): Promise<GalatPencarianPengunjung> {
    const galat = validasiIsianPencarianPengunjung(mentah, hariIni())
    tandaiKotaTidakDikenal(mentah, galat, await ambilIdKotaDikenal())
    return galat
  }

  /**
   * cariUntukPengunjung(isian) (US-8a): validasiIsian, cocok() (tersedia, kota dan tanggal sama), saringSisaKursi(jumlah),
   * urut waktu berangkat (cariCocok; story tidak menentukan urutan). Daftar kosong = 3a.
   */
  async function cariUntukPengunjung(
    mentah: IsianMentahPengunjung,
  ): Promise<{ galat: GalatPencarianPengunjung } | { penerbangan: HasilPencarian[] }> {
    const galat = await validasiIsianPengunjung(mentah)
    if (Object.keys(galat).length > 0) return { galat }
    return { penerbangan: saringSisaKursi(await cariCocok(mentah), jumlahDariTeks(mentah.jumlah)!) }
  }

  return { muatDaftarKota, validasiIsian, cariPenerbangan, cariMultiDestinasi, validasiIsianPengunjung, cariUntukPengunjung }
}
