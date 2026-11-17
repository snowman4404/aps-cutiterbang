import { useSyncExternalStore } from 'react'
import { Button } from './Button.tsx'
import { Ikon, type NamaIkon } from './Ikon.tsx'

const KUNCI = 'cutiterbang-tema'

/** Pilihan pengguna: ikut perangkat (bawaan), atau paksa terang / gelap. */
export type PilihanTema = 'perangkat' | 'terang' | 'gelap'

// Urutan putar tombol: Perangkat -> Terang -> Gelap -> Perangkat.
const URUTAN: readonly PilihanTema[] = ['perangkat', 'terang', 'gelap']
const LABEL: Record<PilihanTema, string> = { perangkat: 'Perangkat', terang: 'Terang', gelap: 'Gelap' }
const IKON: Record<PilihanTema, NamaIkon> = { perangkat: 'layar', terang: 'matahari', gelap: 'bulan' }

// Sumber kebenaran = atribut data-theme di <html>; skrip di index.html menerapkannya dari localStorage sebelum cat pertama.
function pilihanSaatIni(): PilihanTema {
  const atribut = document.documentElement.dataset.theme
  if (atribut === 'dark') return 'gelap'
  if (atribut === 'light') return 'terang'
  return 'perangkat'
}

function langganan(beriTahu: () => void) {
  const pengamat = new MutationObserver(beriTahu)
  pengamat.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => pengamat.disconnect()
}

/** Pilihan tema yang sedang aktif. */
export function usePilihanTema(): PilihanTema {
  return useSyncExternalStore(langganan, pilihanSaatIni, () => 'perangkat')
}

function terapkan(pilihan: PilihanTema) {
  if (pilihan === 'perangkat') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', pilihan === 'gelap' ? 'dark' : 'light')
  try {
    if (pilihan === 'perangkat') localStorage.removeItem(KUNCI)
    else localStorage.setItem(KUNCI, pilihan === 'gelap' ? 'dark' : 'light')
  } catch {
    // penyimpanan tidak tersedia: pilihan berlaku sampai halaman dimuat ulang
  }
}

/** Tombol bar atas: tiga keadaan; label menyebut keadaan sekarang. Hanya ikon di ponsel (aria-label tetap). */
export function TombolTema() {
  const pilihan = usePilihanTema()
  const label = `Tema: ${LABEL[pilihan]}`
  const berikutnya = URUTAN[(URUTAN.indexOf(pilihan) + 1) % URUTAN.length]!
  return (
    <Button ukuran="ikon" aria-label={label} onClick={() => terapkan(berikutnya)} className="desk:px-3">
      <Ikon nama={IKON[pilihan]} />
      <span className="max-desk:hidden" aria-hidden="true">
        {label}
      </span>
    </Button>
  )
}
