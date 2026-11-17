import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'
import {
  hariIniWib,
  PESAN_JAM_AKHIR_SEBELUM_AWAL,
  PESAN_JAM_WAJIB,
  PESAN_KURSI_HABIS,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  PESAN_PILIHAN_MAKSIMAL,
  tambahHari,
} from '@cutiterbang/domain'
import { buatDataPenerbangan, DEMO, KOTA } from '../apps/api/src/db/dataPenerbangan.ts'

// US-6a (saring jam), US-6b (urutkan, bandingkan), US-6c (pesan dari perbandingan) pada hasil US-3, sebagai Member.
// Seed dihitung dari hari ini (WIB); harapan dihitung dari data yang sama.
const HARI_INI = hariIniWib()
const DATA = buatDataPenerbangan(HARI_INI)
const API = 'http://localhost:8787/api'
const SANDI = 'rahasia123'
const RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const { rutePadat } = DEMO
const TANGGAL = tambahHari(HARI_INI, rutePadat.hariKe)

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

async function cari(page: Page, asal: string, tujuan: string, tanggal: string) {
  await page.goto('/penerbangan')
  await expect(page.getByLabel('Kota asal').locator('option')).toHaveCount(KOTA.length + 1)
  await page.getByLabel('Kota asal').selectOption({ label: asal })
  await page.getByLabel('Kota tujuan').selectOption({ label: tujuan })
  await page.getByLabel('Tanggal keberangkatan').fill(tanggal)
  await page.getByRole('button', { name: 'Cari', exact: true }).click()
}

/** Member masuk lalu mencari rute padat (5 penerbangan, urut waktu berangkat). */
async function mulaiSebagaiMember(page: Page) {
  await masuk(page, 'member1@cutiterbang.test')
  await cari(page, rutePadat.asal, rutePadat.tujuan, TANGGAL)
  await expect(baris(page)).toHaveCount(PADAT.length)
}

const baris = (page: Page) => page.getByRole('list', { name: 'Hasil pencarian penerbangan' }).getByTestId('penerbangan')
const nomorDiHasil = (page: Page) => baris(page).getByText(/^[A-Z]{2}\d{3}$/).allTextContents()
const bandingkan = (page: Page, nomor: string) => page.getByRole('button', { name: `Bandingkan ${nomor}` })
const lihat = (page: Page) => page.getByRole('button', { name: 'Lihat perbandingan' })
const banding = (page: Page) => page.getByTestId('tampilan-perbandingan').getByTestId('banding')

/** Penerbangan seed rute padat, urut waktu berangkat (urutan hasil pencarian). */
const PADAT = DATA.penerbangan
  .filter((p) => p.asal === rutePadat.asal && p.tujuan === rutePadat.tujuan && p.tanggalKeberangkatan === TANGGAL)
  .sort((a, b) => a.waktuBerangkat.localeCompare(b.waktuBerangkat))
const nomor = (daftar: typeof PADAT) => daftar.map((f) => f.nomorPenerbangan)

test.describe('Alat hasil pencarian hanya untuk Member', () => {
  test('belum login dan penumpang biasa melihat hasil US-3 apa adanya, tanpa filter jam, urutan harga, atau Bandingkan', async ({ page }) => {
    for (const email of [null, 'penumpang@cutiterbang.test']) {
      if (email) await masuk(page, email)
      await cari(page, rutePadat.asal, rutePadat.tujuan, TANGGAL)
      await expect(baris(page)).toHaveCount(PADAT.length)
      await expect(page.getByRole('link', { name: `Pesan ${PADAT[0]!.nomorPenerbangan}` })).toBeVisible()
      await expect(page.getByLabel('Jam awal')).toHaveCount(0)
      await expect(page.getByLabel('Urutkan')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /^Bandingkan/ })).toHaveCount(0)
      await expect(lihat(page)).toHaveCount(0)
    }
  })

  test('Member melihat alat-alat itu', async ({ page }) => {
    await mulaiSebagaiMember(page)
    await expect(page.getByLabel('Jam awal')).toBeVisible()
    await expect(page.getByLabel('Urutkan')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Bandingkan/ })).toHaveCount(PADAT.length)
    await expect(page.getByRole('link', { name: `Pesan ${PADAT[0]!.nomorPenerbangan}` })).toBeVisible()
  })
})

