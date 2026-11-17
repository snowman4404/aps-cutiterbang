import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { validasiPeriode, type GalatPeriode, type StatusPengajuanCuti } from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
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

  async function tampilkan(event: FormEvent) {
    event.preventDefault()
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
    let respons
    try {
      respons = await panggil<Hasil & { galat?: GalatPeriode; pesan?: string }>(
        `/cuti/pengajuan?mulai=${encodeURIComponent(lokal.periode.mulai)}&akhir=${encodeURIComponent(lokal.periode.akhir)}`,
      )
    } catch {
      respons = null
    }
    if (nomor !== permintaanTerakhir.current) return
    setSibuk(false)
    if (respons?.status === 200) setHasil(respons.data)
    else {
      setGalat(respons?.data.galat ?? {})
      if (!respons?.data.galat) setPesanGalat(respons?.data.pesan ?? PESAN_GALAT_UMUM)
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
              {(kontrol) => <Input {...kontrol} type="date" name="mulai" value={mulai} onChange={(event) => setMulai(event.target.value)} />}
            </Field>
          </div>
          <div className="sm:w-kolom-tanggal">
            <Field label="Tanggal akhir" galat={galat.akhir}>
              {(kontrol) => <Input {...kontrol} type="date" name="akhir" value={akhir} onChange={(event) => setAkhir(event.target.value)} />}
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
              {hasil.pengajuan.map((pengajuan) => (
                <tr key={pengajuan.id}>
                  <td data-label="Nama pegawai">{pengajuan.namaPegawai}</td>
                  <td data-label="Tanggal mulai">{formatTanggal(pengajuan.tanggalMulai)}</td>
                  <td data-label="Tanggal akhir">{formatTanggal(pengajuan.tanggalAkhir)}</td>
                  <td className="num" data-label="Lama cuti">{formatLama(pengajuan.lamaCuti)}</td>
                  <td data-label="Status">
                    <Pill varian={VARIAN_STATUS[pengajuan.status]}>{pengajuan.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ))}
    </section>
  )
}
