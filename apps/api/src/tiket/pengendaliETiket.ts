// Control PengendaliETiket (US-8d, sequence "Menerima e-tiket melalui email"): ubahStatusMenjadiConfirmed(kode) =
// ubahStatus(Confirmed), terbitkanETiket, penerimaETiket, kirimETiket per email. Dipanggil Antarmuka Maskapai
// (simulator konfirmasi kursi). Pengiriman sinkron saat konfirmasi, jadi batas 5 menit (Asumsi 12) selalu terpenuhi.
import {
  LABEL_STATUS_BOOKING,
  nomorETiketUntuk,
  PEMICU_SISTEM_LUAR,
  penerimaETiket,
  PESAN_KODE_TIDAK_DITEMUKAN,
  pesanTransisiTidakSah,
  statusAsal,
  subjekETiket,
  teksETiket,
  transisi,
  type HasilSimulasi,
} from '@cutiterbang/domain'
import { keHasilPencarian, type AntarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import type { AntarmukaLayananEmail } from './antarmukaLayananEmail.ts'
import type { AntarmukaPemesanan } from './antarmukaPemesanan.ts'
import type { AntarmukaPengunjung } from './antarmukaPengunjung.ts'

export type HasilUbahStatus =
  | { hasil: 'berhasil'; pemesanan: HasilSimulasi }
  | { hasil: 'tidakDitemukan'; pesan: string }
  | { hasil: 'tidakBisa'; pesan: string }

export function buatPengendaliETiket(
  katalog: AntarmukaKatalogPenerbangan,
  data: AntarmukaPemesanan,
  pengunjung: AntarmukaPengunjung,
  layananEmail: AntarmukaLayananEmail,
  sekarang: () => Date,
) {
  async function ubahStatusMenjadiConfirmed(kode: string): Promise<HasilUbahStatus> {
    const b = await data.cariDenganKode(kode)
    if (!b) return { hasil: 'tidakDitemukan', pesan: PESAN_KODE_TIDAK_DITEMUKAN }
    const baru = transisi(b.status, PEMICU_SISTEM_LUAR.maskapai) // langkah 1: hanya Booked -> Confirmed
    if (baru === null) return { hasil: 'tidakBisa', pesan: pesanTransisiTidakSah(b.status) }

    // Langkah 2: terbitkanETiket(): nama semua penumpang, kode booking reference, informasi penerbangan.
    const f = (await katalog.ambilPenerbangan(b.penerbanganId))!
    const nomor = nomorETiketUntuk(b.kode)
    const waktu = sekarang()
    const isi = teksETiket({
      nomorETiket: nomor,
      kode: b.kode,
      namaPenumpang: b.penumpang.map((p) => p.namaLengkap),
      penerbangan: keHasilPencarian(f, 0),
    })

    // Langkah 3: penerimaETiket() dibaca saat ini dari Profil setiap pengunjung (G6), lalu kirimETiket(e, email) per email.
    const profil = await pengunjung.denganId(b.penumpang.map((p) => p.akunId))
    const daftarEmail = penerimaETiket(b.peranPemesan, profil.map((p) => ({ profilEmail: p.data.email })))
    const email = daftarEmail.map((kepada) =>
      layananEmail.kirimETiket(
        b.kode,
        nomor,
        { akunId: profil.find((p) => p.data.email?.trim() === kepada)!.id, kepada, subjek: subjekETiket(b.kode), isi },
        waktu,
      ),
    )

    // Satu batch: status (dijaga atomik), ETiket, dan kotak keluar; tidak pernah sebagian.
    const berhasil = await data.ubahStatus(b.kode, statusAsal('maskapai'), baru, [data.terbitkanETiket(b.kode, nomor, waktu), ...email])
    if (!berhasil) {
      const statusSekarang = (await data.cariDenganKode(b.kode))?.status ?? b.status
      return { hasil: 'tidakBisa', pesan: pesanTransisiTidakSah(statusSekarang) }
    }
    return { hasil: 'berhasil', pemesanan: { kode: b.kode, status: baru, label: LABEL_STATUS_BOOKING[baru] } }
  }

  return { ubahStatusMenjadiConfirmed }
}

export type PengendaliETiket = ReturnType<typeof buatPengendaliETiket>
