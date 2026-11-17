import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { panggil } from '../akses/api.ts'
import { Alert, Card, PageTitle, Pill } from '../ui/index.ts'
import { formatLama, type PegawaiRingkas } from './format.ts'
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
  const [data, setData] = useState<Sisa | null>(null)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    let batal = false
    setData(null)
    setGalat('')
    if (nip) {
      void panggil<Sisa & { pesan?: string }>(`/cuti/pegawai/${encodeURIComponent(nip)}/sisa`).then((r) => {
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
      <PageTitle finding="Jatah cuti tahunan dikurangi hari kerja cuti yang disetujui pada tahun berjalan.">
        Sisa Cuti
      </PageTitle>
      <PilihPegawai nip={nip} onPilih={(n) => setParams(n ? { nip: n } : {})} />
      {galat && <Alert varian="negative">{galat}</Alert>}
      {data && (
        <Card className="flex max-w-[420px] flex-col gap-4" aria-label="Sisa cuti">
          <p className="text-muted">
            <strong className="font-semibold text-ink">{data.pegawai.nama}</strong> · tahun {data.tahun}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span data-testid="sisa-cuti" className="text-[32px] font-semibold leading-none tabular-nums">
              {formatLama(data.sisaCuti)}
            </span>
            {data.melebihiJatah && <Pill varian="negative">Melebihi jatah</Pill>}
          </div>
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
