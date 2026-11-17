import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'
import {
  hariIniWib,
  PESAN_KURSI_HABIS,
  PESAN_TIDAK_ADA_AKSES,
  singkatanZona,
  tambahHari,
} from '@cutiterbang/domain'
import { buatDataPemesanan } from '../apps/api/src/db/dataPemesanan.ts'
import { buatDataPenerbangan, DEMO, KOTA } from '../apps/api/src/db/dataPenerbangan.ts'

// Seed dihitung dari hari ini (WIB); harapan dihitung dari data yang sama.
const HARI_INI = hariIniWib()
const DATA = buatDataPenerbangan(HARI_INI)
const PEMESANAN = buatDataPemesanan(HARI_INI)
const API = 'http://localhost:8787/api'
const SANDI = 'rahasia123'
const RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const zona = (nama: string) => singkatanZona(KOTA.find((k) => k.nama === nama)!.zonaWaktu)
const penumpangBaru = {
  nomorIdentitas: '3174010101900001',
  tanggalLahir: '1990-01-01',
  nomorTelepon: '081234567890',
}

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

async function isiDataPenumpang(page: Page, nama?: string) {
  if (nama !== undefined) await page.getByLabel('Nama lengkap').fill(nama)
  await page.getByLabel('Nomor identitas').fill(penumpangBaru.nomorIdentitas)
  await page.getByLabel('Tanggal lahir').fill(penumpangBaru.tanggalLahir)
  await page.getByLabel('Nomor telepon').fill(penumpangBaru.nomorTelepon)
}

async function isiDanCari(page: Page, asal: string, tujuan: string, tanggal: string) {
  await page.goto('/penerbangan')
  await expect(page.getByLabel('Kota asal').locator('option')).toHaveCount(KOTA.length + 1)
  await page.getByLabel('Kota asal').selectOption({ label: asal })
  await page.getByLabel('Kota tujuan').selectOption({ label: tujuan })
  await page.getByLabel('Tanggal keberangkatan').fill(tanggal)
  await page.getByRole('button', { name: 'Cari', exact: true }).click()
}

const sisaKursiDiHasil = (page: Page, nomor: string) =>
  page.getByTestId('penerbangan').filter({ hasText: nomor }).getByTestId('sisa-kursi')

/** Penerbangan seed pada rute dan hari ke-N: yang paling awal berangkat. */
const penerbanganSeed = (asal: string, tujuan: string, hariKe: number) =>
  DATA.penerbangan
    .filter((p) => p.asal === asal && p.tujuan === tujuan && p.tanggalKeberangkatan === tambahHari(HARI_INI, hariKe))
    .sort((a, b) => a.waktuBerangkat.localeCompare(b.waktuBerangkat))[0]!

/** Id penerbangan lewat API (id basis data tidak ada di data seed). */
async function idPenerbangan(request: APIRequestContext, asal: string, tujuan: string, hariKe: number, nomor: string) {
  const { kota } = (await (await request.get(`${API}/penerbangan/kota`)).json()) as { kota: { id: number; nama: string }[] }
  const id = (nama: string) => kota.find((k) => k.nama === nama)!.id
  const res = await request.get(
    `${API}/penerbangan/cari?asal=${id(asal)}&tujuan=${id(tujuan)}&tanggal=${tambahHari(HARI_INI, hariKe)}`,
  )
  const { penerbangan } = (await res.json()) as { penerbangan: { id: number; nomorPenerbangan: string }[] }
  return penerbangan.find((f) => f.nomorPenerbangan === nomor)!.id
}

