import type { FormEvent } from 'react'
import { PESAN_PENERBANGAN_TIDAK_DITEMUKAN } from '@cutiterbang/domain'
import { formatTanggalDenganHari } from '../lib/tanggal.ts'
import { Alert, Button, Card, EmptyState, Field, Input, PageTitle } from '../ui/index.ts'
import { formatHarga, formatWaktu } from './format.ts'
import { PilihKota } from './PilihKota.tsx'
import { useCariPenerbangan } from './useCariPenerbangan.ts'

// US-3: Formulir Pencarian + Halaman Hasil Pencarian (tanpa login). Pengambilan data dan sinkronisasi URL
// ada di `useCariPenerbangan`; halaman ini hanya menampilkan.
export default function HalamanCariPenerbangan() {
  const { kota, pesanKota, isian, ubahIsian, cari, galat, pesan, sibuk, hasil } = useCariPenerbangan()

  function kirim(e: FormEvent) {
    e.preventDefault()
    cari()
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Penerbangan yang belum berangkat dan masih punya kursi, urut keberangkatan paling awal.">
        Cari Penerbangan
      </PageTitle>
      <Card>
        <form onSubmit={kirim} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2 desk:grid-cols-[1fr_1fr_200px_auto] desk:items-start">
          <PilihKota
            label="Kota asal"
            name="asal"
            placeholder="Pilih kota asal"
            nilai={isian.asal}
            daftar={kota}
            galat={galat.asal}
            onPilih={(id) => ubahIsian('asal', id)}
          />
          <PilihKota
            label="Kota tujuan"
            name="tujuan"
            placeholder="Pilih kota tujuan"
            nilai={isian.tujuan}
            daftar={kota}
            galat={galat.tujuan}
            onPilih={(id) => ubahIsian('tujuan', id)}
          />
          <Field label="Tanggal keberangkatan" galat={galat.tanggal}>
            {(p) => (
              <Input {...p} type="date" name="tanggal" value={isian.tanggal} onChange={(e) => ubahIsian('tanggal', e.target.value)} />
            )}
          </Field>
          <div className="sm:col-span-2 desk:col-span-1 desk:pt-[22px]">
            <Button type="submit" varian="primary" disabled={sibuk}>
              Cari
            </Button>
          </div>
        </form>
      </Card>

      {pesanKota && <Alert varian="negative">{pesanKota}</Alert>}
      {pesan && <Alert varian="negative">{pesan}</Alert>}
      {hasil &&
        (hasil.length === 0 ? (
          <EmptyState>{PESAN_PENERBANGAN_TIDAK_DITEMUKAN}</EmptyState>
        ) : (
          <ul aria-label="Hasil pencarian penerbangan" className="flex flex-col gap-3">
            {hasil.map((f) => (
              <li key={f.id} data-testid="penerbangan">
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-ink">{f.maskapai}</span>
                    <span className="text-sm text-muted num">{f.nomorPenerbangan}</span>
                    <span className="text-sm text-muted">{formatTanggalDenganHari(f.tanggalKeberangkatan)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted">
                      {f.asal.nama} → {f.tujuan.nama}
                    </span>
                    <span className="text-ink num">
                      <span data-testid="berangkat">{formatWaktu(f.waktuBerangkat, f.asal.zonaWaktu)}</span>
                      {' → '}
                      <span data-testid="tiba">{formatWaktu(f.waktuTiba, f.tujuan.zonaWaktu)}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:items-end">
                    <span className="font-medium text-ink num" data-testid="harga">
                      {formatHarga(f.harga)}
                    </span>
                    <span className="text-sm text-muted num" data-testid="sisa-kursi">
                      Sisa {f.sisaKursi} kursi
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
