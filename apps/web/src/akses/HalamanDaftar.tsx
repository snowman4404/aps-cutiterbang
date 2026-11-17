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
import { useAuth } from './AuthContext.tsx'
import { Kolom, kelasInput, kelasTombol } from './komponen.tsx'

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
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Daftar</h1>
      <form onSubmit={kirim} noValidate className="space-y-4">
        <Kolom label="Nama" galat={galat.nama}>
          <input
            name="nama"
            autoComplete="name"
            className={kelasInput}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </Kolom>
        <Kolom label="Email" galat={galat.email}>
          <input
            type="email"
            name="email"
            autoComplete="username"
            className={kelasInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Kolom>
        <Kolom label="Kata sandi" galat={galat.kataSandi}>
          <input
            type="password"
            name="kataSandi"
            autoComplete="new-password"
            className={kelasInput}
            value={kataSandi}
            onChange={(e) => setKataSandi(e.target.value)}
          />
        </Kolom>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Daftar sebagai</legend>
          <div className="mt-1 space-y-1">
            {PERAN_PENDAFTARAN.map((p) => (
              <label key={p} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="peran"
                  value={p}
                  checked={peran === p}
                  onChange={() => setPeran(p)}
                />
                {LABEL_PERAN[p]}
              </label>
            ))}
          </div>
          {galat.peran && (
            <span role="alert" className="mt-1 block text-sm text-red-700">
              {galat.peran}
            </span>
          )}
        </fieldset>
        {pesan && (
          <p role="alert" className="text-sm text-red-700">
            {pesan}
          </p>
        )}
        <button type="submit" className={kelasTombol} disabled={sibuk}>
          Daftar
        </button>
        <p className="text-sm text-slate-600">
          Sudah punya akun?{' '}
          <Link to="/masuk" className="text-sky-700 underline">
            Masuk
          </Link>
        </p>
      </form>
    </div>
  )
}
