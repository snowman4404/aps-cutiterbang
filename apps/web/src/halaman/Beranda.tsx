import { Link } from 'react-router'
import { LABEL_PERAN } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { kelompokMenu, menuUntuk } from '../shell/menu.ts'
import { Ikon, LinkTombol, PageTitle } from '../ui/index.ts'

export default function Beranda() {
  const { akun, memuat } = useAuth()
  if (memuat) return <p className="text-muted">Memuat…</p>

  if (!akun) {
    return (
      <section className="flex max-w-xl flex-col gap-6">
        <PageTitle finding="Manajemen cuti pegawai dan pemesanan tiket pesawat dalam satu aplikasi, dengan satu login.">
          CutiTerbang
        </PageTitle>
        <div className="flex flex-wrap items-center gap-3">
          <LinkTombol to="/masuk" varian="primary">
            Masuk
          </LinkTombol>
          <LinkTombol to="/daftar" varian="secondary">
            Daftar
          </LinkTombol>
          <Link to="/penerbangan" className="px-2 text-link hover:underline">
            Cari Penerbangan
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-8">
      <PageTitle finding={LABEL_PERAN[akun.peran]}>Halo, {akun.nama}</PageTitle>
      {kelompokMenu(menuUntuk(akun.peran)).map((k) => (
        <div key={k.grup} className="max-w-2xl">
          <h2 className="text-base font-semibold tracking-[-0.01em]">{k.grup}</h2>
          <ul className="mt-2">
            {k.item.map((m) => (
              <li key={m.path} className="border-b border-rule last:border-b-0">
                <Link
                  to={m.path}
                  className="group flex min-h-[52px] items-center gap-3 rounded-control py-2 hover:bg-raised max-desk:pr-1"
                >
                  <span className="flex-1">{m.label}</span>
                  <span className="num text-xs text-muted">{m.us}</span>
                  <span className="num w-14 text-right text-xs text-muted">Fase {m.fase}</span>
                  <Ikon nama="panah" className="text-muted group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
