import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AKUN_DEMO, LABEL_PERAN, SANDI_DEMO } from '@cutiterbang/domain'
import { Alert, Button, Card, Field, Input, JudulBagian, Kode, PageTitle } from '../ui/index.ts'
import { useAuth } from './AuthContext.tsx'

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

  async function kirimFormulirMasuk(event: FormEvent) {
    event.preventDefault()
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
        <form onSubmit={kirimFormulirMasuk} className="flex flex-col gap-4">
          <Field label="Email">
            {(kontrol) => (
              <Input
                {...kontrol}
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            )}
          </Field>
          <Field label="Kata sandi">
            {(kontrol) => (
              <Input
                {...kontrol}
                type="password"
                name="kataSandi"
                autoComplete="current-password"
                value={kataSandi}
                onChange={(event) => setKataSandi(event.target.value)}
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
        <JudulBagian>Akun demo</JudulBagian>
        <p className="mt-1 text-muted">
          Kata sandi semua akun: <Kode>{SANDI_DEMO}</Kode>
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {AKUN_DEMO.map((akunDemo) => (
            <li
              key={akunDemo.email}
              className="flex flex-col gap-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="text-muted">{LABEL_PERAN[akunDemo.peran]}</span>
              <Button
                varian="tautan"
                onClick={() => {
                  setEmail(akunDemo.email)
                  setKataSandi(SANDI_DEMO)
                }}
              >
                {akunDemo.email}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
