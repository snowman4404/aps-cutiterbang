import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  hariIniWib,
  LABEL_ETIKET_DIBATALKAN,
  LABEL_STATUS_BOOKING,
  PESAN_ETIKET_TIDAK_BERLAKU,
  PESAN_KODE_TIDAK_DITEMUKAN,
  PESAN_KODE_WAJIB,
  PESAN_TIDAK_ADA_AKSES,
  PESAN_TIDAK_ADA_PEMESANAN,
  subjekETiket,
} from '@cutiterbang/domain'
import { buatDataPemesanan } from '../apps/api/src/db/dataPemesanan.ts'
import { PROFIL_DEMO } from '../apps/api/src/db/dataProfil.ts'
import { formatTanggalDenganHari } from '../apps/web/src/lib/tanggal.ts'

// Phase 6 (simulator, US-8d, US-7, US-9). Seed dihitung dari hari ini (WIB); harapan dihitung dari data yang sama.
const HARI_INI = hariIniWib()
const SEED = [...buatDataPemesanan(HARI_INI)].sort((a, b) => b.waktuDibuat - a.waktuDibuat) // terbaru dulu (urutan US-7)
const seed = (kode: string) => SEED.find((p) => p.kode === kode)!
const nama = (kode: string) => seed(kode).penumpang.map((orang) => orang.data.namaLengkap)
const API = 'http://localhost:8787/api'
const SANDI = 'rahasia123'

