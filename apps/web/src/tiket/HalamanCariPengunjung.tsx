import type { FormEvent } from 'react'
import { Alert, Button, Card, Field, Input, LinkTombol, PageTitle } from '../ui/index.ts'
import { DaftarPenerbangan } from './KartuPenerbangan.tsx'
import { PilihKota } from './PilihKota.tsx'
import { useCariPengunjung } from './useCariPenerbangan.ts'

// US-8a: Formulir Pencarian Pengunjung + Hasil Pencarian Pengunjung (hanya Manajer Travel). Pengambilan data dan sinkronisasi URL
// ada di `useCariPengunjung` (useCariPenerbangan.ts); halaman ini hanya menampilkan. Extension point "hasil pencarian": tombol "Pesan untuk pengunjung" (US-8b).
export default function HalamanCariPengunjung() {
  const { kota, pesanKota, isian, ubahIsian, cari, galat, pesan, sibuk, hasil, isianUrl } = useCariPengunjung()

  function kirimPencarian(event: FormEvent) {
    event.preventDefault()
    cari()
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Penerbangan yang belum berangkat dan kursinya cukup untuk semua penumpang, urut keberangkatan paling awal.">
        Cari untuk Pengunjung
      </PageTitle>
      <Card>
        <form
          onSubmit={kirimPencarian}
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 desk:grid-cols-cari-pengunjung desk:items-start"
        >
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
            {(kontrol) => (
              <Input {...kontrol} type="date" name="tanggal" value={isian.tanggal} onChange={(event) => ubahIsian('tanggal', event.target.value)} />
            )}
          </Field>
          <Field label="Jumlah penumpang" galat={galat.jumlah}>
            {(kontrol) => (
              <Input
                {...kontrol}
                type="text"
                inputMode="numeric"
                name="jumlah"
                value={isian.jumlah}
                onChange={(event) => ubahIsian('jumlah', event.target.value)}
              />
            )}
          </Field>
          <div className="sm:col-span-2 desk:col-span-1 desk:pt-label-field">
            <Button type="submit" varian="primary" disabled={sibuk}>
              Cari
            </Button>
          </div>
        </form>
      </Card>

      {pesanKota && <Alert varian="negative">{pesanKota}</Alert>}
      {pesan && <Alert varian="negative">{pesan}</Alert>}
      {hasil && (
        <DaftarPenerbangan
          daftar={hasil}
          label="Hasil pencarian untuk pengunjung"
          aksi={(penerbangan) => (
            <LinkTombol
              to={`/travel/pesan/${penerbangan.id}?jumlah=${encodeURIComponent(isianUrl.jumlah)}`}
              varian="primary"
              ukuran="sm"
              aria-label={`Pesan untuk pengunjung ${penerbangan.nomorPenerbangan}`}
            >
              Pesan untuk pengunjung
            </LinkTombol>
          )}
        />
      )}
    </section>
  )
}
