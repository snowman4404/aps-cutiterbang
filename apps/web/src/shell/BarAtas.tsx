import { useLocation } from 'react-router'
import { NAMA_APLIKASI } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { Button, Ikon, TombolTema } from '../ui/index.ts'
import { MENU } from './menu.ts'
import { TombolMasukDaftar } from './TombolMasukDaftar.tsx'

const JUDUL_TETAP: Record<string, string> = { '/': NAMA_APLIKASI, '/masuk': 'Masuk', '/daftar': 'Daftar' }

/** Bar atas: tombol menu dan judul halaman di ponsel; tombol tema dan Masuk/Daftar di desktop. */
export function BarAtas({ menuTerbuka, alihkanMenu }: { menuTerbuka: boolean; alihkanMenu: () => void }) {
  const { akun } = useAuth()
  const { pathname } = useLocation()
  const judul = JUDUL_TETAP[pathname] ?? MENU.find((item) => item.path === pathname)?.label ?? NAMA_APLIKASI

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-h-phone)] items-center gap-3 bg-ground px-4 desk:static desk:h-[var(--topbar-h)] desk:pl-1 desk:pr-6">
      <Button
        ukuran="ikon"
        aria-label={menuTerbuka ? 'Tutup menu' : 'Buka menu'}
        aria-controls="sidebar"
        aria-expanded={menuTerbuka}
        onClick={alihkanMenu}
        className="desk:hidden"
      >
        <Ikon nama={menuTerbuka ? 'tutup' : 'menu'} />
      </Button>
      <span className="truncate font-semibold desk:hidden">{judul}</span>
      <div className="ml-auto flex items-center gap-2">
        <TombolTema />
        {!akun && <TombolMasukDaftar className="max-desk:hidden" />}
      </div>
    </header>
  )
}
