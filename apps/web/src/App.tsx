import { useEffect, useState } from 'react'
import { NAMA_APLIKASI } from '@cutiterbang/domain'

export default function App() {
  const [api, setApi] = useState<'memuat' | 'ok' | 'gagal'>('memuat')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? setApi('ok') : setApi('gagal')))
      .catch(() => setApi('gagal'))
  }, [])

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-semibold">{NAMA_APLIKASI}</h1>
      <p data-testid="status-api">API: {api}</p>
    </main>
  )
}
