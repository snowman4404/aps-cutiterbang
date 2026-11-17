// Control PengendaliPembatalan (US-2b, kontrak C3).
import { dapatDibatalkanPada, type TiketSaya } from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaPemesanan } from './antarmukaPemesanan.ts'
import { muatTiketSaya } from './tiketSaya.ts'

export type HasilBatalkan =
  | { hasil: 'berhasil'; pemesanan: TiketSaya }
  /** Kode tidak dikenal atau bukan milik akun ini (tidak dibedakan, supaya kode orang lain tidak terbuka). */
  | { hasil: 'tidakDitemukan' }
  /** Cancelled atau waktu berangkat sudah lewat (ekstensi 2a). */
  | { hasil: 'tidakBisa' }

export function buatPengendaliPembatalan(katalog: AntarmukaKatalogPenerbangan, data: AntarmukaPemesanan, sekarang: () => Date) {
  /** tentukanPemesananDapatDibatalkan(akun) (langkah 2a): "Tiket Saya" dengan penanda dapatDibatalkan per pemesanan. */
  async function tentukanPemesananDapatDibatalkan(akun: Pick<Akun, 'id'>): Promise<{ pemesanan: TiketSaya[] }> {
    return { pemesanan: await muatTiketSaya(katalog, await data.tiketSaya(akun.id), akun, sekarang()) }
  }

  /**
   * batalkan(b) = kontrak C3 (langkah 5-6), dipanggil setelah pemesan mengonfirmasi di dialog:
   * pemesan harus akun ini (G4), belum Cancelled, belum berangkat; lalu Cancelled dan alokasi kursi dilepas.
   */
  async function batalkan(akun: Pick<Akun, 'id'>, kode: string): Promise<HasilBatalkan> {
    const b = await data.cariDenganKode(kode)
    if (!b || b.pemesanId !== akun.id) return { hasil: 'tidakDitemukan' }

    const f = (await katalog.ambilPenerbanganUntuk([b.penerbanganId])).get(b.penerbanganId)!
    // Waktu berangkat tidak pernah berubah, jadi sekarang() yang baru tepat sebelum data.batalkan setara dengan
    // memeriksanya di dalam transaksi; hanya status yang bisa berubah serentak, dan itu dijaga SQL di data.batalkan.
    if (!dapatDibatalkanPada(b.status, f, sekarang())) return { hasil: 'tidakBisa' }

    // Dua permintaan serentak: yang kedua mendapati status sudah Cancelled (false).
    if (!(await data.batalkan(b.kode))) return { hasil: 'tidakBisa' }
    const [pemesanan] = await muatTiketSaya(katalog, [(await data.cariDenganKode(b.kode))!], akun, sekarang())
    return { hasil: 'berhasil', pemesanan: pemesanan! }
  }

  return { tentukanPemesananDapatDibatalkan, batalkan }
}
