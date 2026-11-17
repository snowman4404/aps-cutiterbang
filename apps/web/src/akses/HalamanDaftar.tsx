import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  LABEL_PERAN,
  PERAN_PENDAFTARAN,
  validasiPendaftaran,
  type GalatPendaftaran,
  type PeranPendaftaran,
} from '@cutiterbang/domain'
import { Alert, Button, Card, Field, Input, PageTitle, PilihanRadio } from '../ui/index.ts'
import { useAuth } from './AuthContext.tsx'

const PILIHAN_PERAN = PERAN_PENDAFTARAN.map((peran) => ({ nilai: peran, label: LABEL_PERAN[peran] }))

export default function HalamanDaftar() {
  const { daftar } = useAuth()
  const navigate = useNavigate()
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [peran, setPeran] = useState<PeranPendaftaran>('CalonPenumpang')
  const [galat, setGalat] = useState<GalatPendaftaran>({})
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirimPendaftaran(event: FormEvent) {
    event.preventDefault()
    setPesan('')
    const validasi = validasiPendaftaran({ nama, email, kataSandi, peran })
    if (!validasi.ok) {
      setGalat(validasi.galat)
      return
    }
    setGalat({})

    setSibuk(true)
    const hasil = await daftar(validasi.data)
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
        <form onSubmit={kirimPendaftaran} noValidate className="flex flex-col gap-4">
          <Field label="Nama" galat={galat.nama}>
            {(kontrol) => (
              <Input
                {...kontrol}
                name="nama"
                autoComplete="name"
                value={nama}
                onChange={(event) => setNama(event.target.value)}
              />
            )}
          </Field>
          <Field label="Email" galat={galat.email}>
            {(kontrol) => (
              <Input
                {...kontrol}
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </Field>
          <Field label="Kata sandi" galat={galat.kataSandi}>
            {(kontrol) => (
              <Input
                {...kontrol}
                type="password"
                name="kataSandi"
                autoComplete="new-password"
                value={kataSandi}
                onChange={(event) => setKataSandi(event.target.value)}
              />
            )}
          </Field>
          <PilihanRadio
            legend="Daftar sebagai"
            name="peran"
            nilai={peran}
            pilihan={PILIHAN_PERAN}
            onPilih={setPeran}
            galat={galat.peran}
          />
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
