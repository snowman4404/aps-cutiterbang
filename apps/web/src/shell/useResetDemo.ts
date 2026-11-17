import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../akses/AuthContext.tsx'
import { panggil } from '../lib/api.ts'

/** Reset data demo: aktif hanya bila API melaporkan `resetAktif` (di produksi mati kecuali IZINKAN_RESET=1). */
export function useResetDemo() {
  const { muatUlang } = useAuth()
  const navigate = useNavigate()
  const [aktif, setAktif] = useState(false)
  const [mereset, setMereset] = useState(false)

  useEffect(() => {
    void panggil<{ resetAktif?: boolean }>('/health')
      .then((respons) => setAktif(respons.data.resetAktif === true))
      .catch(() => setAktif(false))
  }, [])

  async function resetData() {
    setMereset(true)
    await panggil('/dev/reset', { method: 'POST' })
    await muatUlang() // sesi ikut terhapus, jadi pengguna keluar
    setMereset(false)
    void navigate('/')
  }

  return { aktif, mereset, resetData }
}