async function masukApi(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/masuk`, { data: { email, kataSandi: SANDI } })
  expect(res.status()).toBe(200)
}

const kartu = (page: Page, kode: string) => page.getByTestId('tiket').filter({ has: page.getByTestId('kode').filter({ hasText: kode }) })

test.describe('US-2a Memesan tiket', () => {
  test('belum login: Pesan -> login -> formulir -> ringkasan -> konfirmasi -> Tiket Saya; sisa kursi berkurang 1', async ({ page }) => {
    const { asal, tujuan, hariKe } = DEMO.rutePadat
    const f = penerbanganSeed(asal, tujuan, hariKe)
    const tanggal = tambahHari(HARI_INI, hariKe)
    await isiDanCari(page, asal, tujuan, tanggal)
    await expect(sisaKursiDiHasil(page, f.nomorPenerbangan)).toHaveText(`Sisa ${f.jumlahKursi} kursi`)

    // 2a: belum login -> diminta login, lalu kembali ke halaman pemesanan.
    await page.getByRole('link', { name: `Pesan ${f.nomorPenerbangan}` }).click()
    await expect(page).toHaveURL(/\/masuk\?next=%2Fpesan%2F\d+/)
    await page.getByLabel('Email').fill('penumpang@cutiterbang.test')
    await page.getByLabel('Kata sandi').fill(SANDI)
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()
    await expect(page).toHaveURL(/\/pesan\/\d+$/)
    await expect(page.getByRole('heading', { name: 'Pesan Tiket' })).toBeVisible()

    // 3-4: data penumpang; nama dan email terisi dari akun.
    await expect(page.getByLabel('Nama lengkap')).toHaveValue('Budi Santoso')
    await expect(page.getByLabel('Email')).toHaveValue('penumpang@cutiterbang.test')
    await isiDataPenumpang(page)
    await page.getByRole('button', { name: 'Lanjut' }).click()

    // 5: ringkasan.
    await expect(page.getByRole('heading', { name: 'Ringkasan pemesanan' })).toBeVisible()
    await expect(page.getByTestId('ringkasan-namaLengkap')).toHaveText('Budi Santoso')
    await expect(page.getByTestId('ringkasan-nomorIdentitas')).toHaveText(penumpangBaru.nomorIdentitas)
    await expect(page.getByText(f.nomorPenerbangan)).toBeVisible()
    await expect(page.getByTestId('berangkat')).toHaveText(`${f.waktuBerangkat} ${zona(asal)}`)
    await expect(page.getByTestId('tiba')).toHaveText(`${f.waktuTiba} ${zona(tujuan)}`)
    await expect(page.getByTestId('harga')).toHaveText(RUPIAH.format(f.harga))

    // 6-10: konfirmasi -> Tiket Saya dengan pemesanan baru disorot.
    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    await expect(page).toHaveURL(/\/tiket-saya\?baru=[A-Z2-9]{6}$/)
    const baru = page.locator('[data-testid="tiket"][data-baru="true"]')
    await expect(baru).toHaveCount(1)
    await expect(baru.getByTestId('status')).toHaveText('Waiting for the payment')
    await expect(baru.getByTestId('kode')).toHaveText(/^[A-Z2-9]{6}$/)
    await expect(baru.getByTestId('penumpang')).toHaveText('Budi Santoso')
    await expect(baru).toContainText(f.nomorPenerbangan)
    await expect(baru.getByTestId('berangkat')).toHaveText(`${f.waktuBerangkat} ${zona(asal)}`)
    await expect(baru.getByTestId('tiba')).toHaveText(`${f.waktuTiba} ${zona(tujuan)}`)
    await expect(baru.getByTestId('harga')).toHaveText(RUPIAH.format(f.harga))
    await expect(page.getByTestId('tiket')).toHaveCount(3) // dua pemesanan seed + yang baru

    // Sisa kursi di pencarian berkurang 1.
    await isiDanCari(page, asal, tujuan, tanggal)
    await expect(sisaKursiDiHasil(page, f.nomorPenerbangan)).toHaveText(`Sisa ${f.jumlahKursi - 1} kursi`)
  })

  test('7a: data tidak lengkap atau salah format: kolom ditandai, tidak ada pemesanan dibuat', async ({ page, request }) => {
    const { asal, tujuan, hariKe } = DEMO.rutePadat
    const f = penerbanganSeed(asal, tujuan, hariKe)
    const id = await idPenerbangan(request, asal, tujuan, hariKe, f.nomorPenerbangan)
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto(`/pesan/${id}`)
    await page.getByLabel('Nama lengkap').fill('')
    await page.getByLabel('Nomor identitas').fill('123')
    await page.getByLabel('Nomor telepon').fill('12345')
    await page.getByLabel('Email').fill('bukan-email')
    await page.getByRole('button', { name: 'Lanjut' }).click()

    for (const pesan of [
      'Nama lengkap wajib diisi',
      'Nomor identitas harus 16 digit',
      'Tanggal lahir wajib diisi',
      'Nomor telepon harus 10 sampai 13 digit',
      'Email harus berbentuk nama@domain',
    ]) {
      await expect(page.getByText(pesan)).toBeVisible()
    }
    await expect(page.getByLabel('Nomor identitas')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('heading', { name: 'Ringkasan pemesanan' })).toHaveCount(0)

    await page.goto('/tiket-saya')
    await expect(page.getByTestId('tiket')).toHaveCount(2) // hanya pemesanan seed
    await isiDanCari(page, asal, tujuan, tambahHari(HARI_INI, hariKe))
    await expect(sisaKursiDiHasil(page, f.nomorPenerbangan)).toHaveText(`Sisa ${f.jumlahKursi} kursi`)
  })

  test('7b: kursi terakhir diambil orang lain sebelum konfirmasi: "Kursi sudah habis", Tiket Saya tidak berubah', async ({
    page,
    request,
  }) => {
    const d = DEMO.kursiTerakhir
    const id = await idPenerbangan(request, d.asal, d.tujuan, d.hariKe, d.nomorPenerbangan)
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto(`/pesan/${id}`)
    await isiDataPenumpang(page)
    await page.getByRole('button', { name: 'Lanjut' }).click()
    await expect(page.getByRole('heading', { name: 'Ringkasan pemesanan' })).toBeVisible()

    // Orang lain memesan kursi terakhir lewat API.
    await masukApi(request, 'member2@cutiterbang.test')
    const lain = await request.post(`${API}/pemesanan`, {
      data: {
        idPenerbangan: id,
        dataPenumpang: { namaLengkap: 'Andi Pratama', email: 'andi@contoh.com', ...penumpangBaru },
      },
    })
    expect(lain.status()).toBe(201)

    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    await expect(page.getByRole('alert').filter({ hasText: PESAN_KURSI_HABIS })).toBeVisible()
    await expect(page).toHaveURL(/\/pesan\/\d+$/)
    await expect(page.getByRole('button', { name: 'Konfirmasi pemesanan' })).toHaveCount(0)

    await page.goto('/tiket-saya')
    await expect(page.getByTestId('tiket')).toHaveCount(2)
  })

  test('penerbangan yang sudah habis dari awal: halaman menampilkan "Kursi sudah habis" tanpa formulir', async ({ page, request }) => {
    const d = DEMO.habis
    // Tidak muncul di pencarian; id diambil dari API lewat penerbangan kembar yang masih ada.
    const idKursiTerakhir = await idPenerbangan(request, d.asal, d.tujuan, d.hariKe, DEMO.kursiTerakhir.nomorPenerbangan)
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto(`/pesan/${idKursiTerakhir - 1}`) // SJ901 dibuat tepat sebelum BW902 pada seed
    await expect(page.getByText(d.nomorPenerbangan)).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: PESAN_KURSI_HABIS })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Lanjut' })).toHaveCount(0)
  })

  test('penerbangan tidak dikenal: pesan galat, tanpa formulir', async ({ page }) => {
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto('/pesan/999999')
    await expect(page.getByRole('alert').filter({ hasText: 'Penerbangan tidak ditemukan' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Lanjut' })).toHaveCount(0)
  })

  test('peran selain CalonPenumpang (HRD): pesan tanpa akses', async ({ page }) => {
    await masuk(page, 'hrd@cutiterbang.test')
    await page.goto('/pesan/1')
    await expect(page.getByText(PESAN_TIDAK_ADA_AKSES)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Lanjut' })).toHaveCount(0)
  })

  test('Member Frequent Traveller dapat memesan', async ({ page, request }) => {
    const { asal, tujuan, hariKe } = DEMO.rutePadat
    const f = penerbanganSeed(asal, tujuan, hariKe)
    const id = await idPenerbangan(request, asal, tujuan, hariKe, f.nomorPenerbangan)
    await masuk(page, 'member1@cutiterbang.test')
    await page.goto(`/pesan/${id}`)
    await expect(page.getByLabel('Nama lengkap')).toHaveValue('Sari Dewi')
    await isiDataPenumpang(page)
    await page.getByRole('button', { name: 'Lanjut' }).click()
    await page.getByRole('button', { name: 'Konfirmasi pemesanan' }).click()
    await expect(page).toHaveURL(/\/tiket-saya\?baru=/)
    await expect(page.locator('[data-testid="tiket"][data-baru="true"]').getByTestId('status')).toHaveText('Waiting for the payment')
    await expect(page.getByTestId('tiket')).toHaveCount(2) // CTB003 seed + yang baru
  })
})

test.describe('US-2b Membatalkan pemesanan', () => {
  const ctb001 = PEMESANAN.find((p) => p.kode === 'CTB001')!
  const penerbanganCtb001 = DATA.penerbangan.find(
    (p) => p.nomorPenerbangan === ctb001.nomorPenerbangan && p.tanggalKeberangkatan === ctb001.tanggalKeberangkatan,
  )!

  test('Tiket Saya: aksi batal hanya pada pemesanan yang dapat dibatalkan', async ({ page }) => {
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto('/tiket-saya')
    await expect(page.getByTestId('tiket')).toHaveCount(2)
    await expect(page.getByTestId('tiket').first()).toHaveAttribute('data-kode', 'CTB001') // terbaru dulu
    await expect(kartu(page, 'CTB001').getByTestId('status')).toHaveText('Waiting for the payment')
    await expect(kartu(page, 'CTB001').getByRole('button', { name: /Batalkan/ })).toBeVisible()
    await expect(kartu(page, 'CTB002').getByTestId('status')).toHaveText('Cancelled')
    await expect(kartu(page, 'CTB002').getByRole('button', { name: /Batalkan/ })).toHaveCount(0)
  })

  test('4a: menolak konfirmasi menjaga status; menyetujui mengubah ke Cancelled dan kursi kembali', async ({ page }) => {
    const { asal, tujuan } = { asal: penerbanganCtb001.asal, tujuan: penerbanganCtb001.tujuan }
    await masuk(page, 'penumpang@cutiterbang.test')
    await isiDanCari(page, asal, tujuan, ctb001.tanggalKeberangkatan)
    await expect(sisaKursiDiHasil(page, ctb001.nomorPenerbangan)).toHaveText(`Sisa ${penerbanganCtb001.jumlahKursi - 1} kursi`)

    await page.goto('/tiket-saya')
    const k = kartu(page, 'CTB001')
    await k.getByRole('button', { name: /Batalkan/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Batalkan pemesanan CTB001?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Tidak' }).click()
    await expect(dialog).toBeHidden()
    await expect(k.getByTestId('status')).toHaveText('Waiting for the payment')
    await expect(k.getByRole('button', { name: /Batalkan/ })).toBeVisible()

    await k.getByRole('button', { name: /Batalkan/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Ya, batalkan' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(k.getByTestId('status')).toHaveText('Cancelled')
    await expect(k.getByRole('button', { name: /Batalkan/ })).toHaveCount(0)
    await expect(page.getByText('Pemesanan CTB001 dibatalkan')).toBeVisible()

    // Tetap Cancelled setelah dimuat ulang, dan kursi kembali di pencarian.
    await page.reload()
    await expect(kartu(page, 'CTB001').getByTestId('status')).toHaveText('Cancelled')
    await isiDanCari(page, asal, tujuan, ctb001.tanggalKeberangkatan)
    await expect(sisaKursiDiHasil(page, ctb001.nomorPenerbangan)).toHaveText(`Sisa ${penerbanganCtb001.jumlahKursi} kursi`)
  })

  test('Esc menutup dialog tanpa membatalkan', async ({ page }) => {
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto('/tiket-saya')
    await kartu(page, 'CTB001').getByRole('button', { name: /Batalkan/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(kartu(page, 'CTB001').getByTestId('status')).toHaveText('Waiting for the payment')
  })

  test('akun tanpa pemesanan: keadaan kosong', async ({ page }) => {
    await page.goto('/daftar')
    await page.getByLabel('Nama').fill('Citra')
    await page.getByLabel('Email').fill('citra@contoh.com')
    await page.getByLabel('Kata sandi').fill('sandi12345')
    await page.getByLabel('Calon Penumpang').check()
    await page.getByRole('button', { name: 'Daftar', exact: true }).click()
    await expect(page).not.toHaveURL(/\/daftar/)
    await page.goto('/tiket-saya')
    await expect(page.getByText('Belum ada pemesanan')).toBeVisible()
  })

  test('lebar ponsel: Tiket Saya tanpa gulir ke samping dan dialog muat di layar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await masuk(page, 'penumpang@cutiterbang.test')
    await page.goto('/tiket-saya')
    await expect(page.getByTestId('tiket')).toHaveCount(2)
    const lebih = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(lebih).toBeLessThanOrEqual(0)
    await kartu(page, 'CTB001').getByRole('button', { name: /Batalkan/ }).click()
    const kotak = await page.getByRole('dialog').boundingBox()
    expect(kotak!.x).toBeGreaterThanOrEqual(0)
    expect(kotak!.x + kotak!.width).toBeLessThanOrEqual(375)
    await expect(page.getByRole('button', { name: 'Ya, batalkan' })).toBeVisible()
  })
})
