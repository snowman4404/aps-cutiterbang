import { describe, expect, test } from 'vitest'
import {
  bolehAlokasi,
  buatKodeBooking,
  dapatDibatalkan,
  dapatDibatalkanPada,
  DAFTAR_STATUS_BOOKING,
  formatValid,
  HURUF_KODE_BOOKING,
  lengkap,
  normalKode,
  memenuhiDataPenumpangLengkap,
  memenuhiPesananSendiri,
  PESAN_DATA_PENUMPANG_TIDAK_LENGKAP,
  PESAN_EMAIL,
  PESAN_KODE_TIDAK_DITEMUKAN,
  PESAN_KURSI_HABIS,
  PESAN_NAMA_LENGKAP,
  PESAN_NOMOR_IDENTITAS,
  PESAN_NOMOR_TELEPON,
  PESAN_TANGGAL_LAHIR,
  PESAN_TIDAK_DAPAT_DIBATALKAN,
  samaKode,
  STATUS_DAPAT_DIBATALKAN,
  transisi,
  validasiDataPenumpang,
  waktuBerangkatAbsolut,
  type DataWajibMentah,
  type Kota,
  type PemicuBooking,
  type Peran,
  type StatusBooking,
} from '../index.ts'

describe('StatusBooking: mesin status', () => {
  const PEMICU: PemicuBooking[] = ['pembayaranBerhasil', 'konfirmasiMaskapai', 'batalkan']
  const TABEL: Record<StatusBooking, Record<PemicuBooking, StatusBooking | null>> = {
    WaitingForThePayment: { pembayaranBerhasil: 'Booked', konfirmasiMaskapai: null, batalkan: 'Cancelled' },
    Booked: { pembayaranBerhasil: null, konfirmasiMaskapai: 'Confirmed', batalkan: 'Cancelled' },
    Confirmed: { pembayaranBerhasil: null, konfirmasiMaskapai: null, batalkan: 'Cancelled' }, // G5
    Cancelled: { pembayaranBerhasil: null, konfirmasiMaskapai: null, batalkan: null }, // final
  }

  test('empat status', () => {
    expect([...DAFTAR_STATUS_BOOKING]).toEqual(['WaitingForThePayment', 'Booked', 'Confirmed', 'Cancelled'])
  })

  for (const status of DAFTAR_STATUS_BOOKING) {
    for (const pemicu of PEMICU) {
      test(`${status} + ${pemicu} -> ${TABEL[status][pemicu] ?? 'ditolak'}`, () => {
        expect(transisi(status, pemicu)).toBe(TABEL[status][pemicu])
      })
    }
  }
})

describe('dapatDibatalkan (US-2b 2a)', () => {
  const sekarang = new Date('2026-11-20T01:00:00Z')

  test('batas keberangkatan: tepat pada sekarang = tidak, 1 ms sesudahnya = ya', () => {
    expect(dapatDibatalkan({ status: 'Booked', waktuBerangkat: new Date(sekarang.getTime()) }, sekarang)).toBe(false)
    expect(dapatDibatalkan({ status: 'Booked', waktuBerangkat: new Date(sekarang.getTime() + 1) }, sekarang)).toBe(true)
    expect(dapatDibatalkan({ status: 'Booked', waktuBerangkat: new Date(sekarang.getTime() - 1) }, sekarang)).toBe(false)
  })

  test('Cancelled tidak pernah dapat dibatalkan; status lain ya bila belum berangkat', () => {
    const depan = new Date(sekarang.getTime() + 3_600_000)
    expect(dapatDibatalkan({ status: 'Cancelled', waktuBerangkat: depan }, sekarang)).toBe(false)
    for (const s of ['WaitingForThePayment', 'Booked', 'Confirmed'] as const) {
      expect(dapatDibatalkan({ status: s, waktuBerangkat: depan }, sekarang)).toBe(true)
    }
  })

  test('G1: waktu berangkat lokal di kota asal non-WIB (Jayapura 08:00 WIT = 06:00 WIB)', () => {
    const jayapura: Kota = { id: 3, nama: 'Jayapura', zonaWaktu: 'Asia/Jayapura' }
    const f = { tanggalKeberangkatan: '2026-11-20', waktuBerangkat: '08:00', asal: jayapura }
    // 08:00 WIT = 23:00 UTC hari sebelumnya
    expect(waktuBerangkatAbsolut(f)).toBe(Date.parse('2026-11-19T23:00:00Z'))
    expect(dapatDibatalkanPada('Booked', f, new Date('2026-11-19T22:59:59Z'))).toBe(true)
    expect(dapatDibatalkanPada('Booked', f, new Date('2026-11-19T23:00:00Z'))).toBe(false)
    // Bila 08:00 salah dibaca sebagai WIB (01:00 UTC), pukul 00:00 UTC hari berikutnya masih dianggap belum berangkat; yang benar sudah.
    expect(dapatDibatalkanPada('Booked', f, new Date('2026-11-20T00:00:00Z'))).toBe(false)
  })
})

