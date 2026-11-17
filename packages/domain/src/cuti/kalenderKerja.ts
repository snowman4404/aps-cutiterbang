// KalenderKerja: hari kerja = Senin sampai Jumat dan bukan HariLibur.
import { hariDalamMinggu, tambahHari, type TanggalIso } from '../umum/tanggal.ts'

/** Tanggal-tanggal HariLibur (unik). */
export type DaftarHariLibur = readonly TanggalIso[] | ReadonlySet<TanggalIso>

const keSet = (libur: DaftarHariLibur): ReadonlySet<TanggalIso> =>
  libur instanceof Set ? libur : new Set(libur)

export function isHariKerja(tanggal: TanggalIso, libur: DaftarHariLibur): boolean {
  const hari = hariDalamMinggu(tanggal)
  return hari !== 0 && hari !== 6 && !keSet(libur).has(tanggal)
}

/** Jumlah hari kerja dari `awal` sampai `akhir`, kedua ujung ikut dihitung. 0 bila akhir < awal. */
export function jumlahHariKerja(awal: TanggalIso, akhir: TanggalIso, libur: DaftarHariLibur): number {
  const set = keSet(libur)
  let jumlah = 0
  for (let tanggal = awal; tanggal <= akhir; tanggal = tambahHari(tanggal, 1)) if (isHariKerja(tanggal, set)) jumlah++
  return jumlah
}
