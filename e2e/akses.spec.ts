import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const SANDI = 'rahasia123'
const TIDAK_ADA_AKSES = 'Anda tidak memiliki akses ke halaman ini'

test.beforeEach(async ({ request }) => {
  const res = await request.post('http://localhost:8787/api/dev/reset')
  expect(res.status()).toBe(204)
})

async function masuk(page: Page, email: string, kataSandi = SANDI) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Kata sandi').fill(kataSandi)
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Menu utama' })

const PERAN = [
  {
    email: 'hrd@cutiterbang.test',
    nama: 'Rina Wulandari',
    label: 'HRD Manajer',
    nav: ['Pengajuan Cuti', 'Riwayat Cuti', 'Sisa Cuti', 'Cari Penerbangan'],
    tidak: ['Tiket Saya', 'Profil', 'Status Booking'],
  },
  {
    email: 'penumpang@cutiterbang.test',
    nama: 'Budi Santoso',
    label: 'Calon Penumpang',
    nav: ['Cari Penerbangan', 'Tiket Saya'],
    tidak: ['Pengajuan Cuti', 'Profil', 'Multi-destinasi'],
  },
  {
    email: 'member1@cutiterbang.test',
    nama: 'Sari Dewi',
    label: 'Member Frequent Traveller',
    nav: ['Cari Penerbangan', 'Tiket Saya', 'Multi-destinasi', 'Profil', 'Validasi Tiket'],
    tidak: ['Pengajuan Cuti', 'Status Booking'],
  },
  {
    email: 'travel@cutiterbang.test',
    nama: 'Dimas Saputra',
    label: 'Manajer Travel',
    nav: ['Cari Penerbangan', 'Cari untuk Pengunjung', 'Status Booking', 'Cek Kode Booking'],
    tidak: ['Tiket Saya', 'Pengajuan Cuti'],
  },
  {
    email: 'pengunjung1@cutiterbang.test',
    nama: 'Maya Lestari',
    label: 'Pengunjung',
    nav: ['Cari Penerbangan', 'Tiket Saya'],
    tidak: ['Pengajuan Cuti', 'Profil', 'Status Booking'],
  },
]

for (const p of PERAN) {
  test(`masuk sebagai ${p.label} menampilkan menu yang sesuai`, async ({ page }) => {
    await page.goto('/masuk')
    await masuk(page, p.email)
    await expect(page.getByRole('heading', { name: new RegExp(`Halo, ${p.nama}`) })).toBeVisible()
    await expect(page.getByTestId('pengguna')).toContainText(p.nama)
    await expect(page.getByTestId('pengguna')).toContainText(p.label)
    for (const l of p.nav) await expect(nav(page).getByRole('link', { name: l, exact: true })).toBeVisible()
    for (const l of p.tidak) await expect(nav(page).getByRole('link', { name: l, exact: true })).toHaveCount(0)
  })
}

test('halaman masuk menampilkan akun demo', async ({ page }) => {
  await page.goto('/masuk')
  const demo = page.getByTestId('akun-demo')
  await expect(demo).toContainText('rahasia123')
  await expect(demo).toContainText('hrd@cutiterbang.test')
})

test('belum masuk membuka /cuti/pengajuan: diarahkan ke /masuk lalu kembali setelah masuk', async ({ page }) => {
  await page.goto('/cuti/pengajuan')
  await expect(page).toHaveURL(/\/masuk\?next=%2Fcuti%2Fpengajuan/)
  await masuk(page, 'hrd@cutiterbang.test')
  await expect(page).toHaveURL(/\/cuti\/pengajuan$/)
  await expect(page.getByRole('heading', { name: 'Pengajuan Cuti' })).toBeVisible()
  await expect(page.getByLabel('Tanggal mulai')).toBeVisible()
})

test('Calon Penumpang membuka /cuti/pengajuan: tidak punya akses', async ({ page }) => {
  await page.goto('/masuk')
  await masuk(page, 'penumpang@cutiterbang.test')
  await expect(page.getByTestId('pengguna')).toBeVisible()
  await page.goto('/cuti/pengajuan')
  await expect(page.getByText(TIDAK_ADA_AKSES)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pengajuan Cuti' })).toHaveCount(0)
})

test('Member dapat membuka /tiket-saya (CalonPenumpang)', async ({ page }) => {
  await page.goto('/masuk')
  await masuk(page, 'member1@cutiterbang.test')
  await nav(page).getByRole('link', { name: 'Tiket Saya' }).click()
  await expect(page).toHaveURL(/\/tiket-saya$/)
  await expect(page.getByRole('heading', { name: 'Tiket Saya' })).toBeVisible()
  await expect(page.getByText(TIDAK_ADA_AKSES)).toHaveCount(0)
})

test('kata sandi salah menampilkan pesan galat', async ({ page }) => {
  await page.goto('/masuk')
  await masuk(page, 'hrd@cutiterbang.test', 'salahsalah')
  await expect(page.getByText('Email atau kata sandi salah')).toBeVisible()
  await expect(page).toHaveURL(/\/masuk/)
})

test('daftar sebagai Member langsung masuk dengan menu Member', async ({ page }) => {
  await page.goto('/daftar')
  await page.getByLabel('Nama').fill('Citra Anggraini')
  await page.getByLabel('Email').fill('citra@contoh.com')
  await page.getByLabel('Kata sandi').fill('sandi12345')
  await page.getByLabel('Member Frequent Traveller').check()
  await page.getByRole('button', { name: 'Daftar', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Halo, Citra Anggraini/ })).toBeVisible()
  await expect(page.getByTestId('pengguna')).toContainText('Member Frequent Traveller')
  for (const l of ['Tiket Saya', 'Multi-destinasi', 'Profil', 'Validasi Tiket']) {
    await expect(nav(page).getByRole('link', { name: l, exact: true })).toBeVisible()
  }
})

test('daftar menampilkan galat per kolom dan galat email duplikat', async ({ page }) => {
  await page.goto('/daftar')
  await page.getByRole('button', { name: 'Daftar', exact: true }).click()
  await expect(page.getByText('Kata sandi minimal 8 karakter')).toBeVisible()
  await expect(page.getByText('Nama harus 1 sampai 100 karakter')).toBeVisible()

  await page.getByLabel('Nama').fill('Dobel')
  await page.getByLabel('Email').fill('hrd@cutiterbang.test')
  await page.getByLabel('Kata sandi').fill('sandi12345')
  await page.getByRole('button', { name: 'Daftar', exact: true }).click()
  await expect(page.getByText('Email sudah terdaftar')).toBeVisible()
})

test('keluar mengembalikan ke keadaan belum masuk', async ({ page }) => {
  await page.goto('/masuk')
  await masuk(page, 'hrd@cutiterbang.test')
  await expect(page.getByTestId('pengguna')).toBeVisible()
  await page.getByRole('button', { name: 'Keluar' }).click()
  await expect(page.getByTestId('pengguna')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Masuk' }).first()).toBeVisible()
  await page.goto('/cuti/pengajuan')
  await expect(page).toHaveURL(/\/masuk/)
})

test('Reset data mengeluarkan pengguna', async ({ page }) => {
  await page.goto('/masuk')
  await masuk(page, 'hrd@cutiterbang.test')
  await expect(page.getByTestId('pengguna')).toBeVisible()
  await page.getByRole('button', { name: 'Reset data' }).click()
  await expect(page.getByTestId('pengguna')).toHaveCount(0)
})