test.describe('US-6a Menyaring berdasarkan jam keberangkatan', () => {
  const terapkan = async (page: Page, awal: string, akhir: string) => {
    await page.getByLabel('Jam awal').fill(awal)
    await page.getByLabel('Jam akhir').fill(akhir)
    await page.getByRole('button', { name: 'Terapkan' }).click()
  }

  test('rentang menyertakan kedua batas; Hapus filter menampilkan semua hasil lagi (4c)', async ({ page }) => {
    await mulaiSebagaiMember(page)
    const [, f2, f3, f4] = PADAT
    await terapkan(page, f2!.waktuBerangkat, f4!.waktuBerangkat) // 08:30 sampai 14:00
    await expect(baris(page)).toHaveCount(3)
    expect(await nomorDiHasil(page)).toEqual(nomor([f2!, f3!, f4!]))

    await terapkan(page, f3!.waktuBerangkat, f3!.waktuBerangkat) // satu jam persis
    expect(await nomorDiHasil(page)).toEqual(nomor([f3!]))

    await page.getByRole('button', { name: 'Hapus filter' }).click()
    await expect(baris(page)).toHaveCount(PADAT.length)
    await expect(page.getByLabel('Jam awal')).toHaveValue('')
    await expect(page.getByRole('button', { name: 'Hapus filter' })).toHaveCount(0)
  })

  test('3a: salah satu atau kedua jam kosong ditolak; 3b: jam akhir lebih awal ditolak; hasil tetap', async ({ page }) => {
    await mulaiSebagaiMember(page)
    await page.getByRole('button', { name: 'Terapkan' }).click()
    await expect(page.getByText(PESAN_JAM_WAJIB)).toHaveCount(2)
    await page.getByLabel('Jam awal').fill('06:00')
    await page.getByRole('button', { name: 'Terapkan' }).click()
    await expect(page.getByText(PESAN_JAM_WAJIB)).toHaveCount(1)

    await terapkan(page, '12:00', '11:00')
    await expect(page.getByText(PESAN_JAM_AKHIR_SEBELUM_AWAL)).toBeVisible()
    await expect(page.getByText(PESAN_JAM_WAJIB)).toHaveCount(0)
    await expect(baris(page)).toHaveCount(PADAT.length)
  })

  test('filter melepas pilihan perbandingan yang disembunyikannya; hitungan hanya yang terlihat', async ({ page }) => {
    await mulaiSebagaiMember(page)
    const [f1, f2, , , f5] = PADAT
    for (const f of [f1!, f2!, f5!]) await bandingkan(page, f.nomorPenerbangan).click()
    await expect(page.getByTestId('jumlah-pilihan')).toHaveText('3 dari 3 dipilih')

    await terapkan(page, f2!.waktuBerangkat, '23:59') // menyembunyikan f1 saja
    await expect(baris(page)).toHaveCount(PADAT.length - 1)
    await expect(page.getByTestId('jumlah-pilihan')).toHaveText('2 dari 3 dipilih')

    await page.getByRole('button', { name: 'Hapus filter' }).click()
    await expect(bandingkan(page, f1!.nomorPenerbangan)).toHaveAttribute('aria-pressed', 'false')
    await expect(bandingkan(page, f2!.nomorPenerbangan)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('jumlah-pilihan')).toHaveText('2 dari 3 dipilih')
  })

  test('4a: tidak ada penerbangan dalam rentang: "Penerbangan tidak ditemukan"', async ({ page }) => {
    await mulaiSebagaiMember(page)
    await terapkan(page, '00:00', '05:59')
    await expect(page.getByText(PESAN_PENERBANGAN_TIDAK_DITEMUKAN)).toBeVisible()
    await expect(baris(page)).toHaveCount(0)
  })

  test('4b: mengubah filter tidak mengulang pencarian', async ({ page }) => {
    const permintaan: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/penerbangan/cari')) permintaan.push(r.url())
    })
    await mulaiSebagaiMember(page)
    expect(permintaan).toHaveLength(1)
    await terapkan(page, '06:00', '12:00')
    await terapkan(page, '11:00', '18:00')
    await page.getByRole('button', { name: 'Hapus filter' }).click()
    await expect(baris(page)).toHaveCount(PADAT.length)
    expect(permintaan).toHaveLength(1)
  })
})