describe('KodeBookingReference', () => {
  test('normalKode: trim dan huruf kecil; samaKode tak membedakan kapital dan spasi tepi', () => {
    expect(normalKode('  AbC123 ')).toBe('abc123')
    expect(samaKode(' abc123', 'ABC123  ')).toBe(true)
    expect(samaKode('ABC123', 'ABC124')).toBe(false)
  })

  test('buatKodeBooking: 6 karakter kapital dari himpunan tanpa I, O, 0, 1', () => {
    for (let i = 0; i < 200; i++) {
      expect(buatKodeBooking()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    }
    expect(HURUF_KODE_BOOKING).not.toMatch(/[IO01]/)
  })

  test('buatKodeBooking memakai pembangkit yang disuntik (batas 0 dan hampir 1)', () => {
    expect(buatKodeBooking(() => 0)).toBe('AAAAAA')
    expect(buatKodeBooking(() => 0.999999)).toBe('999999')
  })
})

describe('AlokasiKursi', () => {
  test('bolehAlokasi: tepat penuh boleh, melebihi tidak', () => {
    expect(bolehAlokasi(10, 9, 1)).toBe(true)
    expect(bolehAlokasi(10, 10, 1)).toBe(false)
    expect(bolehAlokasi(10, 8, 3)).toBe(false)
    expect(bolehAlokasi(10, 0, 10)).toBe(true)
    expect(bolehAlokasi(10, 0, 0)).toBe(false)
  })
  test('pesan kursi habis persis seperti spesifikasi', () => {
    expect(PESAN_KURSI_HABIS).toBe('Kursi sudah habis')
  })
})

describe('DataWajib', () => {
  const HARI_INI = '2026-11-17'
  const sah: DataWajibMentah = {
    namaLengkap: 'Budi Santoso',
    nomorIdentitas: '3174010101900001',
    tanggalLahir: '1990-01-01',
    nomorTelepon: '081234567890',
    email: 'budi@contoh.com',
  }
  const galat = (ubah: DataWajibMentah) => {
    const h = validasiDataPenumpang({ ...sah, ...ubah }, HARI_INI)
    return 'galat' in h ? h.galat : {}
  }

  test('data sah: { data } sudah di-trim; lengkap dan formatValid', () => {
    const h = validasiDataPenumpang({ ...sah, namaLengkap: '  Budi Santoso ', email: ' budi@contoh.com ' }, HARI_INI)
    expect(h).toEqual({ data: { ...sah, namaLengkap: 'Budi Santoso', email: 'budi@contoh.com' } })
    expect(lengkap(sah, HARI_INI)).toBe(true)
    expect(formatValid(sah, HARI_INI)).toBe(true)
  })

  test('semua kolom kosong: setiap kolom wajib; bukan lengkap tetapi formatValid', () => {
    const h = validasiDataPenumpang({}, HARI_INI)
    expect('galat' in h && Object.keys(h.galat).sort()).toEqual([
      'email',
      'namaLengkap',
      'nomorIdentitas',
      'nomorTelepon',
      'tanggalLahir',
    ])
    expect(lengkap({}, HARI_INI)).toBe(false)
    expect(formatValid({}, HARI_INI)).toBe(true)
  })

  test('nilai bukan string dan hanya spasi dianggap kosong', () => {
    expect(galat({ namaLengkap: '   ' }).namaLengkap).toBe(PESAN_NAMA_LENGKAP)
    expect(galat({ namaLengkap: 42 }).namaLengkap).toBe(PESAN_NAMA_LENGKAP)
  })

  test('nama: 100 karakter boleh, 101 ditolak', () => {
    expect(galat({ namaLengkap: 'a'.repeat(100) })).toEqual({})
    expect(galat({ namaLengkap: 'a'.repeat(101) })).toEqual({ namaLengkap: PESAN_NAMA_LENGKAP })
    expect(galat({ namaLengkap: 'A' })).toEqual({})
  })

  test('nomor identitas: 15 dan 17 digit ditolak, 16 boleh, bukan digit ditolak', () => {
    expect(galat({ nomorIdentitas: '1'.repeat(15) })).toEqual({ nomorIdentitas: PESAN_NOMOR_IDENTITAS })
    expect(galat({ nomorIdentitas: '1'.repeat(16) })).toEqual({})
    expect(galat({ nomorIdentitas: '1'.repeat(17) })).toEqual({ nomorIdentitas: PESAN_NOMOR_IDENTITAS })
    expect(galat({ nomorIdentitas: '123456789012345a' })).toEqual({ nomorIdentitas: PESAN_NOMOR_IDENTITAS })
  })

  test('nomor telepon: 9 dan 14 digit ditolak, 10 dan 13 boleh, huruf ditolak', () => {
    expect(galat({ nomorTelepon: '1'.repeat(9) })).toEqual({ nomorTelepon: PESAN_NOMOR_TELEPON })
    expect(galat({ nomorTelepon: '1'.repeat(10) })).toEqual({})
    expect(galat({ nomorTelepon: '1'.repeat(13) })).toEqual({})
    expect(galat({ nomorTelepon: '1'.repeat(14) })).toEqual({ nomorTelepon: PESAN_NOMOR_TELEPON })
    expect(galat({ nomorTelepon: '+6281234567890' })).toEqual({ nomorTelepon: PESAN_NOMOR_TELEPON })
  })

  test('tanggal lahir: kemarin boleh, hari ini dan besok ditolak, format salah ditolak', () => {
    expect(galat({ tanggalLahir: '2026-11-16' })).toEqual({})
    expect(galat({ tanggalLahir: HARI_INI })).toEqual({ tanggalLahir: PESAN_TANGGAL_LAHIR })
    expect(galat({ tanggalLahir: '2026-11-18' })).toEqual({ tanggalLahir: PESAN_TANGGAL_LAHIR })
    expect(galat({ tanggalLahir: '1990-02-30' })).toEqual({ tanggalLahir: PESAN_TANGGAL_LAHIR })
    expect(galat({ tanggalLahir: '01/01/1990' })).toEqual({ tanggalLahir: PESAN_TANGGAL_LAHIR })
  })

  test('email: harus nama@domain', () => {
    for (const salah of ['budi', 'budi@', '@contoh.com', 'a@b@c.com']) {
      expect(galat({ email: salah })).toEqual({ email: PESAN_EMAIL })
    }
    expect(galat({ email: 'a@b' })).toEqual({})
  })

  test('formatValid memeriksa kolom terisi saja; lengkap menuntut semuanya', () => {
    expect(formatValid({ namaLengkap: 'Budi', nomorIdentitas: '123' }, HARI_INI)).toBe(false)
    expect(formatValid({ namaLengkap: 'Budi' }, HARI_INI)).toBe(true)
    expect(lengkap({ namaLengkap: 'Budi' }, HARI_INI)).toBe(false)
  })
})

describe('pesan pengguna (kata per kata dari spesifikasi)', () => {
  test('format data penumpang US-2a, ekstensi 7a, 4a/US-9 dan ekstensi 2a US-2b', () => {
    expect(PESAN_NAMA_LENGKAP).toBe('Nama lengkap 1 sampai 100 karakter')
    expect(PESAN_NOMOR_IDENTITAS).toBe('Nomor identitas 16 digit')
    expect(PESAN_TANGGAL_LAHIR).toBe('Tanggal lahir sebelum hari ini')
    expect(PESAN_NOMOR_TELEPON).toBe('Nomor telepon 10 sampai 13 digit')
    expect(PESAN_EMAIL).toBe('Email berbentuk nama@domain')
    expect(PESAN_DATA_PENUMPANG_TIDAK_LENGKAP).toBe('Data penumpang wajib tidak lengkap')
    expect(PESAN_KODE_TIDAK_DITEMUKAN).toBe('Kode booking reference tidak ditemukan')
    expect(PESAN_TIDAK_DAPAT_DIBATALKAN).toBe('Pemesanan berstatus Cancelled atau waktu berangkatnya sudah lewat')
  })

  test('STATUS_DAPAT_DIBATALKAN diturunkan dari mesin status: semua kecuali Cancelled', () => {
    expect([...STATUS_DAPAT_DIBATALKAN]).toEqual(['WaitingForThePayment', 'Booked', 'Confirmed'])
  })
})

describe('inv DataPenumpangLengkap dan PesananSendiri', () => {
  const HARI_INI = '2026-11-17'
  const data: DataWajibMentah = {
    namaLengkap: 'Budi Santoso',
    nomorIdentitas: '3174010101900001',
    tanggalLahir: '1990-01-01',
    nomorTelepon: '081234567890',
    email: 'budi@contoh.com',
  }

  test('DataPenumpangLengkap: semua penumpang lengkap; satu kolom kosong atau salah format melanggar', () => {
    expect(memenuhiDataPenumpangLengkap({ penumpang: [{ data }] }, HARI_INI)).toBe(true)
    expect(memenuhiDataPenumpangLengkap({ penumpang: [] }, HARI_INI)).toBe(true) // forAll pada himpunan kosong
    expect(memenuhiDataPenumpangLengkap({ penumpang: [{ data }, { data: { ...data, email: '' } }] }, HARI_INI)).toBe(false)
    expect(memenuhiDataPenumpangLengkap({ penumpang: [{ data: { ...data, nomorIdentitas: '123' } }] }, HARI_INI)).toBe(false)
  })

  test('PesananSendiri: CalonPenumpang dan Member harus tepat satu penumpang yang mewakili dirinya', () => {
    for (const peran of ['CalonPenumpang', 'MemberFrequentTraveller'] as Peran[]) {
      expect(memenuhiPesananSendiri({ pemesanId: 7, penumpang: [{ akunId: 7, data }] }, peran)).toBe(true)
      expect(memenuhiPesananSendiri({ pemesanId: 7, penumpang: [{ akunId: 8, data }] }, peran)).toBe(false) // mewakili orang lain
      expect(memenuhiPesananSendiri({ pemesanId: 7, penumpang: [] }, peran)).toBe(false)
      expect(
        memenuhiPesananSendiri({ pemesanId: 7, penumpang: [{ akunId: 7, data }, { akunId: 7, data }] }, peran),
      ).toBe(false)
    }
  })

  test('PesananSendiri: implikasi tidak berlaku untuk pemesan selain CalonPenumpang (mis. ManajerTravel)', () => {
    expect(memenuhiPesananSendiri({ pemesanId: 7, penumpang: [{ akunId: 9, data }, { akunId: 10, data }] }, 'ManajerTravel')).toBe(true)
    expect(memenuhiPesananSendiri({ pemesanId: 7, penumpang: [] }, 'HRDManajer')).toBe(true)
  })
})
