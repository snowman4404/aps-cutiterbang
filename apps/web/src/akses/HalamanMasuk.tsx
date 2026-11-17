import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alert, Button, Card, Field, Input, PageTitle } from '../ui/index.ts'
import { useAuth } from './AuthContext.tsx'

const AKUN_DEMO = [
  ['hrd@cutiterbang.test', 'HRD Manajer'],
  ['penumpang@cutiterbang.test', 'Calon Penumpang'],
  ['member1@cutiterbang.test', 'Member Frequent Traveller'],
  ['member2@cutiterbang.test', 'Member Frequent Traveller'],
  ['travel@cutiterbang.test', 'Manajer Travel'],
  ['pengunjung1@cutiterbang.test', 'Pengunjung'],
  ['pengunjung2@cutiterbang.test', 'Pengunjung'],
]

// Hanya jalur di dalam aplikasi yang boleh jadi tujuan setelah masuk.
function tujuanAman(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

export default function HalamanMasuk() {
  const { masuk } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    setSibuk(true)
    setPesan('')
    const hasil = await masuk(email, kataSandi)
    setSibuk(false)
    if (hasil.ok) void navigate(tujuanAman(params.get('next')), { replace: true })
    else setPesan(hasil.pesan ?? 'Terjadi kesalahan, coba lagi')
  }

  return (
    <div className="flex max-w-[420px] flex-col gap-6">
      <PageTitle finding="Masuk untuk memakai manajemen cuti atau pemesanan tiket.">Masuk</PageTitle>
      <Card>
        <form onSubmit={kirim} className="flex flex-col gap-4">
          <Field label="Email">
            {(p) => (
              <Input
                {...p}
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Kata sandi">
            {(p) => (
              <Input
                {...p}
                type="password"
                name="kataSandi"
                autoComplete="current-password"
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
                required
              />
            )}
          </Field>
          {pesan && <Alert varian="negative">{pesan}</Alert>}
          <Button type="submit" varian="primary" penuh disabled={sibuk}>
            Masuk
          </Button>
          <p className="text-muted">
            Belum punya akun?{' '}
            <Link to="/daftar" className="text-link hover:underline">
              Daftar
            </Link>
          </p>
        </form>
      </Card>

      <Card varian="raised" data-testid="akun-demo">
        <h2 className="text-base font-semibold tracking-[-0.01em]">Akun demo</h2>
        <p className="mt-1 text-muted">
          Kata sandi semua akun: <code className="font-mono text-sm font-medium text-ink">rahasia123</code>
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {AKUN_DEMO.map(([e, peran]) => (
            <li key={e} className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <span className="text-muted">{peran}</span>
              <button
                type="button"
                className="text-left text-link hover:underline"
                onClick={() => {
                  setEmail(e)
                  setKataSandi('rahasia123')
                }}
              >
                {e}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
