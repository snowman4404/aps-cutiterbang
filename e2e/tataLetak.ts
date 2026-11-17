// Bantuan e2e tata letak (bukan berkas tes): tabel di layar ponsel.
import { expect, type Page } from '@playwright/test'

/**
 * Di bawah 640px setiap baris `.tabel` menjadi blok label-nilai: halaman dan pembungkus tabel tidak bergulir ke samping,
 * setiap sel yang tampil berada di dalam layar, dan label kolomnya (`data-label`, lewat ::before) tampil. Dipilih lewat
 * atribut `aria-label`, karena `display: block` dapat menghapus peran tabel dari pohon aksesibilitas.
 */
export async function periksaTabelPonsel(page: Page, namaTabel: string) {
  const tabel = page.locator(`table[aria-label="${namaTabel}"]`)
  await expect(tabel.locator('tbody tr').first()).toBeVisible()
  const hasil = await tabel.evaluate((el) => {
    const pembungkus = el.parentElement!
    const lebarLayar = document.documentElement.clientWidth
    const sel = [...el.querySelectorAll('tbody td')].filter((td) => getComputedStyle(td).display !== 'none')
    return {
      halamanLebih: document.documentElement.scrollWidth - lebarLayar,
      pembungkusLebih: pembungkus.scrollWidth - pembungkus.clientWidth,
      selKeluar: sel.filter((td) => td.getBoundingClientRect().right > lebarLayar).length,
      tanpaLabel: sel.filter((td) => {
        const label = td.getAttribute('data-label')
        return !label || getComputedStyle(td, '::before').content !== `"${label}"`
      }).length,
    }
  })
  expect(hasil).toEqual({ halamanLebih: 0, pembungkusLebih: 0, selKeluar: 0, tanpaLabel: 0 })
}
