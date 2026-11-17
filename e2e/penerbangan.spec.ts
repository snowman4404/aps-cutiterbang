import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  hariIniWib,
  PESAN_ASAL_WAJIB,
  PESAN_KOTA_SAMA,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_TANGGAL_LAMPAU,
  PESAN_TANGGAL_WAJIB,
  PESAN_TUJUAN_WAJIB,
  singkatanZona,
  tambahHari,
} from '@cutiterbang/domain'
import { buatDataPenerbangan, DEMO, KOTA } from '../apps/api/src/db/dataPenerbangan.ts'

// Seed dihitung dari hari ini (WIB); harapan dihitung dari data yang sama.
const HARI_INI = hariIniWib()
const DATA = buatDataPenerbangan(HARI_INI)
const RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const zonaDari = (nama: string) => singkatanZona(KOTA.find((k) => k.nama === nama)!.zonaWaktu)
const DITEMUKAN = PESAN_PENERBANGAN_TIDAK_DITEMUKAN

test.beforeEach(async ({ request }) => {
  const res = await request.post('http://localhost:8787/api/dev/reset')
  expect(res.status()).toBe(204)
})

async function isiDanCari(page: Page, asal: string, tujuan: string, tanggal: string) {
  await page.getByLabel('Kota asal').selectOption({ label: asal })
  await page.getByLabel('Kota tujuan').selectOption({ label: tujuan })
  await page.getByLabel('Tanggal keberangkatan').fill(tanggal)
  await page.getByRole('button', { name: 'Cari', exact: true }).click()
}

const bukaForm = async (page: Page) => {
  await page.goto('/penerbangan')
  // Daftar kota termuat (pilihan selain placeholder tersedia).
  await expect(page.getByLabel('Kota asal').locator('option')).toHaveCount(KOTA.length + 1)
}

const rute = (asal: string, tujuan: string, hariKe: number) =>
  DATA.penerbangan
    .filter((p) => p.asal === asal && p.tujuan === tujuan && p.tanggalKeberangkatan === tambahHari(HARI_INI, hariKe))
    .sort((a, b) => a.waktuBerangkat.localeCompare(b.waktuBerangkat))

