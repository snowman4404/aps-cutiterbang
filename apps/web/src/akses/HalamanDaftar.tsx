import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  LABEL_PERAN,
  PERAN_PENDAFTARAN,
  validasiPendaftaran,
  type GalatPendaftaran,
  type Peran,
} from '@cutiterbang/domain'
import { Alert, Button, Card, Field, Input, PageTitle } from '../ui/index.ts'
import { useAuth } from './AuthContext.tsx'

export default function HalamanDaftar() {
  const { daftar } = useAuth()
  const navigate = useNavigate()
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [peran, setPeran] = useState<Peran>('CalonPenumpang')
  const [galat, setGalat] = useState<GalatPendaftaran>({})
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    setPesan('')
    const data = { nama, email, kataSandi, peran }
    const lokal = validasiPendaftaran(data)
    setGalat(lokal)
    if (Object.keys(lokal).length > 0) return

    setSibuk(true)
    const hasil = await daftar(data)
    setSibuk(false)
    if (hasil.ok) void navigate('/', { replace: true })
    else {
      setGalat(hasil.galat ?? {})
      if (hasil.pesan) setPesan(hasil.pesan)
    }
  }

  return (
    <div className="flex max-w-[420px] flex-col gap-6">
      <PageTitle finding="Buat akun baru untuk memakai CutiTerbang.">Daftar</PageTitle>
      <Card>
        <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
          <Field label="Nama" galat={galat.nama}>
            {(p) => (
              <Input
                {...p}
                name="nama"
                autoComplete="name"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
              />
            )}
          </Field>
          <Field label="Email" galat={galat.email}>
            {(p) => (
              <Input
                {...p}
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label="Kata sandi" galat={galat.kataSandi}>
            {(p) => (
              <Input
                {...p}
                type="password"
                name="kataSandi"
                autoComplete="new-password"
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
              />
            )}
          </Field>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-xs font-medium text-muted">Daftar sebagai</legend>
            {PERAN_PENDAFTARAN.map((p) => (
              <label key={p} className="flex min-h-[34px] items-center gap-2.5">
                <input
                  type="radio"
                  name="peran"
                  value={p}
                  className="h-4 w-4 accent-primary"
                  checked={peran === p}
                  onChange={() => setPeran(p)}
                />
                {LABEL_PERAN[p]}
              </label>
            ))}
            {galat.peran && (
              <span role="alert" className="text-sm text-pill-negative-ink">
                {galat.peran}
              </span>
            )}
          </fieldset>
          {pesan && <Alert varian="negative">{pesan}</Alert>}
          <Button type="submit" varian="primary" penuh disabled={sibuk}>
            Daftar
          </Button>
          <p className="text-muted">
            Sudah punya akun?{' '}
            <Link to="/masuk" className="text-link hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
