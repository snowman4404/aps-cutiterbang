import { useState } from 'react'
import { useLocation } from 'react-router'

/** Menu layar penuh di ponsel. Terbuka untuk satu rute saja: pindah halaman menutupnya tanpa effect. */
export function useMenuPonsel() {
  const { pathname } = useLocation()
  const [terbukaDi, setTerbukaDi] = useState<string | null>(null)
  const terbuka = terbukaDi === pathname
  return { terbuka, alihkan: () => setTerbukaDi(terbuka ? null : pathname) }
}
