import { Link } from 'react-router'
import { LABEL_PERAN } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { kelompokMenu, menuUntuk } from '../shell/menu.ts'
import { Ikon, JudulBagian, LinkTombol, Memuat, PageTitle } from '../ui/index.ts'

export default function Beranda() {
  const { akun, memuat } = useAuth()
  if (memuat) return <Memuat />

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
          {menuUntuk(null).map((item) => (
            <Link key={item.path} to={item.path} className="px-2 text-link hover:underline">
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-8">
      <PageTitle finding={LABEL_PERAN[akun.peran]}>Halo, {akun.nama}</PageTitle>
      {kelompokMenu(menuUntuk(akun)).map((kelompok) => (
        <div key={kelompok.grup} className="max-w-2xl">
          <JudulBagian>{kelompok.grup}</JudulBagian>
          <ul className="mt-2">
            {kelompok.item.map((item) => (
              <li key={item.path} className="border-b border-rule last:border-b-0">
                <Link
                  to={item.path}
                  className="group flex min-h-[52px] items-center gap-3 rounded-control py-2 hover:bg-raised max-desk:pr-1"
                >
                  <span className="flex-1">{item.label}</span>
                  <span className="num text-xs text-muted">{item.us}</span>
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
