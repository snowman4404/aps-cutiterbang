import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { PESAN_TIDAK_ADA_AKSES, punyaPeran, type Peran } from '@cutiterbang/domain'
import { useAuth } from './AuthContext.tsx'

// Guard rute: belum masuk -> /masuk?next=...; peran salah -> hanya pesan tanpa akses.
export function Butuh({ peran, children }: { peran: Peran[]; children: ReactNode }) {
  const { akun, memuat } = useAuth()
  const lokasi = useLocation()

  if (memuat) return <p className="text-slate-500">Memuat…</p>
  if (!akun) {
    const next = encodeURIComponent(lokasi.pathname + lokasi.search)
    return <Navigate to={`/masuk?next=${next}`} replace />
  }
  if (!punyaPeran(akun.peran, peran)) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
        {PESAN_TIDAK_ADA_AKSES}
      </p>
    )
  }
  return <>{children}</>
}
