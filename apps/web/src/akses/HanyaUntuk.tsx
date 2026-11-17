import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { PESAN_TIDAK_ADA_AKSES, punyaPeran, type Peran } from '@cutiterbang/domain'
import { Alert, Memuat } from '../ui/index.ts'
import { useAuth } from './AuthContext.tsx'

// Guard rute <HanyaUntuk peran={[...]}>: belum masuk -> /masuk?next=...; peran salah -> hanya pesan tanpa akses.
export function HanyaUntuk({ peran, children }: { peran: readonly Peran[]; children: ReactNode }) {
  const { akun, memuat } = useAuth()
  const lokasi = useLocation()

  if (memuat) return <Memuat />
  if (!akun) {
    const tujuan = encodeURIComponent(lokasi.pathname + lokasi.search)
    return <Navigate to={`/masuk?next=${tujuan}`} replace />
  }
  if (!punyaPeran(akun.peran, peran)) {
    return <Alert varian="negative">{PESAN_TIDAK_ADA_AKSES}</Alert>
  }
  return <>{children}</>
}
