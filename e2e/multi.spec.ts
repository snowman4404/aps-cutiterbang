import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  hariIniWib,
  PESAN_ASAL_WAJIB,
  PESAN_KOTA_SAMA,
  PESAN_JUMLAH_SEGMEN,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_TANGGAL_LAMPAU,
  PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA,
  PESAN_TANGGAL_WAJIB,
  PESAN_TIDAK_ADA_AKSES,
  PESAN_TUJUAN_WAJIB,
  tambahHari,
} from '@cutiterbang/domain'
import { buatDataPenerbangan, DEMO, KOTA } from '../apps/api/src/db/dataPenerbangan.ts'

// US-4 Mencari penerbangan multi-destinasi (Member). Seed dihitung dari hari ini (WIB); harapan dari data yang sama.
const HARI_INI = hariIniWib()
const DATA = buatDataPenerbangan(HARI_INI)
const API = 'http://localhost:8787/api'
const SANDI = 'rahasia123'
const RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API}/dev/reset`)
  expect(res.status()).toBe(204)
})

async function masuk(page: Page, email: string) {
  await page.goto('/masuk')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill(SANDI)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).not.toHaveURL(/\/masuk/)
}

async function bukaForm(page: Page) {
  await masuk(page, 'member1@cutiterbang.test')
  await page.goto('/penerbangan/multi')
  await expect(page.getByRole('group', { name: 'Segmen 1' }).getByLabel('Kota asal').locator('option')).toHaveCount(KOTA.length + 1)
}

const segmen = (page: Page, n: number) => page.getByRole('group', { name: `Segmen ${n}` })
const hasilSegmen = (page: Page, n: number) => page.getByRole('region', { name: `Hasil segmen ${n}` })
const cariTombol = (page: Page) => page.getByRole('button', { name: 'Cari', exact: true })

async function isiSegmen(page: Page, n: number, asal: string, tujuan: string, tanggal: string) {
  const grup = segmen(page, n)
  if (asal) await grup.getByLabel('Kota asal').selectOption({ label: asal })
  if (tujuan) await grup.getByLabel('Kota tujuan').selectOption({ label: tujuan })
  if (tanggal) await grup.getByLabel('Tanggal keberangkatan').fill(tanggal)
}

/** Penerbangan seed sebuah rute pada hari ke-N, urut harga termurah (harga sama menurut waktu berangkat). */
const urutHarga = (asal: string, tujuan: string, hariKe: number) =>
  DATA.penerbangan
    .filter((p) => p.asal === asal && p.tujuan === tujuan && p.tanggalKeberangkatan === tambahHari(HARI_INI, hariKe))
    .sort((a, b) => a.waktuBerangkat.localeCompare(b.waktuBerangkat))
    .sort((a, b) => a.harga - b.harga)

const { rutePadat } = DEMO
const HARI_1 = rutePadat.hariKe // Jakarta -> Denpasar (5 penerbangan)
const HARI_2 = rutePadat.hariKe + 1 // Denpasar -> Makassar (2 penerbangan)

test.describe('US-4 Multi-destinasi: akses (G12)', () => {
  test('belum login: diminta masuk; penumpang biasa: tidak punya akses', async ({ page }) => {
    await page.goto('/penerbangan/multi')
    await expect(page).toHaveURL(/\/masuk\?next=%2Fpenerbangan%2Fmulti/)
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto('/penerbangan/multi')
    await expect(page.getByText(PESAN_TIDAK_ADA_AKSES)).toBeVisible()
    await expect(page.getByRole('group', { name: 'Segmen 1' })).toHaveCount(0)
  })

  test('Member: menu Multi-destinasi membuka formulir dengan 2 segmen', async ({ page }) => {
    await masuk(page, 'member1@cutiterbang.test')
    await page.goto('/')
    await page.getByRole('link', { name: /Multi-destinasi/ }).first().click()
    await expect(page).toHaveURL(/\/penerbangan\/multi$/)
    await expect(page.getByRole('group', { name: /^Segmen \d$/ })).toHaveCount(2)
  })
})

test.describe('US-4 Multi-destinasi: segmen (2a, 2b)', () => {
  test('mulai dengan 2 segmen; menambah sampai 5 lalu tombol hilang; menghapus sampai 2 lalu tombol hapus hilang', async ({ page }) => {
    await bukaForm(page)
    const grup = page.getByRole('group', { name: /^Segmen \d$/ })
    await expect(grup).toHaveCount(2)
    await expect(page.getByRole('button', { name: /^Hapus segmen/ })).toHaveCount(0) // 2b: minimal 2

    const tambah = page.getByRole('button', { name: 'Tambah segmen' })
    for (let n = 3; n <= 5; n++) {
      await tambah.click()
      await expect(grup).toHaveCount(n)
    }
    await expect(tambah).toHaveCount(0) // 2a: maksimal 5
    await expect(page.getByRole('button', { name: /^Hapus segmen/ })).toHaveCount(5)

    await page.getByRole('button', { name: 'Hapus segmen 5' }).click()
    await expect(grup).toHaveCount(4)
    await expect(tambah).toBeVisible()
    await page.getByRole('button', { name: 'Hapus segmen 1' }).click()
    await page.getByRole('button', { name: 'Hapus segmen 1' }).click()
    await expect(grup).toHaveCount(2)
    await expect(page.getByRole('button', { name: /^Hapus segmen/ })).toHaveCount(0)
  })

  test('menghapus sebuah segmen mempertahankan isian segmen lain', async ({ page }) => {
    await bukaForm(page)
    await page.getByRole('button', { name: 'Tambah segmen' }).click()
    await isiSegmen(page, 1, 'Jakarta', 'Surabaya', tambahHari(HARI_INI, 2))
    await isiSegmen(page, 2, 'Surabaya', 'Denpasar', tambahHari(HARI_INI, 3))
    await isiSegmen(page, 3, 'Denpasar', 'Makassar', tambahHari(HARI_INI, 4))
    await page.getByRole('button', { name: 'Hapus segmen 2' }).click()
    await expect(segmen(page, 1).getByLabel('Kota asal').locator('option:checked')).toHaveText('Jakarta')
    await expect(segmen(page, 2).getByLabel('Kota asal').locator('option:checked')).toHaveText('Denpasar')
    await expect(segmen(page, 2).getByLabel('Tanggal keberangkatan')).toHaveValue(tambahHari(HARI_INI, 4))
  })
})

test.describe('US-4 Multi-destinasi: pencarian dan hasil per segmen', () => {
  test('hasil per segmen: jumlah penerbangan, urut harga termurah, harga dan Pesan; bertahan setelah dimuat ulang', async ({ page }) => {
    await bukaForm(page)
    await isiSegmen(page, 1, rutePadat.asal, rutePadat.tujuan, tambahHari(HARI_INI, HARI_1))
    await isiSegmen(page, 2, rutePadat.tujuan, 'Makassar', tambahHari(HARI_INI, HARI_2))
    await cariTombol(page).click()

    const harapan = [urutHarga(rutePadat.asal, rutePadat.tujuan, HARI_1), urutHarga(rutePadat.tujuan, 'Makassar', HARI_2)]
    expect(harapan[0]!.length).toBeGreaterThanOrEqual(3)
    expect(harapan[1]!.length).toBeGreaterThanOrEqual(1)

    const periksa = async () => {
      await expect(page.getByTestId('hasil-segmen')).toHaveCount(2)
      for (const [i, daftar] of harapan.entries()) {
        const bagian = hasilSegmen(page, i + 1)
        await expect(bagian.getByTestId('jumlah-penerbangan')).toHaveText(`${daftar.length} penerbangan ditemukan`)
        const baris = bagian.getByTestId('penerbangan')
        await expect(baris).toHaveCount(daftar.length)
        for (const [j, f] of daftar.entries()) {
          await expect(baris.nth(j)).toContainText(f.nomorPenerbangan)
          await expect(baris.nth(j).getByTestId('harga')).toHaveText(RUPIAH.format(f.harga))
          await expect(baris.nth(j).getByRole('link', { name: `Pesan ${f.nomorPenerbangan}` })).toBeVisible()
        }
      }
    }
    await periksa()
    await expect(page).toHaveURL(/seg=/)
    await page.reload()
    await periksa()
    // Isian formulir ikut pulih dari URL.
    await expect(segmen(page, 2).getByLabel('Kota tujuan').locator('option:checked')).toHaveText('Makassar')
  })

  test('4a: segmen tanpa hasil menampilkan "Penerbangan tidak ditemukan" hanya pada segmen itu', async ({ page }) => {
    await bukaForm(page)
    await isiSegmen(page, 1, DEMO.tanpaPenerbangan.asal, DEMO.tanpaPenerbangan.tujuan, tambahHari(HARI_INI, 2))
    await isiSegmen(page, 2, rutePadat.asal, rutePadat.tujuan, tambahHari(HARI_INI, HARI_1))
    await cariTombol(page).click()
    await expect(hasilSegmen(page, 1).getByText(PESAN_PENERBANGAN_TIDAK_DITEMUKAN)).toBeVisible()
    await expect(hasilSegmen(page, 1).getByTestId('jumlah-penerbangan')).toHaveText('0 penerbangan ditemukan') // langkah 5: jumlah selalu tampil
    await expect(hasilSegmen(page, 1).getByTestId('penerbangan')).toHaveCount(0)
    await expect(hasilSegmen(page, 2).getByText(PESAN_PENERBANGAN_TIDAK_DITEMUKAN)).toHaveCount(0)
    await expect(hasilSegmen(page, 2).getByTestId('penerbangan')).toHaveCount(urutHarga(rutePadat.asal, rutePadat.tujuan, HARI_1).length)
  })

  test('penerbangan yang sudah habis tidak muncul (Yogyakarta -> Surabaya hanya BW902)', async ({ page }) => {
    const { habis, kursiTerakhir } = DEMO
    await bukaForm(page)
    await isiSegmen(page, 1, habis.asal, habis.tujuan, tambahHari(HARI_INI, habis.hariKe))
    await isiSegmen(page, 2, 'Surabaya', 'Denpasar', tambahHari(HARI_INI, habis.hariKe))
    await cariTombol(page).click()
    const baris = hasilSegmen(page, 1).getByTestId('penerbangan')
    await expect(baris).toHaveCount(1)
    await expect(baris.first()).toContainText(kursiTerakhir.nomorPenerbangan)
    await expect(hasilSegmen(page, 1).getByTestId('jumlah-penerbangan')).toHaveText('1 penerbangan ditemukan')
  })

  test('5a: mengubah satu segmen mempertahankan segmen lain dan mencari ulang semuanya', async ({ page }) => {
    await bukaForm(page)
    await isiSegmen(page, 1, rutePadat.asal, rutePadat.tujuan, tambahHari(HARI_INI, HARI_1))
    await isiSegmen(page, 2, rutePadat.tujuan, 'Makassar', tambahHari(HARI_INI, HARI_2))
    await cariTombol(page).click()
    await expect(hasilSegmen(page, 2).getByTestId('penerbangan')).toHaveCount(urutHarga(rutePadat.tujuan, 'Makassar', HARI_2).length)

    await isiSegmen(page, 2, '', 'Jakarta', '')
    await expect(segmen(page, 1).getByLabel('Kota asal').locator('option:checked')).toHaveText(rutePadat.asal)
    await expect(segmen(page, 1).getByLabel('Tanggal keberangkatan')).toHaveValue(tambahHari(HARI_INI, HARI_1))
    await expect(segmen(page, 2).getByLabel('Kota asal').locator('option:checked')).toHaveText(rutePadat.tujuan)
    await cariTombol(page).click()
    await expect(hasilSegmen(page, 2).getByRole('heading')).toContainText(`${rutePadat.tujuan} → Jakarta`)
    await expect(hasilSegmen(page, 2).getByTestId('penerbangan')).toHaveCount(urutHarga(rutePadat.tujuan, 'Jakarta', HARI_2).length)
    await expect(hasilSegmen(page, 1).getByTestId('penerbangan')).toHaveCount(urutHarga(rutePadat.asal, rutePadat.tujuan, HARI_1).length)
  })
})

test.describe('US-4 Multi-destinasi: validasi (3a-3d)', () => {
  test('3a: kolom kosong pada segmen mana pun menolak seluruh pencarian dan menandai kolomnya', async ({ page }) => {
    await bukaForm(page)
    await isiSegmen(page, 1, rutePadat.asal, rutePadat.tujuan, tambahHari(HARI_INI, HARI_1))
    await cariTombol(page).click()
    await expect(segmen(page, 1).getByRole('alert')).toHaveCount(0)
    await expect(segmen(page, 2).getByText(PESAN_ASAL_WAJIB)).toBeVisible()
    await expect(segmen(page, 2).getByText(PESAN_TUJUAN_WAJIB)).toBeVisible()
    await expect(segmen(page, 2).getByText(PESAN_TANGGAL_WAJIB)).toBeVisible()
    await expect(page.getByTestId('hasil-segmen')).toHaveCount(0)
    // Isian segmen 1 tetap.
    await expect(segmen(page, 1).getByLabel('Kota asal').locator('option:checked')).toHaveText(rutePadat.asal)
    await expect(segmen(page, 1).getByLabel('Tanggal keberangkatan')).toHaveValue(tambahHari(HARI_INI, HARI_1))
  })

  test('3b: kota asal sama dengan tujuan pada sebuah segmen', async ({ page }) => {
    await bukaForm(page)
    await isiSegmen(page, 1, 'Jakarta', 'Denpasar', tambahHari(HARI_INI, 3))
    await isiSegmen(page, 2, 'Denpasar', 'Denpasar', tambahHari(HARI_INI, 4))
    await cariTombol(page).click()
    await expect(segmen(page, 2).getByText(PESAN_KOTA_SAMA)).toBeVisible()
    await expect(segmen(page, 1).getByRole('alert')).toHaveCount(0)
    await expect(page.getByTestId('hasil-segmen')).toHaveCount(0)
  })

  test('3c: tanggal sebuah segmen sudah lewat', async ({ page }) => {
    await bukaForm(page)
    await isiSegmen(page, 1, 'Jakarta', 'Denpasar', tambahHari(HARI_INI, -1))
    await isiSegmen(page, 2, 'Denpasar', 'Makassar', tambahHari(HARI_INI, 2))
    await cariTombol(page).click()
    await expect(segmen(page, 1).getByText(PESAN_TANGGAL_LAMPAU)).toBeVisible()
    await expect(page.getByTestId('hasil-segmen')).toHaveCount(0)
  })

  test('URL dengan lebih dari 5 atau hanya 1 segmen ditolak dengan pesan, tidak dipotong diam-diam', async ({ page }) => {
    await bukaForm(page)
    await isiSegmen(page, 1, rutePadat.asal, rutePadat.tujuan, tambahHari(HARI_INI, HARI_1))
    await isiSegmen(page, 2, rutePadat.tujuan, 'Makassar', tambahHari(HARI_INI, HARI_2))
    await cariTombol(page).click()
    await expect(hasilSegmen(page, 2)).toBeVisible()
    const [seg1, seg2] = new URL(page.url()).searchParams.getAll('seg')

    const keUrl = (daftar: string[]) => `/penerbangan/multi?${daftar.map((s) => `seg=${encodeURIComponent(s)}`).join('&')}`
    await page.goto(keUrl([seg1!, seg2!, seg2!, seg2!, seg2!, seg2!]))
    await expect(page.getByText(PESAN_JUMLAH_SEGMEN)).toBeVisible()
    await expect(page.getByTestId('hasil-segmen')).toHaveCount(0)
    await expect(segmen(page, 5)).toBeVisible()
    await expect(segmen(page, 6)).toHaveCount(0)

    await page.goto(keUrl([seg1!]))
    await expect(page.getByText(PESAN_JUMLAH_SEGMEN)).toBeVisible()
    await expect(page.getByTestId('hasil-segmen')).toHaveCount(0)
    await expect(segmen(page, 2)).toBeVisible()
    await expect(segmen(page, 3)).toHaveCount(0)
  })

  test('3d: tanggal lebih awal dari segmen sebelumnya ditolak; tanggal yang sama diperbolehkan', async ({ page }) => {
    await bukaForm(page)
    await isiSegmen(page, 1, 'Jakarta', 'Denpasar', tambahHari(HARI_INI, 5))
    await isiSegmen(page, 2, 'Denpasar', 'Makassar', tambahHari(HARI_INI, 4))
    await cariTombol(page).click()
    await expect(segmen(page, 2).getByText(PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA)).toBeVisible()
    await expect(segmen(page, 1).getByRole('alert')).toHaveCount(0)
    await expect(page.getByTestId('hasil-segmen')).toHaveCount(0)
    await expect(segmen(page, 2).getByLabel('Tanggal keberangkatan')).toHaveValue(tambahHari(HARI_INI, 4)) // isian tetap

    await isiSegmen(page, 2, '', '', tambahHari(HARI_INI, 5)) // sama dengan segmen 1
    await cariTombol(page).click()
    await expect(page.getByTestId('hasil-segmen')).toHaveCount(2)
    await expect(page.getByText(PESAN_TANGGAL_SEBELUM_SEGMEN_SEBELUMNYA)).toHaveCount(0)
  })
})

test('lebar ponsel 375px: formulir 5 segmen dan hasil tanpa gulir horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await bukaForm(page)
  for (let n = 3; n <= 5; n++) await page.getByRole('button', { name: 'Tambah segmen' }).click()
  const tidakMeluap = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  expect(await tidakMeluap()).toBe(true)
  await page.getByRole('button', { name: 'Hapus segmen 5' }).click()
  await page.getByRole('button', { name: 'Hapus segmen 4' }).click()
  await page.getByRole('button', { name: 'Hapus segmen 3' }).click()
  await isiSegmen(page, 1, rutePadat.asal, rutePadat.tujuan, tambahHari(HARI_INI, HARI_1))
  await isiSegmen(page, 2, rutePadat.tujuan, 'Makassar', tambahHari(HARI_INI, HARI_2))
  await cariTombol(page).click()
  await expect(page.getByTestId('hasil-segmen')).toHaveCount(2)
  expect(await tidakMeluap()).toBe(true)
})
