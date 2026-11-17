// Control "PengendaliTiketSaya" untuk Pengunjung (US-8c, US-8d): pemesanan yang mencantumkan pengunjung sebagai penumpang,
// beserta email e-tiket yang dikirim kepadanya.
import type { TiketSaya } from '@cutiterbang/domain'
import type { Akun } from '../db/schema.ts'
import type { AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaLayananEmail } from './antarmukaLayananEmail.ts'
import type { AntarmukaPemesanan } from './antarmukaPemesanan.ts'
import { muatTiketSaya } from './tiketSaya.ts'

export function buatPengendaliTiketDipesankan(
  katalog: AntarmukaKatalogPenerbangan,
  data: AntarmukaPemesanan,
  layananEmail: AntarmukaLayananEmail,
  sekarang: () => Date,
) {
  /**
   * tiketSaya(akun): yangMencantumkan(akun) (langkah 2) lalu informasiPenerbangan per pemesanan (langkah 3).
   * Daftar kosong = "Belum ada tiket" (2a, ditampilkan halaman). `dapatDibatalkan` selalu false: pengunjung bukan pemesan (G4).
   * US-8d: tiap pemesanan membawa `emailETiket`, email yang dikirim Layanan Email ke alamat profil akun ini.
   */
  async function tiketSaya(akun: Pick<Akun, 'id' | 'peran'>): Promise<{ pemesanan: TiketSaya[] }> {
    const [tiket, email] = await Promise.all([
      data.yangMencantumkan(akun.id).then((baris) => muatTiketSaya(katalog, baris, akun, sekarang())),
      layananEmail.terkirimKepada(akun.id),
    ])
    return { pemesanan: tiket.map((t) => ({ ...t, emailETiket: email.get(t.kode) ?? [] })) }
  }

  return { tiketSaya }
}
