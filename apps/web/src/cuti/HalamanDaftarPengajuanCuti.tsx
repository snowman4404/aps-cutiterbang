import { useState } from 'react'
import type { FormEvent } from 'react'
import { validasiPeriode, type GalatPeriode, type StatusPengajuanCuti } from '@cutiterbang/domain'
import { panggil } from '../akses/api.ts'
import { Alert, Button, Card, DataTable, EmptyState, Field, Input, PageTitle, Pill } from '../ui/index.ts'
import { formatTanggal } from '../lib/tanggal.ts'
import { formatLama, VARIAN_STATUS } from './format.ts'

interface Pengajuan {
  id: number
  namaPegawai: string
  nomorIndukPegawai: string
  tanggalMulai: string
  tanggalAkhir: string
  lamaCuti: number
  status: StatusPengajuanCuti
}

type Hasil = { pengajuan: Pengajuan[]; pesan?: string }

// US-1a: Halaman Daftar Pengajuan Cuti.
export default function HalamanDaftarPengajuanCuti() {
  const [mulai, setMulai] = useState('')
  const [akhir, setAkhir] = useState('')
  const [galat, setGalat] = useState<GalatPeriode>({})
  const [pesanGalat, setPesanGalat] = useState('')
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [sibuk, setSibuk] = useState(false)

  async function tampilkan(e: FormEvent) {
    e.preventDefault()
    setPesanGalat('')
    const lokal = validasiPeriode({ mulai, akhir })
    setGalat(lokal)
    if (Object.keys(lokal).length > 0) {
      setHasil(null)
      return
    }
    setSibuk(true)
    const r = await panggil<Hasil & { galat?: GalatPeriode; pesan?: string }>(
      `/cuti/pengajuan?mulai=${encodeURIComponent(mulai)}&akhir=${encodeURIComponent(akhir)}`,
    )
    setSibuk(false)
    if (r.status === 200) setHasil(r.data)
    else {
      setHasil(null)
      setGalat(r.data.galat ?? {})
      if (!r.data.galat) setPesanGalat(r.data.pesan ?? 'Terjadi kesalahan, coba lagi')
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Pengajuan berstatus Diajukan atau Disetujui yang beririsan dengan periode.">
        Pengajuan Cuti
      </PageTitle>
      <Card>
        <form onSubmit={tampilkan} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="sm:w-[200px]">
            <Field label="Tanggal mulai" galat={galat.mulai}>
              {(p) => <Input {...p} type="date" name="mulai" value={mulai} onChange={(e) => setMulai(e.target.value)} />}
            </Field>
          </div>
          <div className="sm:w-[200px]">
            <Field label="Tanggal akhir" galat={galat.akhir}>
              {(p) => <Input {...p} type="date" name="akhir" value={akhir} onChange={(e) => setAkhir(e.target.value)} />}
            </Field>
          </div>
          <div className="sm:pt-[22px]">
            <Button type="submit" varian="primary" disabled={sibuk}>
              Tampilkan
            </Button>
          </div>
        </form>
      </Card>

      {pesanGalat && <Alert varian="negative">{pesanGalat}</Alert>}
      {hasil &&
        (hasil.pengajuan.length === 0 ? (
          <EmptyState>{hasil.pesan}</EmptyState>
        ) : (
          <DataTable aria-label="Daftar pengajuan cuti">
            <thead>
              <tr>
                <th>Nama pegawai</th>
                <th>Tanggal mulai</th>
                <th>Tanggal akhir</th>
                <th className="num">Lama cuti</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {hasil.pengajuan.map((p) => (
                <tr key={p.id}>
                  <td>{p.namaPegawai}</td>
                  <td>{formatTanggal(p.tanggalMulai)}</td>
                  <td>{formatTanggal(p.tanggalAkhir)}</td>
                  <td className="num">{formatLama(p.lamaCuti)}</td>
                  <td>
                    <Pill varian={VARIAN_STATUS[p.status]}>{p.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ))}
    </section>
  )
}