test.describe('US-3 Mencari penerbangan', () => {
  test('tanpa login: semua kota tersedia, hasil urut keberangkatan paling awal dengan kolom lengkap', async ({ page }) => {
    await bukaForm(page)
    await expect(page.getByTestId('pengguna')).toHaveCount(0) // tidak login
    const { rutePadat } = DEMO
    const harapan = rute(rutePadat.asal, rutePadat.tujuan, rutePadat.hariKe)
    expect(harapan.length).toBeGreaterThanOrEqual(3)

    await isiDanCari(page, rutePadat.asal, rutePadat.tujuan, tambahHari(HARI_INI, rutePadat.hariKe))
    const baris = page.getByRole('list', { name: 'Hasil pencarian penerbangan' }).getByTestId('penerbangan')
    await expect(baris).toHaveCount(harapan.length)
    for (const [i, p] of harapan.entries()) {
      const b = baris.nth(i)
      await expect(b).toContainText(p.maskapai)
      await expect(b).toContainText(p.nomorPenerbangan)
      await expect(b).toContainText(`${p.asal} → ${p.tujuan}`)
      await expect(b.getByTestId('berangkat')).toHaveText(`${p.waktuBerangkat} ${zonaDari(p.asal)}`)
      await expect(b.getByTestId('tiba')).toHaveText(`${p.waktuTiba} ${zonaDari(p.tujuan)}`)
      await expect(b.getByTestId('harga')).toHaveText(RUPIAH.format(p.harga))
      await expect(b.getByTestId('sisa-kursi')).toHaveText(`Sisa ${p.jumlahKursi} kursi`)
    }
    // Urutan seed berbeda dari urutan berangkat, tetapi hasil tetap urut berangkat.
    const urutanSeed = DATA.penerbangan
      .filter((p) => p.asal === rutePadat.asal && p.tujuan === rutePadat.tujuan && p.tanggalKeberangkatan === tambahHari(HARI_INI, rutePadat.hariKe))
      .map((p) => p.waktuBerangkat)
    expect(urutanSeed).not.toEqual(harapan.map((p) => p.waktuBerangkat))
  })

  test('lintas zona: waktu tiba memakai zona kota tujuan (WIT)', async ({ page }) => {
    await bukaForm(page)
    const { lintasZona } = DEMO
    await isiDanCari(page, lintasZona.asal, lintasZona.tujuan, tambahHari(HARI_INI, lintasZona.hariKe))
    const pertama = rute(lintasZona.asal, lintasZona.tujuan, lintasZona.hariKe)[0]!
    const b = page.getByTestId('penerbangan').first()
    await expect(b.getByTestId('berangkat')).toHaveText(`${pertama.waktuBerangkat} WIB`)
    await expect(b.getByTestId('tiba')).toHaveText(`${pertama.waktuTiba} WIT`)
  })

  test('pencarian tersimpan di URL dan bertahan setelah dimuat ulang', async ({ page }) => {
    await bukaForm(page)
    const { rutePadat } = DEMO
    const tanggal = tambahHari(HARI_INI, rutePadat.hariKe)
    await isiDanCari(page, rutePadat.asal, rutePadat.tujuan, tanggal)
    await expect(page).toHaveURL(/asal=\d+&tujuan=\d+&tanggal=/)
    await expect(page.getByTestId('penerbangan').first()).toBeVisible()
    const jumlah = await page.getByTestId('penerbangan').count()
    await page.reload()
    await expect(page.getByTestId('penerbangan')).toHaveCount(jumlah)
    await expect(page.getByLabel('Kota asal')).toHaveValue(/\d+/)
    await expect(page.getByLabel('Tanggal keberangkatan')).toHaveValue(tanggal)
  })

  test('3a: kolom kosong ditolak dan ditandai', async ({ page }) => {
    await bukaForm(page)
    await page.getByRole('button', { name: 'Cari', exact: true }).click()
    await expect(page.getByText(PESAN_ASAL_WAJIB)).toBeVisible()
    await expect(page.getByText(PESAN_TUJUAN_WAJIB)).toBeVisible()
    await expect(page.getByText(PESAN_TANGGAL_WAJIB)).toBeVisible()
    await expect(page.getByLabel('Kota asal')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByTestId('penerbangan')).toHaveCount(0)
  })

  test('3b: kota asal sama dengan tujuan ditolak', async ({ page }) => {
    await bukaForm(page)
    await isiDanCari(page, 'Jakarta', 'Jakarta', tambahHari(HARI_INI, 2))
    await expect(page.getByText(PESAN_KOTA_SAMA)).toBeVisible()
    await expect(page.getByTestId('penerbangan')).toHaveCount(0)
    await expect(page.getByText(DITEMUKAN)).toHaveCount(0)
  })

  test('3c: tanggal yang sudah lewat ditolak; hari ini diperbolehkan', async ({ page }) => {
    await bukaForm(page)
    await isiDanCari(page, 'Jakarta', 'Denpasar', tambahHari(HARI_INI, -1))
    await expect(page.getByText(PESAN_TANGGAL_LAMPAU)).toBeVisible()
    await expect(page.getByTestId('penerbangan')).toHaveCount(0)
    await page.getByLabel('Tanggal keberangkatan').fill(HARI_INI)
    await page.getByRole('button', { name: 'Cari', exact: true }).click()
    await expect(page.getByText(PESAN_TANGGAL_LAMPAU)).toHaveCount(0)
  })

  test('4a: tidak ada yang cocok menampilkan pesan dan isian tetap', async ({ page }) => {
    await bukaForm(page)
    const { tanpaPenerbangan } = DEMO
    const tanggal = tambahHari(HARI_INI, 2)
    await isiDanCari(page, tanpaPenerbangan.asal, tanpaPenerbangan.tujuan, tanggal)
    await expect(page.getByText(DITEMUKAN, { exact: true })).toBeVisible()
    await expect(page.getByTestId('penerbangan')).toHaveCount(0)
    await expect(page.getByLabel('Kota asal').locator('option:checked')).toHaveText(tanpaPenerbangan.asal)
    await expect(page.getByLabel('Kota tujuan').locator('option:checked')).toHaveText(tanpaPenerbangan.tujuan)
    await expect(page.getByLabel('Tanggal keberangkatan')).toHaveValue(tanggal)
  })

  test('G1: penerbangan Jayapura 00:00 WIT hari ini sudah berangkat menurut WIB dan tidak ditawarkan', async ({ page }) => {
    await bukaForm(page)
    const { sudahBerangkat } = DEMO
    await isiDanCari(page, sudahBerangkat.asal, sudahBerangkat.tujuan, HARI_INI)
    await expect(page.getByText(DITEMUKAN, { exact: true })).toBeVisible()
    await expect(page.getByText(sudahBerangkat.nomorPenerbangan)).toHaveCount(0)
    // Besok rute yang sama masih ada penerbangannya.
    await page.getByLabel('Tanggal keberangkatan').fill(tambahHari(HARI_INI, 1))
    await page.getByRole('button', { name: 'Cari', exact: true }).click()
    await expect(page.getByTestId('penerbangan').first()).toBeVisible()
  })

  test('lebar ponsel: hasil terbaca tanpa gulir horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await bukaForm(page)
    const { rutePadat } = DEMO
    await isiDanCari(page, rutePadat.asal, rutePadat.tujuan, tambahHari(HARI_INI, rutePadat.hariKe))
    await expect(page.getByTestId('penerbangan').first()).toBeVisible()
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(lebih).toBeLessThanOrEqual(0)
  })
})
