import { useSyncExternalStore } from 'react'
import { Ikon } from './Ikon.tsx'

const KUNCI = 'cutiterbang-tema'
const GELAP_PERANGKAT = '(prefers-color-scheme: dark)'

function gelap(): boolean {
  const t = document.documentElement.dataset.theme
  if (t === 'dark') return true
  if (t === 'light') return false
  return matchMedia(GELAP_PERANGKAT).matches
}

function langganan(cb: () => void) {
  const pengamat = new MutationObserver(cb)
  pengamat.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  const mq = matchMedia(GELAP_PERANGKAT)
  mq.addEventListener('change', cb)
  return () => {
    pengamat.disconnect()
    mq.removeEventListener('change', cb)
  }
}

/** Tema yang sedang tampil (mengikuti perangkat sampai pengguna memilih). */
export function useGelap() {
  return useSyncExternalStore(langganan, gelap, () => false)
}

function ubahTema() {
  const baru = gelap() ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', baru)
  try {
    localStorage.setItem(KUNCI, baru)
  } catch {
    // penyimpanan tidak tersedia: pilihan berlaku sampai halaman dimuat ulang
  }
}

/** Tombol bar atas: label di layar lebar, hanya ikon di ponsel (aria-label tetap). */
export function TombolTema() {
  const dark = useGelap()
  const label = dark ? 'Mode terang' : 'Mode gelap'
  return (
    <button
      type="button"
      onClick={ubahTema}
      aria-label={label}
      className="inline-flex h-8 items-center gap-2 rounded-control border border-control bg-surface px-2.5 transition-colors hover:border-ink desk:px-3"
    >
      <Ikon nama={dark ? 'matahari' : 'bulan'} />
      <span className="max-desk:hidden" aria-hidden="true">
        {label}
      </span>
    </button>
  )
}
