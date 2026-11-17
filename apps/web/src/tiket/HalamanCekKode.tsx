import { useState } from 'react'
import type { FormEvent } from 'react'
import type { HasilCekKode } from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { formatTanggalDenganHari } from '../lib/tanggal.ts'
import { useAksi } from '../lib/useAksi.ts'
import { PESAN_GALAT_UMUM } from '../lib/useMuat.ts'
import { Alert, Button, Card, Field, Input, JudulBagian, Kode, PageTitle, Pill } from '../ui/index.ts'
import { VARIAN_STATUS_BOOKING } from './format.ts'

// US-9 di sisi web (boundary "Formulir Pemeriksaan Kode"): kode -> API (validasiIsianKode, normal, cariDenganKode, status,
// ringkasanPenerbangan) -> tampilkanStatus. Kode tetap terisi pada 4a; mengubahnya dan mengirim lagi tidak memuat ulang halaman.
export default function HalamanCekKode() {
  const [kode, setKode] = useState('')
  const [galatKode, setGalatKode] = useState('') // tandaiKolomSalah (2a)
  const [tolak, setTolak] = useState('') // tampilkanPesan (4a)
  const [hasil, setHasil] = useState<HasilCekKode | null>(null)
  const [galatUmum, setGalatUmum] = useState('')
  const { sibuk, jalankan } = useAksi(setGalatUmum)

  function kirim(event: FormEvent) {
    event.preventDefault()
    setGalatKode('')
    setTolak('')
    setGalatUmum('')
    setHasil(null) // data pemesanan tetap tersembunyi sampai kode terdaftar
    void jalankan(async () => {
      const respons = await panggil<{ status?: HasilCekKode; pesan?: string; galat?: { kode?: string } }>('/travel/cek-kode', { body: { kode } })
      if (respons.status === 200 && respons.data.status) setHasil(respons.data.status)
      else if (respons.status === 400 && respons.data.galat?.kode) setGalatKode(respons.data.galat.kode)
      else if (respons.status === 404 && respons.data.pesan) setTolak(respons.data.pesan)
      else setGalatUmum(respons.data.pesan ?? PESAN_GALAT_UMUM)
    })
  }

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <PageTitle finding="Pastikan pemesanan sudah terkonfirmasi sebelum tiket diserahkan kepada pengunjung.">Cek Kode Booking</PageTitle>

      <Card>
        <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
          <JudulBagian>Formulir pemeriksaan kode</JudulBagian>
          <div className="max-w-form">
            <Field label="Kode booking reference" galat={galatKode}>
              {(kontrol) => (
                <Input
                  {...kontrol}
                  name="kode"
                  value={kode}
                  onChange={(event) => {
                    setKode(event.target.value)
                    setGalatKode('')
                  }}
                />
              )}
            </Field>
          </div>
          <div>
            <Button type="submit" varian="primary" disabled={sibuk}>
              Periksa
            </Button>
          </div>
        </form>
      </Card>

      {galatUmum && <Alert varian="negative">{galatUmum}</Alert>}
      {tolak && <Alert varian="negative">{tolak}</Alert>}
      {hasil && (
        <Card className="flex flex-col gap-4" aria-label="Status booking">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span data-testid="kode">
              <Kode>{hasil.kode}</Kode>
            </span>
            <span data-testid="status">
              <Pill varian={VARIAN_STATUS_BOOKING[hasil.status]}>{hasil.label}</Pill>
            </span>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted">Nama penumpang</dt>
              <dd data-testid="penumpang">{hasil.penumpang.join(', ')}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted">Nomor penerbangan</dt>
              <dd className="num" data-testid="nomor-penerbangan">
                {hasil.nomorPenerbangan}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-muted">Tanggal keberangkatan</dt>
              <dd data-testid="tanggal-keberangkatan">{formatTanggalDenganHari(hasil.tanggalKeberangkatan)}</dd>
            </div>
          </dl>
        </Card>
      )}
    </section>
  )
}
