import { useNavigate } from 'react-router'
import { LABEL_PERAN, type AkunPublik } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { Button } from '../ui/index.ts'

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0]!.toUpperCase())
    .join('')
}

/** Avatar inisial + nama + peran, dengan tombol Keluar di bawahnya (kaki sidebar). */
export function BarisPengguna({ akun }: { akun: AkunPublik }) {
  const { keluar } = useAuth()
  const navigate = useNavigate()

  async function keluarDanKeBeranda() {
    await keluar()
    void navigate('/')
  }

  return (
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
      <div className="pl-8">
        <Button varian="text" onClick={keluarDanKeBeranda}>
          Keluar
        </Button>
      </div>
    </div>
  )
}
