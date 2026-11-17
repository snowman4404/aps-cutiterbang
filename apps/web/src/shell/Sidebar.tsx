import { Link, NavLink } from 'react-router'
import { NAMA_APLIKASI } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { Button } from '../ui/index.ts'
import { BarisPengguna } from './BarisPengguna.tsx'
import { kelompokMenu, menuUntuk } from './menu.ts'
import { TombolMasukDaftar } from './TombolMasukDaftar.tsx'
import { useResetDemo } from './useResetDemo.ts'

const kelasNav = ({ isActive }: { isActive: boolean }) =>
  `flex h-[34px] items-center rounded-control px-2.5 transition-colors ${
    isActive ? 'bg-active font-medium text-ink' : 'text-muted hover:text-ink'
  }`

/** Sidebar desktop; di ponsel menjadi menu layar penuh saat `menuTerbuka`. Berisi merek, menu per grup, reset demo, baris pengguna. */
export function Sidebar({ menuTerbuka }: { menuTerbuka: boolean }) {
  const { akun } = useAuth()
  const reset = useResetDemo()

  return (
    <aside
      id="sidebar"
      className={`flex-col bg-ground desk:sticky desk:inset-auto desk:top-0 desk:row-span-2 desk:flex desk:h-screen desk:overflow-visible desk:px-3 desk:py-4 ${
        menuTerbuka ? 'fixed inset-x-0 bottom-0 top-[var(--topbar-h-phone)] z-20 flex overflow-y-auto px-1.5 pb-6 pt-2' : 'hidden'
      }`}
    >
      <Link to="/" className="flex items-center gap-2.5 px-2.5 pb-2 pt-1 text-base font-semibold tracking-[-0.01em]">
        <span className="h-5 w-5 flex-none rounded-pill bg-ink" aria-hidden="true" />
        {NAMA_APLIKASI}
      </Link>
      <nav aria-label="Menu utama" className="flex flex-col desk:min-h-0 desk:overflow-y-auto">
        {kelompokMenu(menuUntuk(akun)).map((kelompok, urutan) => (
          <div key={kelompok.grup} role="group" aria-label={kelompok.grup} className="flex flex-col">
            <p className={`px-2.5 pb-1.5 text-xs text-muted ${urutan === 0 ? 'pt-3 desk:pt-6' : 'pt-6'}`}>
              {kelompok.grup}
            </p>
            {kelompok.item.map((item) => (
              <NavLink key={item.path} to={item.path} end className={kelasNav}>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col pt-6">
        {!akun && <TombolMasukDaftar className="mb-4 desk:hidden" />}
        {reset.aktif && (
          <Button varian="text" onClick={reset.resetData} disabled={reset.mereset}>
            Reset data demo
          </Button>
        )}
        {akun && <BarisPengguna akun={akun} />}
      </div>
    </aside>
  )
}
