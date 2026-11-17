import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { PESAN_TIDAK_ADA_AKSES, punyaPeran, type Peran } from '@cutiterbang/domain'
import { Alert } from '../ui/index.ts'
import { useAuth } from './AuthContext.tsx'

// Guard rute: belum masuk -> /masuk?next=...; peran salah -> hanya pesan tanpa akses.
export function Butuh({ peran, children }: { peran: Peran[]; children: ReactNode }) {
  const { akun, memuat } = useAuth()
  const lokasi = useLocation()

  if (memuat) return <p className="text-muted">Memuat…</p>
  if (!akun) {
    const next = encodeURIComponent(lokasi.pathname + lokasi.search)
    return <Navigate to={`/masuk?next=${next}`} replace />
  }
  if (!punyaPeran(akun.peran, peran)) {
    return <Alert varian="negative">{PESAN_TIDAK_ADA_AKSES}</Alert>
  }
  return <>{children}</>
}
