import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { validasiPeriode, type GalatPeriode, type StatusPengajuanCuti } from '@cutiterbang/domain'
import { panggil } from '../akses/api.ts'
import { PESAN_GALAT_UMUM } from '../lib/useMuat.ts'
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
  const permintaanTerakhir = useRef(0) // hanya respons permintaan terbaru yang boleh tampil

  async function tampilkan(e: FormEvent) {
    e.preventDefault()
    const nomor = ++permintaanTerakhir.current
    setPesanGalat('')
    setHasil(null) // hasil pencarian sebelumnya dihapus begitu pencarian baru dimulai
    const lokal = validasiPeriode({ mulai, akhir })
    if ('galat' in lokal) {
      setGalat(lokal.galat)
      setSibuk(false)
      return
    }
    setGalat({})
    setSibuk(true)
    let r
    try {
      r = await panggil<Hasil & { galat?: GalatPeriode; pesan?: string }>(
        `/cuti/pengajuan?mulai=${encodeURIComponent(lokal.periode.mulai)}&akhir=${encodeURIComponent(lokal.periode.akhir)}`,
      )
    } catch {
      r = null
    }
    if (nomor !== permintaanTerakhir.current) return
    setSibuk(false)
    if (r?.status === 200) setHasil(r.data)
    else {
      setGalat(r?.data.galat ?? {})
      if (!r?.data.galat) setPesanGalat(r?.data.pesan ?? PESAN_GALAT_UMUM)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Pengajuan berstatus Diajukan atau Disetujui yang beririsan dengan periode.">
        Pengajuan Cuti
      </PageTitle>
      <Card>
        <form onSubmit={tampilkan} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="sm:w-kolom-tanggal">
            <Field label="Tanggal mulai" galat={galat.mulai}>
              {(p) => <Input {...p} type="date" name="mulai" value={mulai} onChange={(e) => setMulai(e.target.value)} />}
            </Field>
          </div>
          <div className="sm:w-kolom-tanggal">
            <Field label="Tanggal akhir" galat={galat.akhir}>
              {(p) => <Input {...p} type="date" name="akhir" value={akhir} onChange={(e) => setAkhir(e.target.value)} />}
            </Field>
          </div>
          <div className="sm:pt-label-field">
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
