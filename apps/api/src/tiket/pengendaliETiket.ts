// Control PengendaliETiket (US-8d, sequence "Menerima e-tiket melalui email"): ubahStatusMenjadiConfirmed(kode) =
// ubahStatus(Confirmed), terbitkanETiket, penerimaETiket, kirimETiket per email. Dipanggil Antarmuka Maskapai
// (simulator konfirmasi kursi). Pengiriman sinkron saat konfirmasi, jadi batas 5 menit (Asumsi 12) selalu terpenuhi.
import { siapkanETiket } from '@cutiterbang/domain'
import { keHasilPencarian, type AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaLayananEmail } from './antarmukaLayananEmail.ts'
import type { AntarmukaPemesanan } from './antarmukaPemesanan.ts'
import type { AntarmukaPengunjung } from './antarmukaPengunjung.ts'
import { ubahStatusSistemLuar, type HasilUbahStatus } from './ubahStatusSistemLuar.ts'

export function buatPengendaliETiket(
  katalog: AntarmukaKatalogPenerbangan,
  data: AntarmukaPemesanan,
  pengunjung: AntarmukaPengunjung,
  layananEmail: AntarmukaLayananEmail,
  sekarang: () => Date,
) {
  // Langkah 1: hanya Booked -> Confirmed. Langkah 2 dan 3 adalah efek masuk Confirmed, dalam batch yang sama dengan
  // perubahan status: tidak pernah ada e-tiket atau email untuk pemesanan yang tidak jadi Confirmed.
  const ubahStatusMenjadiConfirmed = (kode: string): Promise<HasilUbahStatus> =>
    ubahStatusSistemLuar(data, 'maskapai', kode, async (b) => {
      const f = (await katalog.ambilPenerbangan(b.penerbanganId))!
      // penerimaETiket() dibaca saat ini dari Profil setiap pengunjung (G6).
      const profil = new Map((await pengunjung.denganId(b.penumpang.map((p) => p.akunId))).map((v) => [v.id, v.data.email]))
      const { nomorETiket, email } = siapkanETiket(
        b.kode,
        b.peranPemesan,
        b.penumpang.map((p) => ({ akunId: p.akunId, namaLengkap: p.namaLengkap, profilEmail: profil.get(p.akunId) ?? null })),
        keHasilPencarian(f, 0),
      )
      const waktu = sekarang()
      return [data.terbitkanETiket(b.kode, nomorETiket, waktu), ...email.map((e) => layananEmail.kirimETiket(b.kode, nomorETiket, e, waktu))]
    })

  return { ubahStatusMenjadiConfirmed }
}

export type PengendaliETiket = ReturnType<typeof buatPengendaliETiket>
