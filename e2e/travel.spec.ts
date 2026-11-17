import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  hariIniWib,
  PESAN_ASAL_WAJIB,
  PESAN_DAFTAR_PENGUNJUNG_KOSONG,
  PESAN_JUMLAH_TIDAK_SAH,
  PESAN_JUMLAH_WAJIB,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_TIDAK_ADA_AKSES,
  tambahHari,
} from '@cutiterbang/domain'
import { buatDataPemesanan, PENUMPANG } from '../apps/api/src/db/dataPemesanan.ts'
import { buatDataPenerbangan, DEMO, KOTA } from '../apps/api/src/db/dataPenerbangan.ts'
import { PROFIL_DEMO } from '../apps/api/src/db/dataProfil.ts'

// Phase 6 (US-8a, US-8b, US-8c): Manajer Travel mencari dan memesan untuk pengunjung; Pengunjung melihat tiketnya.
// Seed dihitung dari hari ini (WIB); harapan dihitung dari data yang sama.
const HARI_INI = hariIniWib()
const DATA = buatDataPenerbangan(HARI_INI)
const CTB007 = buatDataPemesanan(HARI_INI).find((p) => p.kode === 'CTB007')!
const API = 'http://localhost:8787/api'
const SANDI = 'rahasia123'

const TRAVEL = 'travel@cutiterbang.test'
const P1 = 'pengunjung1@cutiterbang.test'
const P2 = 'pengunjung2@cutiterbang.test'
const P3 = 'pengunjung3@cutiterbang.test'
const NAMA_P1 = PENUMPANG[P1]!.namaLengkap
const NAMA_P3 = PENUMPANG[P3]!.namaLengkap
// Banyaknya pemesanan seed Manajer Travel yang mencantumkan tiap pengunjung (CTB007, CTB008, CTB009).
const SEED_PENGUNJUNG: Record<string, number> = Object.fromEntries(
  [P1, P2, P3].map((email) => [email, buatDataPemesanan(HARI_INI).filter((p) => p.penumpang.some((orang) => orang.akunEmail === email)).length]),
)
const NAMA_P2 = PROFIL_DEMO[P2]!.namaLengkap!

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

/** Penerbangan seed pada rute dan hari ke-N, urut waktu berangkat (urutan hasil pencarian). */
const penerbanganSeed = (asal: string, tujuan: string, hariKe: number) =>
  DATA.penerbangan
    .filter((p) => p.asal === asal && p.tujuan === tujuan && p.tanggalKeberangkatan === tambahHari(HARI_INI, hariKe))
    .sort((a, b) => a.waktuBerangkat.localeCompare(b.waktuBerangkat))

async function cariUntukPengunjung(page: Page, asal: string, tujuan: string, tanggal: string, jumlah: string) {
  await page.goto('/travel/cari')
  await expect(page.getByLabel('Kota asal').locator('option')).toHaveCount(KOTA.length + 1)
  await page.getByLabel('Kota asal').selectOption({ label: asal })
  await page.getByLabel('Kota tujuan').selectOption({ label: tujuan })
  await page.getByLabel('Tanggal keberangkatan').fill(tanggal)
  await page.getByLabel('Jumlah penumpang').fill(jumlah)
  await page.getByRole('button', { name: 'Cari', exact: true }).click()
}

const barisPengunjung = (page: Page, nama: string) => page.getByTestId('pengunjung').filter({ has: page.getByText(nama, { exact: true }) })
const pilihPengunjung = (page: Page, nama: string) => barisPengunjung(page, nama).getByRole('checkbox').check()

const RUTE = { asal: 'Jakarta', tujuan: 'Denpasar', hariKe: DEMO.rutePadat.hariKe }

