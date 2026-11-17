// KalenderKerja: hari kerja = Senin sampai Jumat dan bukan HariLibur.
import { hariDalamMinggu, tambahHari, type TanggalIso } from './tanggal.ts'

/** Tanggal-tanggal HariLibur (unik). */
export type DaftarHariLibur = readonly TanggalIso[] | ReadonlySet<TanggalIso>

const keSet = (libur: DaftarHariLibur): ReadonlySet<TanggalIso> =>
  libur instanceof Set ? libur : new Set(libur)

export function isHariKerja(tanggal: TanggalIso, libur: DaftarHariLibur): boolean {
  const h = hariDalamMinggu(tanggal)
  return h !== 0 && h !== 6 && !keSet(libur).has(tanggal)
}

/** Jumlah hari kerja dari `awal` sampai `akhir`, kedua ujung ikut dihitung. 0 bila akhir < awal. */
export function jumlahHariKerja(awal: TanggalIso, akhir: TanggalIso, libur: DaftarHariLibur): number {
  const set = keSet(libur)
  let n = 0
  for (let t = awal; t <= akhir; t = tambahHari(t, 1)) if (isHariKerja(t, set)) n++
  return n
}
