import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  hariIniWib,
  PESAN_EMAIL,
  PESAN_KODE_TIDAK_DITEMUKAN,
  PESAN_KODE_WAJIB,
  PESAN_NOMOR_IDENTITAS,
  PESAN_NOMOR_TELEPON,
  PESAN_PROFIL_TERSIMPAN,
  PESAN_PROFIL_TIDAK_LENGKAP,
  PESAN_TIDAK_ADA_AKSES,
  PESAN_TIKET_BELUM_TERKONFIRMASI,
  PESAN_TIKET_SUDAH_TERVALIDASI,
  PESAN_TIKET_TIDAK_COCOK,
} from '@cutiterbang/domain'
import { buatDataPemesanan } from '../apps/api/src/db/dataPemesanan.ts'
import { PROFIL_DEMO } from '../apps/api/src/db/dataProfil.ts'

// Phase 5: Profil (US-5a) dan Validasi Tiket (US-5b). Harapan dihitung dari data seed yang sama dengan API.
const API = 'http://localhost:8787/api'
const SANDI = 'rahasia123'
const HARI_INI = hariIniWib()
const MEMBER1 = 'member1@cutiterbang.test' // Sari Dewi: profil lengkap; CTB003 Booked, CTB005 Confirmed
const MEMBER2 = 'member2@cutiterbang.test' // Andi Pratama: profil tidak lengkap
const CTB005 = buatDataPemesanan(HARI_INI).find((p) => p.kode === 'CTB005')!

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

async function validasi(page: Page, kode: string) {
  await page.getByLabel('Kode booking reference').fill(kode)
  await page.getByRole('button', { name: 'Validasi', exact: true }).click()
}

test.describe('US-5a Memperbarui data profil', () => {
  test('menampilkan data terakhir disimpan, kolom wajib bertanda dan status', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/profil')
    const data = PROFIL_DEMO[MEMBER1]!
    await expect(page.getByLabel('Nama lengkap')).toHaveValue(data.namaLengkap!)
    await expect(page.getByLabel('Nomor identitas')).toHaveValue(data.nomorIdentitas!)
    await expect(page.getByLabel('Tanggal lahir')).toHaveValue(data.tanggalLahir!)
    await expect(page.getByLabel('Nomor telepon')).toHaveValue(data.nomorTelepon!)
    await expect(page.getByLabel('Email')).toHaveValue(data.email!)
    await expect(page.getByTestId('status-profil')).toHaveText('lengkap')
    await expect(page.getByText(/^Wajib/)).toHaveCount(5)
  })

  test('profil tidak lengkap: kolom kosong dan status "tidak lengkap"; melengkapinya menyimpan dan mengubah status', async ({ page }) => {
    await masuk(page, MEMBER2)
    await page.goto('/profil')
    await expect(page.getByTestId('status-profil')).toHaveText('tidak lengkap')
    await expect(page.getByLabel('Nomor identitas')).toHaveValue('')
    await page.getByLabel('Nomor identitas').fill('3171010303880003')
    await page.getByRole('button', { name: 'Simpan', exact: true }).click()
    await expect(page.getByText(PESAN_PROFIL_TERSIMPAN, { exact: true })).toBeVisible()
    await expect(page.getByTestId('status-profil')).toHaveText('lengkap')
    await page.reload()
    await expect(page.getByLabel('Nomor identitas')).toHaveValue('3171010303880003')
    await expect(page.getByTestId('status-profil')).toHaveText('lengkap')
  })

  test('mengosongkan kolom tersimpan kosong dan status menjadi "tidak lengkap"', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/profil')
    await page.getByLabel('Nomor telepon').fill('')
    await page.getByRole('button', { name: 'Simpan', exact: true }).click()
    await expect(page.getByText(PESAN_PROFIL_TERSIMPAN, { exact: true })).toBeVisible()
    await expect(page.getByTestId('status-profil')).toHaveText('tidak lengkap')
    await page.reload()
    await expect(page.getByLabel('Nomor telepon')).toHaveValue('')
  })

  test('4a: kolom terisi berformat salah ditandai per kolom dan tidak tersimpan; kolom kosong tidak dipersoalkan', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/profil')
    await page.getByLabel('Nomor identitas').fill('123')
    await page.getByLabel('Nomor telepon').fill('12')
    await page.getByLabel('Email').fill('')
    await page.getByRole('button', { name: 'Simpan', exact: true }).click()
    await expect(page.getByText(PESAN_NOMOR_IDENTITAS, { exact: true }).last()).toBeVisible()
    await expect(page.getByText(PESAN_NOMOR_TELEPON, { exact: true }).last()).toBeVisible()
    await expect(page.getByText(PESAN_EMAIL, { exact: true })).toHaveCount(0) // email kosong boleh
    await expect(page.getByText(PESAN_PROFIL_TERSIMPAN)).toHaveCount(0)
    await expect(page.getByLabel('Nomor identitas')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Email')).not.toHaveAttribute('aria-invalid', 'true')
    await page.reload()
    await expect(page.getByLabel('Nomor identitas')).toHaveValue(PROFIL_DEMO[MEMBER1]!.nomorIdentitas!)
  })

  test('hanya Member: calon penumpang melihat pesan tidak ada akses', async ({ page }) => {
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto('/profil')
    await expect(page.getByText(PESAN_TIDAK_ADA_AKSES)).toBeVisible()
  })

  test('daftar sebagai Member membuat profil kosong "tidak lengkap"', async ({ page }) => {
    await page.goto('/daftar')
    await page.getByLabel('Nama').fill('Orang Baru')
    await page.getByLabel('Email').fill('baru@contoh.test')
    await page.getByLabel('Kata sandi').fill('rahasia123')
    await page.getByLabel('Member Frequent Traveller').check()
    await page.getByRole('button', { name: 'Daftar', exact: true }).click()
    await expect(page).not.toHaveURL(/\/daftar/)
    await page.goto('/profil')
    await expect(page.getByTestId('status-profil')).toHaveText('tidak lengkap')
    await expect(page.getByLabel('Nama lengkap')).toHaveValue('')
  })

  test('lebar ponsel: profil tanpa gulir ke samping', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await masuk(page, MEMBER1)
    await page.goto('/profil')
    await expect(page.getByTestId('status-profil')).toBeVisible()
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(lebih).toBeLessThanOrEqual(0)
  })
})

