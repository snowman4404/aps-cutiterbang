import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { LABEL_PERAN, NAMA_APLIKASI } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { panggil } from '../akses/api.ts'
import { menuUntuk } from './menu.ts'

const kelasNav = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 text-sm ${isActive ? 'bg-sky-100 font-medium text-sky-900' : 'text-slate-700 hover:bg-slate-100'}`

export default function Layout() {
  const { akun, keluar, muatUlang } = useAuth()
  const navigate = useNavigate()
  const [mereset, setMereset] = useState(false)

  async function resetData() {
    setMereset(true)
    await panggil('/dev/reset', { method: 'POST' })
    await muatUlang() // sesi ikut terhapus, jadi pengguna keluar
    setMereset(false)
    void navigate('/')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-sky-800">
            {NAMA_APLIKASI}
          </Link>
          <nav aria-label="Menu utama" className="flex flex-1 flex-wrap items-center gap-1">
            {menuUntuk(akun?.peran ?? null).map((m) => (
              <NavLink key={m.path} to={m.path} end className={kelasNav}>
                {m.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            {akun ? (
              <>
                <span data-testid="pengguna">
                  {akun.nama} <span className="text-slate-500">({LABEL_PERAN[akun.peran]})</span>
                </span>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
                  onClick={async () => {
                    await keluar()
                    void navigate('/')
                  }}
                >
                  Keluar
                </button>
              </>
            ) : (
              <>
                <NavLink to="/masuk" className={kelasNav}>
                  Masuk
                </NavLink>
                <NavLink to="/daftar" className={kelasNav}>
                  Daftar
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-sm text-slate-500">
          <span>Aplikasi demo tugas kuliah</span>
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            onClick={resetData}
            disabled={mereset}
          >
            Reset data
          </button>
        </div>
      </footer>
    </div>
  )
}