test.describe('US-6b Membandingkan harga', () => {
  test('urutkan: harga termurah, termahal, kembali ke waktu berangkat', async ({ page }) => {
    await mulaiSebagaiMember(page)
    const termurah = [...PADAT].sort((a, b) => a.harga - b.harga)
    expect(new Set(PADAT.map((f) => f.harga)).size).toBe(PADAT.length) // harga berbeda: urutan pasti
    await page.getByLabel('Urutkan').selectOption({ label: 'Harga termurah' })
    expect(await nomorDiHasil(page)).toEqual(nomor(termurah))
    await page.getByLabel('Urutkan').selectOption({ label: 'Harga termahal' })
    expect(await nomorDiHasil(page)).toEqual(nomor([...termurah].reverse()))
    await page.getByLabel('Urutkan').selectOption({ label: 'Waktu berangkat' })
    expect(await nomorDiHasil(page)).toEqual(nomor(PADAT))
  })

  test('3a: pilihan keempat ditolak dengan pesan spek; 4a: perbandingan ditahan sampai 2 atau 3 dipilih', async ({ page }) => {
    await mulaiSebagaiMember(page)
    await expect(lihat(page)).toBeDisabled()
    await bandingkan(page, PADAT[0]!.nomorPenerbangan).click()
    await expect(lihat(page)).toBeDisabled()
    await bandingkan(page, PADAT[1]!.nomorPenerbangan).click()
    await expect(lihat(page)).toBeEnabled()
    await bandingkan(page, PADAT[2]!.nomorPenerbangan).click()
    await expect(lihat(page)).toBeEnabled()
    await expect(page.getByTestId('jumlah-pilihan')).toHaveText('3 dari 3 dipilih')

    await bandingkan(page, PADAT[3]!.nomorPenerbangan).click()
    await expect(page.getByRole('alert').filter({ hasText: PESAN_PILIHAN_MAKSIMAL })).toBeVisible()
    expect(PESAN_PILIHAN_MAKSIMAL).toBe('Maksimal 3 penerbangan dapat dibandingkan')
    await expect(bandingkan(page, PADAT[3]!.nomorPenerbangan)).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByTestId('jumlah-pilihan')).toHaveText('3 dari 3 dipilih')

    // Membatalkan satu pilihan memberi tempat lagi dan menghapus pesan.
    await bandingkan(page, PADAT[0]!.nomorPenerbangan).click()
    await expect(page.getByRole('alert').filter({ hasText: PESAN_PILIHAN_MAKSIMAL })).toHaveCount(0)
    await bandingkan(page, PADAT[3]!.nomorPenerbangan).click()
    await expect(bandingkan(page, PADAT[3]!.nomorPenerbangan)).toHaveAttribute('aria-pressed', 'true')
    await bandingkan(page, PADAT[1]!.nomorPenerbangan).click()
    await bandingkan(page, PADAT[2]!.nomorPenerbangan).click()
    await expect(lihat(page)).toBeDisabled() // tinggal 1
  })

  test('tampilan perbandingan: berdampingan, harga sama dengan hasil, "Termurah" pada yang paling murah', async ({ page }) => {
    await mulaiSebagaiMember(page)
    const pilihan = [PADAT[0]!, PADAT[2]!, PADAT[4]!]
    for (const f of pilihan) await bandingkan(page, f.nomorPenerbangan).click()
    const hargaDiHasil = await Promise.all(
      pilihan.map((f) => baris(page).filter({ hasText: f.nomorPenerbangan }).getByTestId('harga').textContent()),
    )
    await lihat(page).click()

    await expect(banding(page)).toHaveCount(3)
    for (const [i, f] of pilihan.entries()) {
      await expect(banding(page).nth(i)).toContainText(f.nomorPenerbangan)
      await expect(banding(page).nth(i).getByTestId('harga')).toHaveText(hargaDiHasil[i]!)
      await expect(banding(page).nth(i).getByTestId('harga')).toHaveText(RUPIAH.format(f.harga))
      await expect(banding(page).nth(i).getByRole('button', { name: `Pesan ${f.nomorPenerbangan}` })).toBeVisible()
    }
    const harga = pilihan.map((f) => f.harga)
    const terendah = harga.indexOf(Math.min(...harga))
    await expect(page.getByText('Termurah', { exact: true })).toHaveCount(1)
    await expect(banding(page).nth(terendah).getByText('Termurah', { exact: true })).toBeVisible()

    // Kembali ke hasil: pilihan tetap.
    await page.getByRole('button', { name: 'Kembali ke hasil' }).click()
    await expect(baris(page)).toHaveCount(PADAT.length)
    for (const f of pilihan) await expect(bandingkan(page, f.nomorPenerbangan)).toHaveAttribute('aria-pressed', 'true')
  })

  test('dua penerbangan terpilih: dua kolom berdampingan; memuat ulang halaman memulihkan perbandingan dari URL', async ({ page }) => {
    await mulaiSebagaiMember(page)
    await bandingkan(page, PADAT[1]!.nomorPenerbangan).click()
    await bandingkan(page, PADAT[3]!.nomorPenerbangan).click()
    await lihat(page).click()
    await expect(page).toHaveURL(/bandingkan=/)
    await expect(page).toHaveURL(/lihat=1/)
    await expect(banding(page)).toHaveCount(2)
    const kotak = await Promise.all([0, 1].map((i) => banding(page).nth(i).boundingBox()))
    expect(Math.abs(kotak[0]!.y - kotak[1]!.y)).toBeLessThan(2) // sebaris

    await page.reload()
    await expect(banding(page)).toHaveCount(2)
    await expect(banding(page).nth(0)).toContainText(PADAT[1]!.nomorPenerbangan)
    await expect(banding(page).nth(1)).toContainText(PADAT[3]!.nomorPenerbangan)
  })
})