test.describe('US-8a Mencari penerbangan untuk pengunjung', () => {
  test('hasil memuat informasi penerbangan dan sisa kursi, urut waktu berangkat; pencarian ada di URL', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/cari')
    await expect(page.getByRole('heading', { name: 'Cari untuk Pengunjung' })).toBeVisible()
    await cariUntukPengunjung(page, RUTE.asal, RUTE.tujuan, tambahHari(HARI_INI, RUTE.hariKe), '2')
    const seed = penerbanganSeed(RUTE.asal, RUTE.tujuan, RUTE.hariKe)
    const kartu = page.getByTestId('penerbangan')
    await expect(kartu).toHaveCount(seed.length)
    await expect(kartu.nth(0).getByTestId('sisa-kursi')).toHaveText(`Sisa ${seed[0]!.jumlahKursi} kursi`)
    await expect(kartu.nth(0)).toContainText(seed[0]!.nomorPenerbangan)
    expect(await kartu.evaluateAll((els) => els.map((el) => el.querySelector('[data-testid=berangkat]')!.textContent!.slice(0, 5)))).toEqual(
      seed.map((p) => p.waktuBerangkat),
    )
    await expect(page).toHaveURL(/jumlah=2/)
    await page.reload()
    await expect(page.getByLabel('Jumlah penumpang')).toHaveValue('2')
    await expect(kartu).toHaveCount(seed.length)
  })

  test('hanya penerbangan dengan sisa kursi cukup; 3a "Penerbangan tidak ditemukan" dengan isian tetap', async ({ page }) => {
    await masuk(page, TRAVEL)
    const { asal, tujuan, hariKe } = DEMO.kursiTerakhir
    const tanggal = tambahHari(HARI_INI, hariKe)
    await cariUntukPengunjung(page, asal, tujuan, tanggal, '1')
    // SJ901 sudah terjual (sisa 0); BW902 sisa 1
    await expect(page.getByTestId('penerbangan')).toHaveCount(1)
    await expect(page.getByTestId('penerbangan').first()).toContainText(DEMO.kursiTerakhir.nomorPenerbangan)
    await expect(page.getByTestId('sisa-kursi')).toHaveText('Sisa 1 kursi')

    await page.getByLabel('Jumlah penumpang').fill('2')
    await page.getByRole('button', { name: 'Cari', exact: true }).click()
    await expect(page.getByText(PESAN_PENERBANGAN_TIDAK_DITEMUKAN)).toBeVisible()
    await expect(page.getByTestId('penerbangan')).toHaveCount(0)
    await expect(page.getByLabel('Kota asal')).toHaveValue(/\d+/)
    await expect(page.getByLabel('Tanggal keberangkatan')).toHaveValue(tanggal)
    await expect(page.getByLabel('Jumlah penumpang')).toHaveValue('2')
  })

  test('2a dan 2d: kolom yang salah ditandai, tidak ada hasil', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/cari')
    await page.getByRole('button', { name: 'Cari', exact: true }).click()
    await expect(page.getByText(PESAN_ASAL_WAJIB)).toBeVisible()
    await expect(page.getByText(PESAN_JUMLAH_WAJIB)).toBeVisible()
    await expect(page.getByTestId('penerbangan')).toHaveCount(0)

    for (const jumlah of ['0', '-1', '1.5', 'dua']) {
      await cariUntukPengunjung(page, RUTE.asal, RUTE.tujuan, tambahHari(HARI_INI, RUTE.hariKe), jumlah)
      await expect(page.getByText(PESAN_JUMLAH_TIDAK_SAH)).toBeVisible()
      await expect(page.getByTestId('penerbangan')).toHaveCount(0)
    }
  })
})

