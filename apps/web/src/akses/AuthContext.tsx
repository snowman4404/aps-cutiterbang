import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AkunPublik, GalatPendaftaran, PeranPendaftaran } from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'

export type HasilAuth = { ok: true } | { ok: false; pesan?: string; galat?: GalatPendaftaran }

interface Auth {
  akun: AkunPublik | null
  memuat: boolean
  masuk: (email: string, kataSandi: string) => Promise<HasilAuth>
  daftar: (data: { nama: string; email: string; kataSandi: string; peran: PeranPendaftaran }) => Promise<HasilAuth>
  keluar: () => Promise<void>
  muatUlang: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

interface ResponsAuth {
  akun?: AkunPublik
  pesan?: string
  galat?: GalatPendaftaran
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [akun, setAkun] = useState<AkunPublik | null>(null)
  const [memuat, setMemuat] = useState(true)

  const muatUlang = useCallback(async () => {
    try {
      const { status, data } = await panggil<ResponsAuth>('/auth/saya')
      setAkun(status === 200 && data.akun ? data.akun : null)
    } catch {
      setAkun(null)
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    void muatUlang()
  }, [muatUlang])

  const nilai = useMemo<Auth>(() => {
    const mulaiSesiLewat = async (path: string, body: unknown, statusSukses: number): Promise<HasilAuth> => {
      const { status, data } = await panggil<ResponsAuth>(path, { body })
      if (status === statusSukses && data.akun) {
        setAkun(data.akun)
        return { ok: true }
      }
      return { ok: false, pesan: data.pesan, galat: data.galat }
    }
    return {
      akun,
      memuat,
      masuk: (email, kataSandi) => mulaiSesiLewat('/auth/masuk', { email, kataSandi }, 200),
      daftar: (data) => mulaiSesiLewat('/auth/daftar', data, 201),
      keluar: async () => {
        await panggil('/auth/keluar', { method: 'POST' })
        setAkun(null)
      },
      muatUlang,
    }
  }, [akun, memuat, muatUlang])

  return <AuthContext value={nilai}>{children}</AuthContext>
}

export function useAuth(): Auth {
  const konteks = useContext(AuthContext)
  if (!konteks) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return konteks
}
