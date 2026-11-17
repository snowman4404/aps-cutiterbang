// /api/travel: fitur Manajer Travel (G12: hanya ManajerTravel). US-8a pencarian untuk pengunjung dan US-8b memesan
// atas nama pengunjung; US-7 memantau status booking dan US-9 memeriksa kode booking reference.
import { Hono } from 'hono'
import { PESAN_PENERBANGAN_TIDAK_DITEMUKAN, type TanggalIso } from '@cutiterbang/domain'
import { buatGuard, type Variabel } from '../akses/middleware.ts'
import type { Db } from '../db/client.ts'
import { antarmukaKatalogPenerbangan } from './antarmukaKatalogPenerbangan.ts'
import { antarmukaPemesanan } from './antarmukaPemesanan.ts'
import { antarmukaPengunjung } from './antarmukaPengunjung.ts'
import { buatPengendaliPemesananPengunjung } from './pengendaliPemesananPengunjung.ts'
import { buatPengendaliPencarian } from './pengendaliPencarian.ts'
import { buatPengendaliStatusBooking } from './pengendaliStatusBooking.ts'

export function ruteTravel(db: Db, hariIni: () => TanggalIso, sekarang: () => Date) {
  const { butuhLogin, butuhPeran } = buatGuard(db)
  const katalog = antarmukaKatalogPenerbangan(db)
  const pencarian = buatPengendaliPencarian(katalog, hariIni, sekarang)
  const pemesananPengunjung = buatPengendaliPemesananPengunjung(katalog, antarmukaPemesanan(db), antarmukaPengunjung(db), hariIni, sekarang)

  const statusBooking = buatPengendaliStatusBooking(katalog, antarmukaPemesanan(db))

  const rute = new Hono<Variabel>()
  rute.use('*', butuhLogin, butuhPeran('ManajerTravel'))

  // US-8a: `?asal=<kotaId>&tujuan=<kotaId>&tanggal=&jumlah=`. 400 `{ galat }` (2a-2d), 200 `{ penerbangan }` (kosong = 3a).
  rute.get('/cari', async (c) => {
    const hasil = await pencarian.cariUntukPengunjung({
      asal: c.req.query('asal'),
      tujuan: c.req.query('tujuan'),
      tanggal: c.req.query('tanggal'),
      jumlah: c.req.query('jumlah'),
    })
    return 'galat' in hasil ? c.json(hasil, 400) : c.json(hasil)
  })

  // US-8b langkah 2 dan 3: pengunjung terdaftar dengan data Profil dan statusProfil.
  rute.get('/pengunjung', async (c) => c.json({ pengunjung: await pemesananPengunjung.muatDaftarPengunjung() }))

  // US-8b: konfirmasi (kontrak C2). 201 `{ pemesanan }`; 400 `{ pesan }` (daftar kosong, G7, bukan pengunjung);
  // 404 penerbangan tidak ada; 409 `{ pesan }` untuk 5a (menyebut nama) dan 5b (Kursi sudah habis).
  rute.post('/pemesanan', async (c) => {
    const badan = (await c.req.json().catch(() => null)) as { idPenerbangan?: unknown; pengunjung?: unknown } | null
    const hasil = await pemesananPengunjung.pesanUntukPengunjung(
      c.get('akun'),
      typeof badan?.idPenerbangan === 'number' ? badan.idPenerbangan : NaN,
      badan?.pengunjung,
    )
    switch (hasil.hasil) {
      case 'berhasil':
        return c.json({ pemesanan: hasil.pemesanan }, 201)
      case 'galat':
        return c.json({ pesan: hasil.pesan }, 400)
      case 'tidakDitemukan':
        return c.json({ pesan: PESAN_PENERBANGAN_TIDAK_DITEMUKAN }, 404)
      case 'profilTidakLengkap':
      case 'habis':
        return c.json({ pesan: hasil.pesan }, 409)
    }
  })

  // US-7: `?status=` (kosong, tidak ada atau `semua` = Semua status; selain lima pilihan = 400 `{ pesan }`).
  // 200 `{ pemesanan: BarisStatusBooking[] }`, terbaru dulu; daftar kosong = 3a.
  rute.get('/status', async (c) => {
    const hasil = await statusBooking.daftarStatus(c.req.query('status'))
    return hasil.hasil === 'galat' ? c.json({ pesan: hasil.pesan }, 400) : c.json({ pemesanan: hasil.pemesanan })
  })

  // US-9: body `{ kode }`. 200 `{ status: HasilCekKode }`; 400 `{ galat: { kode } }` (2a); 404 `{ pesan }` (4a, tanpa data pemesanan).
  rute.post('/cek-kode', async (c) => {
    const badan = (await c.req.json().catch(() => null)) as { kode?: unknown } | null
    const hasil = await statusBooking.periksaKode(badan?.kode)
    switch (hasil.hasil) {
      case 'galat':
        return c.json({ galat: hasil.galat }, 400)
      case 'tidakDitemukan':
        return c.json({ pesan: hasil.pesan }, 404)
      case 'berhasil':
        return c.json({ status: hasil.status })
    }
  })

  return rute
}