test.describe('US-8b Memesan tiket atas nama pengunjung', () => {
  test('cari -> pilih dua pengunjung -> data dari profil -> konfirmasi: satu pemesanan; kursi berkurang dua; pengunjung melihatnya', async ({
    page,
    browser,
  }) => {
    await masuk(page, TRAVEL)
    const seed = penerbanganSeed(RUTE.asal, RUTE.tujuan, RUTE.hariKe)[0]!
    await cariUntukPengunjung(page, RUTE.asal, RUTE.tujuan, tambahHari(HARI_INI, RUTE.hariKe), '2')
    await page.getByTestId('penerbangan').first().getByRole('link', { name: /Pesan untuk pengunjung/ }).click()
    await expect(page).toHaveURL(/\/travel\/pesan\/\d+\?jumlah=2$/)
    await expect(page.getByTestId('jumlah-dicari')).toContainText('2 penumpang')
    await expect(page.getByTestId('sisa-kursi')).toHaveText(`Sisa ${seed.jumlahKursi} kursi`)

    // semua pengunjung terdaftar dengan statusProfil
    await expect(page.getByTestId('pengunjung')).toHaveCount(3)
    await expect(barisPengunjung(page, NAMA_P1).getByTestId('status-profil')).toHaveText('lengkap')
    await expect(barisPengunjung(page, NAMA_P2).getByTestId('status-profil')).toHaveText('tidak lengkap')

    // langkah 3: data penumpang dari profil, hanya-baca
    await pilihPengunjung(page, NAMA_P1)
    await pilihPengunjung(page, NAMA_P3)
    await expect(page.getByTestId('jumlah-terpilih')).toHaveText('2 pengunjung dipilih')
    await expect(barisPengunjung(page, NAMA_P1).getByTestId('data-nomorIdentitas')).toHaveText(PENUMPANG[P1]!.nomorIdentitas)
    await expect(barisPengunjung(page, NAMA_P3).getByTestId('data-nomorTelepon')).toHaveText(PENUMPANG[P3]!.nomorTelepon)
    await expect(barisPengunjung(page, NAMA_P3).getByTestId('data-email')).toHaveText(PENUMPANG[P3]!.email)
    await expect(barisPengunjung(page, NAMA_P1).locator('input[type=text], input[type=email]')).toHaveCount(0)

    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    const hasil = page.getByTestId('tiket')
    await expect(hasil).toHaveCount(1)
    await expect(hasil.getByTestId('status')).toHaveText('Waiting for the payment')
    await expect(hasil.getByTestId('penumpang')).toHaveText(`${NAMA_P1}, ${NAMA_P3}`)
    const kode = (await hasil.getByTestId('kode').textContent())!.trim()
    expect(kode).toMatch(/^[A-Z2-9]{6}$/)

    // kursi berkurang sebanyak pengunjung (dua)
    await cariUntukPengunjung(page, RUTE.asal, RUTE.tujuan, tambahHari(HARI_INI, RUTE.hariKe), '2')
    await expect(page.getByTestId('penerbangan').first().getByTestId('sisa-kursi')).toHaveText(`Sisa ${seed.jumlahKursi - 2} kursi`)

    // US-8c: kedua pengunjung melihat pemesanan baru dengan kode yang sama; pengunjung lain tidak
    for (const email of [P1, P3]) {
      const konteks = await browser.newContext()
      const halaman = await konteks.newPage()
      await masuk(halaman, email)
      await halaman.goto('/tiket-dipesankan')
      await expect(halaman.getByTestId('tiket').filter({ has: halaman.locator(`[data-testid=kode]:has-text("${kode}")`) })).toHaveCount(1)
      await expect(halaman.getByTestId('tiket')).toHaveCount(SEED_PENGUNJUNG[email]! + 1) // pemesanan seed Manajer Travel dan pemesanan baru
      await konteks.close()
    }
    const konteks2 = await browser.newContext()
    const halaman2 = await konteks2.newPage()
    await masuk(halaman2, P2)
    await halaman2.goto('/tiket-dipesankan')
    await expect(halaman2.getByText('Belum ada tiket')).toBeVisible()
    await konteks2.close()
  })

  test('daftar kosong: pesan "Pilih satu atau lebih pengunjung terdaftar", tidak ada pemesanan', async ({ page }) => {
    await masuk(page, TRAVEL)
    await cariUntukPengunjung(page, RUTE.asal, RUTE.tujuan, tambahHari(HARI_INI, RUTE.hariKe), '1')
    await page.getByTestId('penerbangan').first().getByRole('link', { name: /Pesan untuk pengunjung/ }).click()
    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    // Petunjuk jumlah memakai frasa yang sama, jadi pesan galatnya dicari di dalam alert.
    await expect(page.getByRole('alert').filter({ hasText: PESAN_DAFTAR_PENGUNJUNG_KOSONG })).toBeVisible()
    await expect(page.getByTestId('tiket')).toHaveCount(0)
  })

  test('5a: profil seorang pengunjung tidak lengkap: pesan menyebut namanya, tidak ada pemesanan', async ({ page, browser }) => {
    await masuk(page, TRAVEL)
    await cariUntukPengunjung(page, RUTE.asal, RUTE.tujuan, tambahHari(HARI_INI, RUTE.hariKe), '2')
    await page.getByTestId('penerbangan').first().getByRole('link', { name: /Pesan untuk pengunjung/ }).click()
    await pilihPengunjung(page, NAMA_P1)
    await pilihPengunjung(page, NAMA_P2)
    await expect(barisPengunjung(page, NAMA_P2).getByTestId('data-nomorIdentitas')).toHaveText('Belum diisi')
    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    await expect(page.getByText(`Data profil tidak lengkap: ${NAMA_P2}`)).toBeVisible()
    await expect(page.getByTestId('tiket')).toHaveCount(0)
    // pilihan tetap ada: manajer bisa membatalkan pilihan pengunjung itu dan mencoba lagi
    await barisPengunjung(page, NAMA_P2).getByRole('checkbox').uncheck()
    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    await expect(page.getByTestId('tiket')).toHaveCount(1)

    const konteks = await browser.newContext()
    const halaman = await konteks.newPage()
    await masuk(halaman, P2)
    await halaman.goto('/tiket-dipesankan')
    await expect(halaman.getByText('Belum ada tiket')).toBeVisible()
    await konteks.close()
  })

  test('5b: kursi kurang dari jumlah pengunjung: "Kursi sudah habis", tidak ada pemesanan', async ({ page, request }) => {
    await masuk(page, TRAVEL)
    const { asal, tujuan, hariKe } = DEMO.kursiTerakhir
    // BW902 hanya sisa satu kursi: dicari untuk 1 penumpang, tetapi dipilih dua pengunjung (jumlah hanya petunjuk)
    await cariUntukPengunjung(page, asal, tujuan, tambahHari(HARI_INI, hariKe), '1')
    await page.getByTestId('penerbangan').first().getByRole('link', { name: /Pesan untuk pengunjung/ }).click()
    await pilihPengunjung(page, NAMA_P1)
    await pilihPengunjung(page, NAMA_P3)
    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    await expect(page.getByText('Kursi sudah habis')).toBeVisible()
    await expect(page.getByTestId('tiket')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Cari penerbangan lain' })).toBeVisible()
    // kursi tetap satu
    const id = page.url().match(/\/travel\/pesan\/(\d+)/)![1]
    const ringkasan = (await (await request.get(`${API}/penerbangan/${id}`)).json()) as { penerbangan: { sisaKursi: number } }
    expect(ringkasan.penerbangan.sisaKursi).toBe(1)
  })
})

test.describe('US-8c Melihat tiket yang dipesankan', () => {
  test('pengunjung melihat pemesanan seed yang mencantumkannya: kode, status, informasi penerbangan, tanpa Batalkan', async ({ page }) => {
    await masuk(page, P1)
    await page.goto('/tiket-dipesankan')
    await expect(page.getByTestId('tiket')).toHaveCount(SEED_PENGUNJUNG[P1]!) // CTB007, CTB008 dan CTB009
    const tiket = page.getByTestId('tiket').filter({ has: page.getByTestId('kode').filter({ hasText: CTB007.kode }) })
    await expect(tiket.getByTestId('kode')).toHaveText(CTB007.kode)
    await expect(tiket.getByTestId('status')).toHaveText('Waiting for the payment')
    await expect(tiket).toContainText(CTB007.nomorPenerbangan)
    await expect(tiket.getByTestId('penumpang')).toHaveText(CTB007.penumpang.map((orang) => orang.data.namaLengkap).join(', '))
    await expect(page.getByRole('button', { name: /Batalkan/ })).toHaveCount(0)
  })

  test('pengunjung tanpa pemesanan: "Belum ada tiket"', async ({ page }) => {
    await masuk(page, P2)
    await page.goto('/tiket-dipesankan')
    await expect(page.getByText('Belum ada tiket')).toBeVisible()
    await expect(page.getByTestId('tiket')).toHaveCount(0)
  })
})

test.describe('akses (G12)', () => {
  test('peran selain Manajer Travel tidak membuka /travel/cari dan /travel/pesan; selain Pengunjung tidak membuka /tiket-dipesankan', async ({ page }) => {
    for (const email of ['penumpang@cutiterbang.test', 'hrd@cutiterbang.test', P1]) {
      await masuk(page, email)
      for (const alamat of ['/travel/cari', '/travel/pesan/1']) {
        await page.goto(alamat)
        await expect(page.getByText(PESAN_TIDAK_ADA_AKSES)).toBeVisible()
      }
      await page.context().clearCookies()
    }
    await masuk(page, TRAVEL)
    await page.goto('/tiket-dipesankan')
    await expect(page.getByText(PESAN_TIDAK_ADA_AKSES)).toBeVisible()
  })

  test('tanpa login: diarahkan ke halaman masuk', async ({ page }) => {
    await page.goto('/travel/cari')
    await expect(page).toHaveURL(/\/masuk\?next=/)
  })

  test('menu: Manajer Travel melihat "Cari untuk Pengunjung"', async ({ page }) => {
    await masuk(page, TRAVEL)
    await expect(page.getByRole('link', { name: /Cari untuk Pengunjung/ }).first()).toBeVisible()
  })
})

test.describe('lebar ponsel (375px)', () => {
  test('pencarian, pemesanan dan Tiket Saya tanpa gulir horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    const lebih = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    await masuk(page, TRAVEL)
    await cariUntukPengunjung(page, RUTE.asal, RUTE.tujuan, tambahHari(HARI_INI, RUTE.hariKe), '2')
    await expect(page.getByTestId('penerbangan').first()).toBeVisible()
    expect(await lebih()).toBeLessThanOrEqual(0)
    await page.getByTestId('penerbangan').first().getByRole('link', { name: /Pesan untuk pengunjung/ }).click()
    await pilihPengunjung(page, NAMA_P1)
    await pilihPengunjung(page, NAMA_P3)
    await expect(page.getByTestId('data-email').first()).toBeVisible()
    expect(await lebih()).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    await expect(page.getByTestId('tiket')).toHaveCount(1)
    expect(await lebih()).toBeLessThanOrEqual(0)

    await page.context().clearCookies()
    await masuk(page, P1)
    await page.goto('/tiket-dipesankan')
    await expect(page.getByTestId('tiket').first()).toBeVisible()
    expect(await lebih()).toBeLessThanOrEqual(0)
  })
})
