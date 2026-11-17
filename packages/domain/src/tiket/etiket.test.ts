import { describe, expect, test } from 'vitest'
import {
  DAFTAR_STATUS_BOOKING,
  etiketBerlaku,
  filterStatusDariTeks,
  LABEL_ETIKET_DIBATALKAN,
  LABEL_SEMUA_STATUS,
  LABEL_STATUS_BOOKING,
  nomorETiketUntuk,
  PESAN_ETIKET_TIDAK_BERLAKU,
  PESAN_TIDAK_ADA_PEMESANAN,
  penerimaETiket,
  PILIHAN_FILTER_STATUS,
  pesanTransisiTidakSah,
  ringkasanPenerbangan,
  sistemLuarUntuk,
  teksETiket,
  transisi,
  TRANSISI_SISTEM_LUAR,
  type IsiETiket,
} from '../index.ts'

describe('G5: etiketBerlaku', () => {
  test('hanya Confirmed yang berlaku; Cancelled tetap punya e-tiket tetapi void', () => {
    expect(DAFTAR_STATUS_BOOKING.filter(etiketBerlaku)).toEqual(['Confirmed'])
    expect(LABEL_ETIKET_DIBATALKAN).toBe('Dibatalkan')
    expect(PESAN_ETIKET_TIDAK_BERLAKU).toContain('tidak berlaku untuk perjalanan')
  })
})

describe('G6: penerimaETiket', () => {
  const penumpang = [{ profilEmail: 'a@x.test' }, { profilEmail: 'b@x.test' }]

  test('pemesan Manajer Travel: email profil setiap pengunjung, urut penumpang', () => {
    expect(penerimaETiket('ManajerTravel', penumpang)).toEqual(['a@x.test', 'b@x.test'])
  })

  test('himpunan: email yang sama hanya sekali; kosong dan null dilewati', () => {
    const p = [{ profilEmail: 'a@x.test' }, { profilEmail: ' a@x.test ' }, { profilEmail: null }, { profilEmail: '  ' }]
    expect(penerimaETiket('ManajerTravel', p)).toEqual(['a@x.test'])
  })

  test.each(['CalonPenumpang', 'MemberFrequentTraveller', 'Pengunjung', 'HRDManajer'] as const)('pemesan %s: tidak ada penerima', (peran) => {
    expect(penerimaETiket(peran, penumpang)).toEqual([])
  })
})

describe('isi e-tiket', () => {
  const kota = (nama: string, zonaWaktu: 'Asia/Jakarta' | 'Asia/Makassar') => ({ id: 1, nama, zonaWaktu })
  const isi: IsiETiket = {
    nomorETiket: nomorETiketUntuk('CTB009'),
    kode: 'CTB009',
    namaPenumpang: ['Maya Lestari', 'Citra Anggraini'],
    penerbangan: {
      maskapai: 'Garuda',
      nomorPenerbangan: 'GA123',
      asal: kota('Jakarta', 'Asia/Jakarta'),
      tujuan: kota('Makassar', 'Asia/Makassar'),
      tanggalKeberangkatan: '2026-11-20',
      waktuBerangkat: '08:00',
      waktuTiba: '11:00',
    },
  }

  test('nomor e-tiket mengikuti format seed', () => {
    expect(nomorETiketUntuk('CTB005')).toBe('ET-CTB005')
  })

  test('memuat nama semua penumpang, kode, nomor e-tiket dan informasi penerbangan', () => {
    const teks = teksETiket(isi)
    for (const bagian of ['ET-CTB009', 'CTB009', 'Maya Lestari, Citra Anggraini', 'GA123', '2026-11-20', 'Jakarta 08:00 WIB', 'Makassar 11:00 WITA'])
      expect(teks).toContain(bagian)
  })

  test('ringkasanPenerbangan: nomor dan tanggal', () => {
    expect(ringkasanPenerbangan({ nomorPenerbangan: 'GA123', tanggalKeberangkatan: '2026-11-20' })).toEqual({
      nomorPenerbangan: 'GA123',
      tanggalKeberangkatan: '2026-11-20',
    })
  })
})

describe('US-7 filter status', () => {
  test('lima pilihan: "Semua status" lalu keempat status dengan labelnya', () => {
    expect(PILIHAN_FILTER_STATUS.map((p) => p.label)).toEqual([LABEL_SEMUA_STATUS, 'Waiting for the payment', 'Booked', 'Confirmed', 'Cancelled'])
  })

  test('parameter kosong, tidak ada dan "semua" = semua status; status sah apa adanya', () => {
    for (const teks of [undefined, null, '', 'semua']) expect(filterStatusDariTeks(teks)).toBe('semua')
    for (const s of DAFTAR_STATUS_BOOKING) expect(filterStatusDariTeks(s)).toBe(s)
  })

  test('selain itu null (huruf kapital berbeda ditolak)', () => {
    for (const teks of ['booked', 'Hangus', 'Semua', 5, {}]) expect(filterStatusDariTeks(teks)).toBeNull()
  })

  test('pesan 3a persis spesifikasi', () => {
    expect(PESAN_TIDAK_ADA_PEMESANAN).toBe('Tidak ada pemesanan dengan status ini')
  })
})

describe('simulator sistem luar', () => {
  test('TRANSISI_SISTEM_LUAR sesuai mesin status: hanya status asalnya yang menerima pemicu', () => {
    expect(transisi(TRANSISI_SISTEM_LUAR.pembayaran.dari, TRANSISI_SISTEM_LUAR.pembayaran.pemicu)).toBe('Booked')
    expect(transisi(TRANSISI_SISTEM_LUAR.maskapai.dari, TRANSISI_SISTEM_LUAR.maskapai.pemicu)).toBe('Confirmed')
    for (const { dari, pemicu } of Object.values(TRANSISI_SISTEM_LUAR))
      expect(DAFTAR_STATUS_BOOKING.filter((s) => transisi(s, pemicu) !== null)).toEqual([dari])
  })

  test('sistemLuarUntuk: sistem yang memicu transisi dari status itu', () => {
    expect(DAFTAR_STATUS_BOOKING.map(sistemLuarUntuk)).toEqual(
      DAFTAR_STATUS_BOOKING.map((s) => (s === 'WaitingForThePayment' ? 'pembayaran' : s === 'Booked' ? 'maskapai' : null)),
    )
  })

  test('pesan transisi tidak sah menyebut label status', () => {
    expect(pesanTransisiTidakSah('Cancelled')).toContain(LABEL_STATUS_BOOKING.Cancelled)
  })
})
