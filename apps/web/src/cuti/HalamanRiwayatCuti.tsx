import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { panggil } from '../akses/api.ts'
import { Alert, DataTable, EmptyState, PageTitle } from '../ui/index.ts'
import { formatLama, formatTanggal, type PegawaiRingkas } from './format.ts'
import { PilihPegawai } from './PilihPegawai.tsx'

interface Riwayat {
  pegawai: PegawaiRingkas
  tahun: number
  riwayat: { tanggalMulai: string; tanggalAkhir: string; lamaCuti: number }[]
  pesan?: string
}

// US-1b: Halaman Riwayat Cuti.
export default function HalamanRiwayatCuti() {
  const [params, setParams] = useSearchParams()
  const nip = params.get('nip') ?? ''
  const [data, setData] = useState<Riwayat | null>(null)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    let batal = false
    setData(null)
    setGalat('')
    if (nip) {
      void panggil<Riwayat>(`/cuti/pegawai/${encodeURIComponent(nip)}/riwayat`).then((r) => {
        if (batal) return
        if (r.status === 200) setData(r.data)
        else setGalat(r.data.pesan ?? 'Terjadi kesalahan, coba lagi')
      })
    }
    return () => {
      batal = true
    }
  }, [nip])

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Cuti yang disetujui dan mulai pada tahun berjalan, terbaru di atas.">Riwayat Cuti</PageTitle>
      <PilihPegawai nip={nip} onPilih={(n) => setParams(n ? { nip: n } : {})} />
      {galat && <Alert varian="negative">{galat}</Alert>}
      {data &&
        (data.riwayat.length === 0 ? (
          <EmptyState>{data.pesan}</EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted">
              Riwayat cuti <strong className="font-semibold text-ink">{data.pegawai.nama}</strong> tahun {data.tahun}
            </p>
            <DataTable aria-label="Riwayat cuti">
              <thead>
                <tr>
                  <th>Tanggal mulai</th>
                  <th>Tanggal akhir</th>
                  <th className="num">Lama cuti</th>
                </tr>
              </thead>
              <tbody>
                {data.riwayat.map((c) => (
                  <tr key={c.tanggalMulai}>
                    <td>{formatTanggal(c.tanggalMulai)}</td>
                    <td>{formatTanggal(c.tanggalAkhir)}</td>
                    <td className="num">{formatLama(c.lamaCuti)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        ))}
    </section>
  )
}
