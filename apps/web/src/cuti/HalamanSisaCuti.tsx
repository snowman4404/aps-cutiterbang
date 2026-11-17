import { useSearchParams } from 'react-router'
import type { PegawaiRingkas } from '@cutiterbang/domain'
import { Alert, Card, PageTitle, Pill, Statistik } from '../ui/index.ts'
import { useMuat } from '../lib/useMuat.ts'
import { formatLama } from './format.ts'
import { PilihPegawai } from './PilihPegawai.tsx'

interface Sisa {
  pegawai: PegawaiRingkas
  tahun: number
  jatahCutiTahunan: number
  cutiTerpakai: number
  sisaCuti: number
  melebihiJatah: boolean
}

// US-1c: Halaman Sisa Cuti.
export default function HalamanSisaCuti() {
  const [params, setParams] = useSearchParams()
  const nip = params.get('nip') ?? ''
  const { data, galat } = useMuat<Sisa>(nip ? `/cuti/pegawai/${encodeURIComponent(nip)}/sisa` : null)

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Jatah cuti tahunan dikurangi hari kerja cuti yang disetujui pada tahun berjalan.">
        Sisa Cuti
      </PageTitle>
      <PilihPegawai nip={nip} onPilih={(n) => setParams(n ? { nip: n } : {})} />
      {galat && <Alert varian="negative">{galat}</Alert>}
      {data && (
        <Card className="flex max-w-form flex-col gap-4" aria-label="Sisa cuti">
          <p className="text-muted">
            <strong className="font-semibold text-ink">{data.pegawai.nama}</strong> · tahun {data.tahun}
          </p>
          <Statistik
            testId="sisa-cuti"
            nilai={formatLama(data.sisaCuti)}
            catatan={data.melebihiJatah && <Pill varian="negative">Melebihi jatah</Pill>}
          />
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 tabular-nums">
            <dt className="text-muted">Jatah cuti tahunan</dt>
            <dd>{formatLama(data.jatahCutiTahunan)}</dd>
            <dt className="text-muted">Terpakai</dt>
            <dd>{formatLama(data.cutiTerpakai)}</dd>
          </dl>
        </Card>
      )}
    </section>
  )
}