test.describe('US-6c Memesan dari tampilan perbandingan', () => {
  async function bukaPerbandingan(page: Page, daftar: typeof PADAT) {
    for (const f of daftar) await bandingkan(page, f.nomorPenerbangan).click()
    await lihat(page).click()
    await expect(banding(page)).toHaveCount(daftar.length)
  }

  test('Pesan membuka halaman pemesanan penerbangan itu; kembali memulihkan perbandingan yang sama (4a)', async ({ page }) => {
    await mulaiSebagaiMember(page)
    const pilihan = [PADAT[1]!, PADAT[2]!, PADAT[3]!]
    await bukaPerbandingan(page, pilihan)
    const urlPerbandingan = page.url()

    await banding(page).nth(1).getByRole('button', { name: `Pesan ${pilihan[1]!.nomorPenerbangan}` }).click()
    await expect(page).toHaveURL(/\/pesan\/\d+$/)
    await expect(page.getByRole('heading', { name: 'Pesan Tiket' })).toBeVisible()
    await expect(page.getByText(pilihan[1]!.nomorPenerbangan)).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(urlPerbandingan)
    await expect(banding(page)).toHaveCount(3)
    for (const [i, f] of pilihan.entries()) await expect(banding(page).nth(i)).toContainText(f.nomorPenerbangan)
  })

  test('4a: "Kembali ke perbandingan" di halaman pemesanan memulihkan perbandingan yang sama', async ({ page }) => {
    await mulaiSebagaiMember(page)
    const pilihan = [PADAT[0]!, PADAT[4]!]
    await bukaPerbandingan(page, pilihan)
    const urlPerbandingan = page.url()

    await banding(page).nth(0).getByRole('button', { name: `Pesan ${pilihan[0]!.nomorPenerbangan}` }).click()
    await expect(page.getByRole('heading', { name: 'Pesan Tiket' })).toBeVisible()
    await page.getByRole('link', { name: 'Kembali ke perbandingan' }).click()
    await expect(page).toHaveURL(urlPerbandingan)
    await expect(banding(page)).toHaveCount(2)
    for (const [i, f] of pilihan.entries()) await expect(banding(page).nth(i)).toContainText(f.nomorPenerbangan)
  })

  test('tanpa perbandingan: halaman pemesanan tidak menampilkan "Kembali ke perbandingan"', async ({ page }) => {
    await mulaiSebagaiMember(page)
    await baris(page).first().getByRole('link', { name: /^Pesan / }).click()
    await expect(page.getByRole('heading', { name: 'Pesan Tiket' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Kembali ke perbandingan' })).toHaveCount(0)
  })

  test('2a: kursi habis setelah perbandingan dibuka: "Kursi sudah habis", halaman pemesanan tetap tertutup', async ({ page, request }) => {
    const { habis, kursiTerakhir } = DEMO
    // CTB004 (member2) memegang satu-satunya kursi SJ901; dibatalkan supaya SJ901 muncul di hasil bersama BW902.
    const masukApi = await request.post(`${API}/auth/masuk`, { data: { email: 'member2@cutiterbang.test', kataSandi: SANDI } })
    expect(masukApi.status()).toBe(200)
    expect((await request.post(`${API}/pemesanan/CTB004/batalkan`)).status()).toBe(200)

    await masuk(page, 'member1@cutiterbang.test')
    await cari(page, habis.asal, habis.tujuan, tambahHari(HARI_INI, habis.hariKe))
    await expect(baris(page)).toHaveCount(2)
    await bukaPerbandingan(page, [{ nomorPenerbangan: habis.nomorPenerbangan }, { nomorPenerbangan: kursiTerakhir.nomorPenerbangan }] as typeof PADAT)
    await expect(banding(page).first().getByText('Termurah', { exact: true })).toBeVisible() // SJ901 650.000 < BW902 700.000
    const urlPerbandingan = page.url()

    // Orang lain memesan kursi terakhir BW902 setelah perbandingan terbuka.
    const id = await idPenerbangan(request, kursiTerakhir.asal, kursiTerakhir.tujuan, kursiTerakhir.hariKe, kursiTerakhir.nomorPenerbangan)
    const lain = await request.post(`${API}/pemesanan`, {
      data: {
        idPenerbangan: id,
        dataPenumpang: {
          namaLengkap: 'Andi Pratama',
          email: 'andi@contoh.com',
          nomorIdentitas: '3174010101900001',
          tanggalLahir: '1990-01-01',
          nomorTelepon: '081234567890',
        },
      },
    })
    expect(lain.status()).toBe(201)

    await page.getByRole('button', { name: `Pesan ${kursiTerakhir.nomorPenerbangan}` }).click()
    await expect(page.getByRole('alert').filter({ hasText: PESAN_KURSI_HABIS })).toBeVisible()
    await expect(page).toHaveURL(urlPerbandingan) // tidak pindah halaman
    await expect(banding(page)).toHaveCount(2) // perbandingan tetap

    // Penerbangan yang masih tersedia tetap bisa dipesan dari perbandingan yang sama.
    await page.getByRole('button', { name: `Pesan ${habis.nomorPenerbangan}` }).click()
    await expect(page).toHaveURL(/\/pesan\/\d+$/)
  })

  test('lebar ponsel 375px: alat, daftar, dan perbandingan tanpa gulir horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await mulaiSebagaiMember(page)
    const tidakMeluap = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    expect(await tidakMeluap()).toBe(true)
    await bukaPerbandingan(page, [PADAT[0]!, PADAT[1]!, PADAT[2]!])
    expect(await tidakMeluap()).toBe(true)
    // Susunan menumpuk pada ponsel.
    const kotak = await Promise.all([0, 1].map((i) => banding(page).nth(i).boundingBox()))
    expect(kotak[1]!.y).toBeGreaterThan(kotak[0]!.y + kotak[0]!.height - 1)
  })
})

/** Id penerbangan lewat API pencarian. */
async function idPenerbangan(request: APIRequestContext, asal: string, tujuan: string, hariKe: number, nomorPenerbangan: string) {
  const { kota } = (await (await request.get(`${API}/penerbangan/kota`)).json()) as { kota: { id: number; nama: string }[] }
  const id = (nama: string) => kota.find((k) => k.nama === nama)!.id
  const res = await request.get(`${API}/penerbangan/cari?asal=${id(asal)}&tujuan=${id(tujuan)}&tanggal=${tambahHari(HARI_INI, hariKe)}`)
  const { penerbangan } = (await res.json()) as { penerbangan: { id: number; nomorPenerbangan: string }[] }
  return penerbangan.find((f) => f.nomorPenerbangan === nomorPenerbangan)!.id
}
