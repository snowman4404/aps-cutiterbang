import { useSearchParams } from 'react-router'
import type { PegawaiRingkas } from '@cutiterbang/domain'
import { Alert, DataTable, EmptyState, PageTitle } from '../ui/index.ts'
import { formatTanggal } from '../lib/tanggal.ts'
import { useMuat } from '../lib/useMuat.ts'
import { formatLama } from './format.ts'
import { PilihPegawai } from './PilihPegawai.tsx'

interface Riwayat {
  pegawai: PegawaiRingkas
  tahun: number
  riwayat: { id: number; tanggalMulai: string; tanggalAkhir: string; lamaCuti: number }[]
  pesan?: string
}

// US-1b: Halaman Riwayat Cuti.
export default function HalamanRiwayatCuti() {
  const [params, setParams] = useSearchParams()
  const nip = params.get('nip') ?? ''
  const { data, galat } = useMuat<Riwayat>(nip ? `/cuti/pegawai/${encodeURIComponent(nip)}/riwayat` : null)

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Cuti yang disetujui dan mulai pada tahun berjalan, terbaru di atas.">Riwayat Cuti</PageTitle>
      <PilihPegawai nip={nip} onPilih={(nipTerpilih) => setParams(nipTerpilih ? { nip: nipTerpilih } : {})} />
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
                {data.riwayat.map((cuti) => (
                  <tr key={cuti.id}>
                    <td>{formatTanggal(cuti.tanggalMulai)}</td>
                    <td>{formatTanggal(cuti.tanggalAkhir)}</td>
                    <td className="num">{formatLama(cuti.lamaCuti)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        ))}
    </section>
  )
}
