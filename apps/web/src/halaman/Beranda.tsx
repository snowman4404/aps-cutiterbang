import { Link } from 'react-router'
import { LABEL_PERAN } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { menuUntuk } from '../shell/menu.ts'

export default function Beranda() {
  const { akun, memuat } = useAuth()
  if (memuat) return <p className="text-slate-500">Memuat…</p>

  if (!akun) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Selamat datang di CutiTerbang</h1>
        <p className="text-slate-600">Manajemen cuti dan pemesanan tiket pesawat.</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/masuk" className="rounded-md bg-sky-700 px-4 py-2 font-medium text-white">
            Masuk
          </Link>
          <Link to="/daftar" className="rounded-md border border-sky-700 px-4 py-2 font-medium text-sky-700">
            Daftar
          </Link>
          <Link to="/penerbangan" className="rounded-md border border-slate-300 px-4 py-2 font-medium">
            Cari Penerbangan
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">
        Halo, {akun.nama}{' '}
        <span className="text-base font-normal text-slate-500">({LABEL_PERAN[akun.peran]})</span>
      </h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {menuUntuk(akun.peran).map((m) => (
          <li key={m.path}>
            <Link
              to={m.path}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-600"
            >
              <span className="font-medium">{m.label}</span>
              <span className="block text-xs text-slate-500">{m.us}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