test.describe('US-5b Memvalidasi tiket', () => {
  test('2a: kode kosong menandai kolom', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/validasi-tiket')
    await page.getByRole('button', { name: 'Validasi', exact: true }).click()
    await expect(page.getByText(PESAN_KODE_WAJIB)).toBeVisible()
    await expect(page.getByLabel('Kode booking reference')).toHaveAttribute('aria-invalid', 'true')
  })

  test('3a: profil tidak lengkap ditolak sebelum kode diperiksa (juga kode yang tidak ada)', async ({ page }) => {
    await masuk(page, MEMBER2)
    await page.goto('/validasi-tiket')
    await validasi(page, 'TIDAKADA')
    await expect(page.getByText(PESAN_PROFIL_TIDAK_LENGKAP, { exact: true })).toBeVisible()
    await expect(page.getByText(PESAN_KODE_TIDAK_DITEMUKAN)).toHaveCount(0)
  })

  test('4a dan 5a: kode tidak ditemukan; Booked belum terkonfirmasi', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/validasi-tiket')
    await validasi(page, 'TIDAKADA')
    await expect(page.getByText(PESAN_KODE_TIDAK_DITEMUKAN, { exact: true })).toBeVisible()
    await validasi(page, 'CTB003')
    await expect(page.getByText(PESAN_TIKET_BELUM_TERKONFIRMASI, { exact: true })).toBeVisible()
    await expect(page.getByText(PESAN_KODE_TIDAK_DITEMUKAN)).toHaveCount(0)
  })

  test('6a: tiket orang lain "tidak valid", tanpa data penumpang, tidak tercatat', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/validasi-tiket')
    await validasi(page, 'CTB006')
    const hasil = page.getByLabel('Hasil validasi')
    await expect(hasil).toContainText('tidak valid')
    await expect(hasil).toContainText(PESAN_TIKET_TIDAK_COCOK)
    await expect(page.getByText('Budi Santoso')).toHaveCount(0)
    await expect(page.getByText('Belum ada perjalanan tercatat')).toBeVisible()
  })

  test('sukses: "valid", kode tanpa membedakan huruf dan spasi, tercatat; 8a: "Tiket sudah tervalidasi" dan tetap satu', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/validasi-tiket')
    await expect(page.getByText('Belum ada perjalanan tercatat')).toBeVisible()
    await validasi(page, `  ${CTB005.kode.toLowerCase()} `)
    const hasil = page.getByLabel('Hasil validasi')
    await expect(hasil).toContainText('valid')
    await expect(hasil).toContainText(CTB005.kode)
    await expect(hasil).toContainText(CTB005.nomorPenerbangan)
    await expect(hasil).not.toContainText(PESAN_TIKET_SUDAH_TERVALIDASI)
    const daftar = page.getByRole('list', { name: 'Perjalanan tercatat' })
    await expect(daftar.getByRole('listitem')).toHaveCount(1)

    await validasi(page, CTB005.kode)
    await expect(page.getByLabel('Hasil validasi')).toContainText(PESAN_TIKET_SUDAH_TERVALIDASI)
    await expect(daftar.getByRole('listitem')).toHaveCount(1)
  })

  test('G8: setelah tiket yang tercatat dibatalkan, perjalanan hilang dari daftar', async ({ page }) => {
    await masuk(page, MEMBER1)
    await page.goto('/validasi-tiket')
    await validasi(page, CTB005.kode)
    await expect(page.getByRole('list', { name: 'Perjalanan tercatat' }).getByRole('listitem')).toHaveCount(1)
    await page.goto('/tiket-saya')
    await page.getByRole('button', { name: `Batalkan pemesanan ${CTB005.kode}` }).click()
    await page.getByRole('button', { name: 'Ya, batalkan' }).click()
    await expect(page.getByRole('button', { name: 'Ya, batalkan' })).toHaveCount(0)
    await page.goto('/validasi-tiket')
    await expect(page.getByText('Belum ada perjalanan tercatat')).toBeVisible()
  })

  test('hanya Member: calon penumpang melihat pesan tidak ada akses', async ({ page }) => {
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto('/validasi-tiket')
    await expect(page.getByText(PESAN_TIDAK_ADA_AKSES)).toBeVisible()
  })

  test('lebar ponsel: validasi tiket tanpa gulir ke samping', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await masuk(page, MEMBER1)
    await page.goto('/validasi-tiket')
    await validasi(page, CTB005.kode)
    await expect(page.getByLabel('Hasil validasi')).toBeVisible()
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(lebih).toBeLessThanOrEqual(0)
  })
})
