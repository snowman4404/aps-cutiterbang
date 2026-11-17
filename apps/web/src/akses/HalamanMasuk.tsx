import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from './AuthContext.tsx'
import { Kolom, kelasInput, kelasTombol } from './komponen.tsx'

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
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Masuk</h1>
      <form onSubmit={kirim} className="space-y-4">
        <Kolom label="Email">
          <input
            type="email"
            name="email"
            autoComplete="username"
            className={kelasInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Kolom>
        <Kolom label="Kata sandi">
          <input
            type="password"
            name="kataSandi"
            autoComplete="current-password"
            className={kelasInput}
            value={kataSandi}
            onChange={(e) => setKataSandi(e.target.value)}
            required
          />
        </Kolom>
        {pesan && (
          <p role="alert" className="text-sm text-red-700">
            {pesan}
          </p>
        )}
        <button type="submit" className={kelasTombol} disabled={sibuk}>
          Masuk
        </button>
        <p className="text-sm text-slate-600">
          Belum punya akun?{' '}
          <Link to="/daftar" className="text-sky-700 underline">
            Daftar
          </Link>
        </p>
      </form>

      <aside className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm" data-testid="akun-demo">
        <h2 className="font-semibold">Akun demo</h2>
        <p className="mt-1 text-slate-600">
          Kata sandi semua akun: <code className="font-mono">rahasia123</code>
        </p>
        <ul className="mt-2 space-y-1">
          {AKUN_DEMO.map(([e, peran]) => (
            <li key={e}>
              <button
                type="button"
                className="text-left text-sky-700 hover:underline"
                onClick={() => {
                  setEmail(e)
                  setKataSandi('rahasia123')
                }}
              >
                {e}
              </button>{' '}
              <span className="text-slate-500">({peran})</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