const TRAVEL = 'travel@cutiterbang.test'
const PENUMPANG = 'penumpang@cutiterbang.test'
const MEMBER1 = 'member1@cutiterbang.test'
const P1 = 'pengunjung1@cutiterbang.test'
const P3 = 'pengunjung3@cutiterbang.test'

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API}/dev/reset`)
  expect(res.status()).toBe(204)
})

async function masuk(page: Page, email: string) {
  await page.context().clearCookies()
  await page.goto('/masuk')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill(SANDI)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).not.toHaveURL(/\/masuk/)
}

const barisStatus = (page: Page) => page.getByTestId('baris-status')
const baris = (page: Page, kode: string) => page.locator(`[data-testid="baris-status"][data-kode="${kode}"]`)
const kartu = (page: Page, kode: string) => page.getByTestId('tiket').filter({ has: page.getByTestId('kode').filter({ hasText: kode }) })

test.describe('US-7 Memantau status booking', () => {
  test('1: semua pemesanan terbaru dulu; tiap baris = kode, nama semua penumpang, status', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/status')
    await expect(barisStatus(page)).toHaveCount(SEED.length)
    await expect(barisStatus(page).getByTestId('kode')).toHaveText(SEED.map((p) => p.kode))
    for (const p of SEED) {
      await expect(baris(page, p.kode).getByTestId('penumpang')).toHaveText(nama(p.kode).join(', '))
      await expect(baris(page, p.kode).getByTestId('status')).toHaveText(LABEL_STATUS_BOOKING[p.status])
    }
    await expect(page.getByLabel('Status booking', { exact: true })).toHaveValue('semua')
  })

  test('2, 3, 2a: memilih status menyaring dan tinggal di URL; "Semua status" menampilkan semua lagi', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/status')
    await expect(barisStatus(page)).toHaveCount(SEED.length)

    await page.getByLabel('Status booking', { exact: true }).selectOption({ label: 'Booked' })
    await expect(page).toHaveURL(/[?&]status=Booked/)
    const booked = SEED.filter((p) => p.status === 'Booked').map((p) => p.kode)
    await expect(barisStatus(page).getByTestId('kode')).toHaveText(booked)
    await expect(barisStatus(page).getByTestId('status')).toHaveText(booked.map(() => 'Booked'))

    await page.getByLabel('Status booking', { exact: true }).selectOption({ label: 'Confirmed' })
    await expect(barisStatus(page).getByTestId('kode')).toHaveText(SEED.filter((p) => p.status === 'Confirmed').map((p) => p.kode))

    await page.getByLabel('Status booking', { exact: true }).selectOption({ label: 'Semua status' })
    await expect(page).not.toHaveURL(/status=/)
    await expect(barisStatus(page)).toHaveCount(SEED.length)

    // Pilihan filter mengikuti URL: dibuka langsung dan setelah memuat ulang.
    await page.goto('/travel/status?status=Cancelled')
    await expect(page.getByLabel('Status booking', { exact: true })).toHaveValue('Cancelled')
    await expect(barisStatus(page).getByTestId('kode')).toHaveText(SEED.filter((p) => p.status === 'Cancelled').map((p) => p.kode))
    await page.reload()
    await expect(page.getByLabel('Status booking', { exact: true })).toHaveValue('Cancelled')
    await expect(barisStatus(page)).toHaveCount(SEED.filter((p) => p.status === 'Cancelled').length)
  })

  test('lima pilihan filter: Semua status, Waiting for the payment, Booked, Confirmed, Cancelled', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/status')
    await expect(page.getByLabel('Status booking', { exact: true }).locator('option')).toHaveText([
      'Semua status',
      'Waiting for the payment',
      'Booked',
      'Confirmed',
      'Cancelled',
    ])
  })

  test('3a: tidak ada pemesanan dengan status itu', async ({ page, request }) => {
    for (const kode of SEED.filter((p) => p.status === 'WaitingForThePayment').map((p) => p.kode)) {
      expect((await request.post(`${API}/simulasi/pembayaran/${kode}`)).status()).toBe(200)
    }
    await masuk(page, TRAVEL)
    await page.goto('/travel/status')
    await page.getByLabel('Status booking', { exact: true }).selectOption({ label: LABEL_STATUS_BOOKING.WaitingForThePayment })
    await expect(page.getByText(PESAN_TIDAK_ADA_PEMESANAN)).toBeVisible()
    await expect(barisStatus(page)).toHaveCount(0)
  })

  test('*a: peran selain Manajer Travel: pesan tanpa akses dan data pemesanan tersembunyi', async ({ page }) => {
    for (const email of [PENUMPANG, MEMBER1, 'hrd@cutiterbang.test', P1]) {
      await masuk(page, email)
      for (const alamat of ['/travel/status', '/travel/cek-kode']) {
        await page.goto(alamat)
        await expect(page.getByText(PESAN_TIDAK_ADA_AKSES)).toBeVisible()
        await expect(page.getByText('CTB007')).toHaveCount(0)
        await expect(barisStatus(page)).toHaveCount(0)
      }
    }
  })

  test('menu Manajer Travel memuat "Status Booking" dan "Cek Kode Booking"', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/')
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Status Booking' })).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Cek Kode Booking' })).toBeVisible()
  })
})

test.describe('simulator demo dan US-8d e-tiket melalui email', () => {
  test('tombol simulator: WaitingForThePayment -> Booked -> Confirmed; pengunjung menerima e-tiket di emailnya', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/status')
    const ctb007 = baris(page, 'CTB007')
    await expect(ctb007.getByTestId('status')).toHaveText('Waiting for the payment')
    await expect(ctb007.getByRole('button', { name: 'Simulasikan konfirmasi maskapai' })).toHaveCount(0) // hanya untuk Booked

    await ctb007.getByRole('button', { name: 'Simulasikan pembayaran' }).click()
    await expect(ctb007.getByTestId('status')).toHaveText('Booked')
    await expect(ctb007.getByRole('button', { name: 'Simulasikan pembayaran' })).toHaveCount(0)

    await ctb007.getByRole('button', { name: 'Simulasikan konfirmasi maskapai' }).click()
    await expect(ctb007.getByTestId('status')).toHaveText('Confirmed')
    await expect(ctb007.getByRole('button', { name: /Simulasikan/ })).toHaveCount(0)

    // Pengunjung: e-tiket dan email ke alamat profilnya sendiri, berisi nama semua penumpang, kode, penerbangan.
    for (const email of [P1, P3]) {
      await masuk(page, email)
      await page.goto('/tiket-dipesankan')
      const k = kartu(page, 'CTB007')
      await expect(k.getByTestId('status')).toHaveText('Confirmed')
      await expect(k.getByTestId('nomor-etiket')).toHaveText('ET-CTB007')
      await expect(k.getByTestId('etiket')).toHaveAttribute('data-berlaku', 'true')
      const surel = k.getByTestId('email-etiket')
      await expect(surel).toHaveCount(1)
      await expect(surel.getByTestId('kepada')).toHaveText(PROFIL_DEMO[email]!.email!)
      await expect(surel).toContainText(subjekETiket('CTB007'))
      await expect(surel.getByTestId('waktu-kirim')).toContainText('WIB')
      for (const bagian of [...nama('CTB007'), 'CTB007', 'ET-CTB007', seed('CTB007').nomorPenerbangan, seed('CTB007').tanggalKeberangkatan])
        await expect(surel.getByTestId('isi-email')).toContainText(bagian)
    }
  })

  test('tombol konfirmasi maskapai untuk Booked seed (CTB008) menerbitkan e-tiket; hanya satu email ke pengunjungnya', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/status?status=Booked')
    await baris(page, 'CTB008').getByRole('button', { name: 'Simulasikan konfirmasi maskapai' }).click()
    await expect(baris(page, 'CTB008')).toHaveCount(0) // tidak lagi Booked: hilang dari filter setelah dimuat ulang
    await masuk(page, P1)
    await page.goto('/tiket-dipesankan')
    await expect(kartu(page, 'CTB008').getByTestId('email-etiket')).toHaveCount(1)
    await expect(kartu(page, 'CTB008').getByTestId('nomor-etiket')).toHaveText('ET-CTB008')
  })

  test('seed CTB009: pengunjung melihat e-tiket dan emailnya; CTB008 (Booked) belum punya', async ({ page }) => {
    await masuk(page, P3)
    await page.goto('/tiket-dipesankan')
    await expect(page.getByTestId('tiket').getByTestId('kode')).toHaveText(['CTB007', 'CTB009']) // terbaru dulu; P3 tidak ada di CTB008
    await expect(kartu(page, 'CTB009').getByTestId('email-etiket').getByTestId('kepada')).toHaveText(PROFIL_DEMO[P3]!.email!)
    await expect(kartu(page, 'CTB007').getByTestId('etiket')).toHaveCount(0)
    await masuk(page, P1)
    await page.goto('/tiket-dipesankan')
    await expect(kartu(page, 'CTB008').getByTestId('etiket')).toHaveCount(0)
    await expect(kartu(page, 'CTB008').getByTestId('email-etiket')).toHaveCount(0)
  })

  test('pemesanan US-2a: e-tiket tampil di Tiket Saya (Member) tanpa email', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/tiket-saya')
    await expect(kartu(page, 'CTB005').getByTestId('nomor-etiket')).toHaveText('ET-CTB005')
    await expect(kartu(page, 'CTB005').getByTestId('etiket')).toHaveAttribute('data-berlaku', 'true')
    await expect(page.getByTestId('email-etiket')).toHaveCount(0)
    await expect(kartu(page, 'CTB003').getByTestId('etiket')).toHaveCount(0) // Booked: belum ada e-tiket
  })

  test('G5: e-tiket pemesanan Cancelled tampil void ("Dibatalkan", tidak berlaku untuk perjalanan)', async ({ page }) => {
    await masuk(page, PENUMPANG)
    await page.goto('/tiket-saya')
    // Seed CTB010: Confirmed lalu dibatalkan.
    const ctb010 = kartu(page, 'CTB010')
    await expect(ctb010.getByTestId('status')).toHaveText('Cancelled')
    await expect(ctb010.getByTestId('nomor-etiket')).toHaveText('ET-CTB010')
    await expect(ctb010.getByTestId('etiket')).toHaveAttribute('data-berlaku', 'false')
    await expect(ctb010.getByTestId('label-etiket')).toHaveText(LABEL_ETIKET_DIBATALKAN)
    await expect(ctb010.getByTestId('catatan-etiket')).toContainText(PESAN_ETIKET_TIDAK_BERLAKU)
    await expect(kartu(page, 'CTB002').getByTestId('etiket')).toHaveCount(0) // Cancelled tanpa pernah Confirmed

    // Membatalkan CTB006 (Confirmed) lewat UI membuat e-tiketnya void.
    const ctb006 = kartu(page, 'CTB006')
    await expect(ctb006.getByTestId('etiket')).toHaveAttribute('data-berlaku', 'true')
    await expect(ctb006.getByTestId('label-etiket')).toHaveCount(0)
    await ctb006.getByRole('button', { name: /Batalkan/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Ya, batalkan' }).click()
    await expect(ctb006.getByTestId('status')).toHaveText('Cancelled')
    await expect(ctb006.getByTestId('nomor-etiket')).toHaveText('ET-CTB006') // tetap ada
    await expect(ctb006.getByTestId('etiket')).toHaveAttribute('data-berlaku', 'false')
    await expect(ctb006.getByTestId('label-etiket')).toHaveText(LABEL_ETIKET_DIBATALKAN)
  })
})

test.describe('US-9 Memeriksa status booking dengan kode booking reference', () => {
  async function periksa(page: Page, kode: string) {
    await page.getByLabel('Kode booking reference').fill(kode)
    await page.getByRole('button', { name: 'Periksa' }).click()
  }

  test('5, 3: kode terdaftar (huruf kecil dan spasi di tepi) menampilkan status, nama penumpang, nomor dan tanggal', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/cek-kode')
    await periksa(page, '  ctb007 ')
    const hasil = page.getByLabel('Status booking')
    await expect(hasil.getByTestId('kode')).toHaveText('CTB007')
    await expect(hasil.getByTestId('status')).toHaveText('Waiting for the payment')
    await expect(hasil.getByTestId('penumpang')).toHaveText(nama('CTB007').join(', '))
    await expect(hasil.getByTestId('nomor-penerbangan')).toHaveText(seed('CTB007').nomorPenerbangan)
    await expect(hasil.getByTestId('tanggal-keberangkatan')).toHaveText(formatTanggalDenganHari(seed('CTB007').tanggalKeberangkatan))
  })

  test('status mengikuti pemesanan: Confirmed seed (CTB009) tampil Confirmed', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/cek-kode')
    await periksa(page, 'CTB009')
    await expect(page.getByLabel('Status booking').getByTestId('status')).toHaveText('Confirmed')
  })

  test('2a: kolom kode kosong ditandai, tidak ada data pemesanan', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/cek-kode')
    await page.getByRole('button', { name: 'Periksa' }).click()
    await expect(page.getByText(PESAN_KODE_WAJIB)).toBeVisible()
    await expect(page.getByLabel('Kode booking reference')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Status booking')).toHaveCount(0)
  })

  test('4a: kode tidak terdaftar: pesan, data tersembunyi, kode tetap terisi; diperbaiki tanpa memuat ulang halaman', async ({ page }) => {
    await masuk(page, TRAVEL)
    await page.goto('/travel/cek-kode')
    await page.evaluate(() => ((window as unknown as { penanda: number }).penanda = 1))
    await periksa(page, 'ZZZZZZ')
    await expect(page.getByText(PESAN_KODE_TIDAK_DITEMUKAN)).toBeVisible()
    await expect(page.getByLabel('Kode booking reference')).toHaveValue('ZZZZZZ')
    await expect(page.getByLabel('Status booking')).toHaveCount(0)

    await periksa(page, 'CTB003')
    await expect(page.getByText(PESAN_KODE_TIDAK_DITEMUKAN)).toHaveCount(0)
    await expect(page.getByLabel('Status booking').getByTestId('status')).toHaveText('Booked')
    await expect(page.getByLabel('Status booking').getByTestId('nomor-penerbangan')).toHaveText(seed('CTB003').nomorPenerbangan)
    expect(await page.evaluate(() => (window as unknown as { penanda?: number }).penanda)).toBe(1) // halaman tidak dimuat ulang

    await periksa(page, 'ZZZZZZ') // hasil lama hilang lagi
    await expect(page.getByLabel('Status booking')).toHaveCount(0)
  })
})

test.describe('lebar ponsel (375px)', () => {
  test('Status Booking, Cek Kode dan Tiket Saya dengan email e-tiket tanpa gulir horizontal halaman', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    const lebih = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    await masuk(page, TRAVEL)
    await page.goto('/travel/status')
    await expect(barisStatus(page).first()).toBeVisible()
    expect(await lebih()).toBeLessThanOrEqual(0)
    await page.goto('/travel/cek-kode')
    await page.getByLabel('Kode booking reference').fill('CTB007')
    await page.getByRole('button', { name: 'Periksa' }).click()
    await expect(page.getByLabel('Status booking').getByTestId('kode')).toBeVisible()
    expect(await lebih()).toBeLessThanOrEqual(0)

    await masuk(page, P1)
    await page.goto('/tiket-dipesankan')
    await expect(kartu(page, 'CTB009').getByTestId('email-etiket')).toBeVisible()
    expect(await lebih()).toBeLessThanOrEqual(0)
    await masuk(page, PENUMPANG)
    await page.goto('/tiket-saya')
    await expect(kartu(page, 'CTB010').getByTestId('catatan-etiket')).toBeVisible()
    expect(await lebih()).toBeLessThanOrEqual(0)
  })
})
