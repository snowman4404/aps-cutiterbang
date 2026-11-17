// Control PengendaliPembatalan (US-2b, kontrak C3).
import { dapatDibatalkanPada, PESAN_SUDAH_BERANGKAT, PESAN_SUDAH_DIBATALKAN, type TiketSaya } from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaPemesanan } from './antarmukaPemesanan.ts'
import { muatTiketSaya } from './pengendaliPemesanan.ts'

export type HasilBatalkan =
  | { hasil: 'berhasil'; pemesanan: TiketSaya }
  | { hasil: 'tidakDitemukan' }
  | { hasil: 'bukanPemesan' }
  | { hasil: 'tidakBisa'; pesan: string }

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
    if (!b) return { hasil: 'tidakDitemukan' }
    if (b.pemesanId !== akun.id) return { hasil: 'bukanPemesan' }

    const f = (await katalog.ambilPenerbanganUntuk([b.penerbanganId])).get(b.penerbanganId)!
    if (b.status === 'Cancelled') return { hasil: 'tidakBisa', pesan: PESAN_SUDAH_DIBATALKAN }
    if (!dapatDibatalkanPada(b.status, f, sekarang())) return { hasil: 'tidakBisa', pesan: PESAN_SUDAH_BERANGKAT }

    // Dua permintaan serentak: yang kedua mendapati Cancelled di sini.
    if (!(await data.batalkan(b.kode))) return { hasil: 'tidakBisa', pesan: PESAN_SUDAH_DIBATALKAN }
    const [pemesanan] = await muatTiketSaya(katalog, [(await data.cariDenganKode(b.kode))!], akun, sekarang())
    return { hasil: 'berhasil', pemesanan: pemesanan! }
  }

  return { tentukanPemesananDapatDibatalkan, batalkan }
}
