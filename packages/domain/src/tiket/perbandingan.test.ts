import { describe, expect, test } from 'vitest'
import {
  batalkanPilihan,
  periksaJumlahPilihan,
  pilihPenerbangan,
  PESAN_PILIHAN_MAKSIMAL,
  susunBerdampingan,
  tandaiTermurah,
  urutkan,
} from '../index.ts'

const daftar = [
  { id: 1, harga: 900 },
  { id: 2, harga: 500 },
  { id: 3, harga: 700 },
  { id: 4, harga: 500 },
]

describe('US-6b urutkan', () => {
  test('termurah: harga naik, harga sama tetap menurut urutan masukan', () => {
    expect(urutkan(daftar, 'termurah').map((f) => f.id)).toEqual([2, 4, 3, 1])
  })
  test('termahal: harga turun, harga sama tetap menurut urutan masukan', () => {
    expect(urutkan(daftar, 'termahal').map((f) => f.id)).toEqual([1, 3, 2, 4])
  })
  test('masukan tidak berubah', () => {
    urutkan(daftar, 'termahal')
    expect(daftar.map((f) => f.id)).toEqual([1, 2, 3, 4])
  })
})

describe('US-6b pilihan', () => {
  test('memilih sampai 3 penerbangan; yang keempat ditolak dengan pesan spek', () => {
    let pilihan: number[] = []
    for (const id of [1, 2, 3]) {
      const hasil = pilihPenerbangan(pilihan, id)
      expect(hasil).toEqual({ pilihan: [...pilihan, id] })
      pilihan = 'pilihan' in hasil ? hasil.pilihan : pilihan
    }
    expect(pilihPenerbangan(pilihan, 4)).toEqual({ pesan: PESAN_PILIHAN_MAKSIMAL })
    expect(PESAN_PILIHAN_MAKSIMAL).toBe('Maksimal 3 penerbangan dapat dibandingkan')
  })
  test('memilih yang sudah terpilih tidak menambah, termasuk saat sudah 3', () => {
    expect(pilihPenerbangan([1, 2, 3], 2)).toEqual({ pilihan: [1, 2, 3] })
  })
  test('membatalkan pilihan membuka tempat lagi', () => {
    const sisa = batalkanPilihan([1, 2, 3], 2)
    expect(sisa).toEqual([1, 3])
    expect(pilihPenerbangan(sisa, 4)).toEqual({ pilihan: [1, 3, 4] })
  })
  test('periksaJumlahPilihan: hanya 2 atau 3 membuka tampilan (4a menahan sisanya)', () => {
    expect([0, 1, 2, 3, 4].map(periksaJumlahPilihan)).toEqual([false, false, true, true, false])
  })
  test('susunBerdampingan: menurut urutan daftar, pilihan yang tak ada dilewati', () => {
    expect(susunBerdampingan(daftar, [3, 1, 99]).map((f) => f.id)).toEqual([1, 3])
  })
})

describe('US-6b tandaiTermurah', () => {
  test('satu penerbangan termurah', () => {
    expect(tandaiTermurah([daftar[0]!, daftar[2]!])).toEqual([3])
  })
  test('harga terendah yang sama: semuanya ditandai', () => {
    expect(tandaiTermurah([daftar[1]!, daftar[3]!, daftar[0]!])).toEqual([2, 4])
  })
  test('semua sama harga: semuanya ditandai; kosong: tidak ada', () => {
    expect(tandaiTermurah([{ id: 1, harga: 5 }, { id: 2, harga: 5 }])).toEqual([1, 2])
    expect(tandaiTermurah([])).toEqual([])
  })
})
