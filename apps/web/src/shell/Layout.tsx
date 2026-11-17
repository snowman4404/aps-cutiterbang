import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { LABEL_PERAN, NAMA_APLIKASI } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { panggil } from '../akses/api.ts'
import { Ikon, LinkTombol, TombolTema } from '../ui/index.ts'
import { MENU, kelompokMenu, menuUntuk } from './menu.ts'

const JUDUL_TETAP: Record<string, string> = { '/': NAMA_APLIKASI, '/masuk': 'Masuk', '/daftar': 'Daftar' }

const kelasNav = ({ isActive }: { isActive: boolean }) =>
  `flex h-[34px] items-center rounded-control px-2.5 transition-colors ${
    isActive ? 'bg-active font-medium text-ink' : 'text-muted hover:text-ink'
  }`

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]!.toUpperCase())
    .join('')
}

export default function Layout() {
  const { akun, keluar, muatUlang } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [mereset, setMereset] = useState(false)
  // Menu ponsel terbuka untuk satu rute saja: pindah halaman menutupnya tanpa effect.
  const [menuDi, setMenuDi] = useState<string | null>(null)
  const menuTerbuka = menuDi === pathname

  async function resetData() {
    setMereset(true)
    await panggil('/dev/reset', { method: 'POST' })
    await muatUlang() // sesi ikut terhapus, jadi pengguna keluar
    setMereset(false)
    void navigate('/')
  }

  const judul = JUDUL_TETAP[pathname] ?? MENU.find((m) => m.path === pathname)?.label ?? NAMA_APLIKASI

  const tombolReset = (
    <button
      type="button"
      onClick={resetData}
      disabled={mereset}
      className="h-8 rounded-control px-2.5 text-left text-xs text-muted transition-colors hover:text-ink disabled:opacity-60"
    >
      Reset data demo
    </button>
  )

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] desk:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
      <aside
        id="sidebar"
        className={`flex-col bg-ground desk:sticky desk:inset-auto desk:top-0 desk:row-span-2 desk:flex desk:h-screen desk:overflow-visible desk:px-3 desk:py-4 ${
          menuTerbuka ? 'fixed inset-x-0 bottom-0 top-[var(--topbar-h-phone)] z-20 flex overflow-y-auto px-1.5 pb-6 pt-2' : 'hidden'
        }`}
      >
        <Link
          to="/"
          className="flex items-center gap-2.5 px-2.5 pb-2 pt-1 text-base font-semibold tracking-[-0.01em]"
        >
          <span className="h-5 w-5 flex-none rounded-[5px] bg-accent" aria-hidden="true" />
          {NAMA_APLIKASI}
        </Link>
        <nav aria-label="Menu utama" className="flex flex-col desk:min-h-0 desk:overflow-y-auto">
          {kelompokMenu(menuUntuk(akun?.peran ?? null)).map((k, i) => (
            <div key={k.grup} role="group" aria-label={k.grup} className="flex flex-col">
              <p className={`px-2.5 pb-1.5 text-xs text-muted ${i === 0 ? 'pt-3 desk:pt-6' : 'pt-6'}`}>{k.grup}</p>
              {k.item.map((m) => (
                <NavLink key={m.path} to={m.path} end className={kelasNav}>
                  {m.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col pt-6">
          {!akun && (
            <div className="mb-4 flex gap-2 desk:hidden">
              <LinkTombol to="/masuk" varian="secondary" ukuran="sm">
                Masuk
              </LinkTombol>
              <LinkTombol to="/daftar" varian="primary" ukuran="sm">
                Daftar
              </LinkTombol>
            </div>
          )}
          {tombolReset}
          {akun && (
            <div className="mt-1 flex flex-col gap-1 px-1.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-8 w-8 flex-none place-items-center rounded-full bg-active text-xs font-semibold"
                  aria-hidden="true"
                >
                  {inisial(akun.nama)}
                </span>
                <span className="flex min-w-0 flex-col leading-[1.3]" data-testid="pengguna">
                  <strong className="truncate font-medium">{akun.nama}</strong>
                  <span className="text-xs text-muted">{LABEL_PERAN[akun.peran]}</span>
                </span>
              </div>
              <button
                type="button"
                className="h-8 self-start rounded-control pl-10 text-left text-xs text-muted transition-colors hover:text-ink"
                onClick={async () => {
                  await keluar()
                  void navigate('/')
                }}
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-[var(--topbar-h-phone)] items-center gap-3 bg-ground px-4 desk:static desk:h-[var(--topbar-h)] desk:pl-1 desk:pr-6">
        <button
          type="button"
          aria-label={menuTerbuka ? 'Tutup menu' : 'Buka menu'}
          aria-controls="sidebar"
          aria-expanded={menuTerbuka}
          onClick={() => setMenuDi(menuTerbuka ? null : pathname)}
          className="inline-flex h-8 items-center rounded-control border border-control bg-surface px-2.5 transition-colors hover:border-ink desk:hidden"
        >
          <Ikon nama={menuTerbuka ? 'tutup' : 'menu'} />
        </button>
        <span className="truncate font-semibold desk:hidden">{judul}</span>
        <div className="ml-auto flex items-center gap-2">
          <TombolTema />
          {!akun && (
            <div className="flex gap-2 max-desk:hidden">
              <LinkTombol to="/masuk" varian="secondary" ukuran="sm">
                Masuk
              </LinkTombol>
              <LinkTombol to="/daftar" varian="primary" ukuran="sm">
                Daftar
              </LinkTombol>
            </div>
          )}
        </div>
      </header>

      <main className="min-w-0 border border-border bg-sheet px-4 pb-10 pt-5 max-desk:border-x-0 max-desk:border-b-0 desk:mb-[var(--sheet-inset)] desk:mr-[var(--sheet-inset)] desk:rounded-sheet desk:px-6 desk:pt-6">
        <Outlet />
      </main>
    </div>
  )
}
