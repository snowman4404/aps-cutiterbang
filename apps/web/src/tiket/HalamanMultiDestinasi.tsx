import type { FormEvent } from 'react'
import { bolehHapusSegmen, bolehTambahSegmen } from '@cutiterbang/domain'
import { formatTanggal } from '../lib/tanggal.ts'
import { Alert, Button, Card, Field, Input, JudulBagian, LinkTombol, PageTitle } from '../ui/index.ts'
import { DaftarPenerbangan } from './KartuPenerbangan.tsx'
import { PilihKota } from './PilihKota.tsx'
import { useMultiDestinasi } from './useMultiDestinasi.ts'

// US-4 (Member): Formulir Multi-destinasi + Hasil per Segmen. Pengambilan data dan sinkronisasi URL ada di
// `useMultiDestinasi`; halaman ini hanya menampilkan.
export default function HalamanMultiDestinasi() {
  const { kota, pesanKota, segmen, ubahIsian, tambahSegmen, hapusSegmen, cari, galat, pesan, sibuk, segmenDicari, hasil } =
    useMultiDestinasi()
  const namaKota = (id: string) => kota?.find((k) => String(k.id) === id)?.nama ?? id

  function kirimPencarian(event: FormEvent) {
    event.preventDefault()
    cari()
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Setiap segmen dicari sendiri: penerbangan yang belum berangkat dan masih punya kursi, urut harga termurah.">
        Multi-destinasi
      </PageTitle>
      <form onSubmit={kirimPencarian} noValidate className="flex flex-col gap-4">
        {segmen.map((isian, i) => (
          <Card key={i}>
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-4 text-sm font-semibold text-ink">Segmen {i + 1}</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <PilihKota
                  label="Kota asal"
                  name={`asal-${i}`}
                  placeholder="Pilih kota asal"
                  nilai={isian.asal}
                  daftar={kota}
                  galat={galat[i]?.asal}
                  onPilih={(id) => ubahIsian(i, 'asal', id)}
                />
                <PilihKota
                  label="Kota tujuan"
                  name={`tujuan-${i}`}
                  placeholder="Pilih kota tujuan"
                  nilai={isian.tujuan}
                  daftar={kota}
                  galat={galat[i]?.tujuan}
                  onPilih={(id) => ubahIsian(i, 'tujuan', id)}
                />
                <Field label="Tanggal keberangkatan" galat={galat[i]?.tanggal}>
                  {(kontrol) => (
                    <Input {...kontrol} type="date" name={`tanggal-${i}`} value={isian.tanggal} onChange={(event) => ubahIsian(i, 'tanggal', event.target.value)} />
                  )}
                </Field>
              </div>
              {bolehHapusSegmen(segmen.length) && (
                <div>
                  <Button varian="ghost" ukuran="sm" aria-label={`Hapus segmen ${i + 1}`} onClick={() => hapusSegmen(i)}>
                    Hapus segmen
                  </Button>
                </div>
              )}
            </fieldset>
          </Card>
        ))}
        <div className="flex flex-wrap gap-3">
          {bolehTambahSegmen(segmen.length) && (
            <Button varian="secondary" onClick={tambahSegmen}>
              Tambah segmen
            </Button>
          )}
          <Button type="submit" varian="primary" disabled={sibuk}>
            Cari
          </Button>
        </div>
      </form>

      {pesanKota && <Alert varian="negative">{pesanKota}</Alert>}
      {pesan && <Alert varian="negative">{pesan}</Alert>}
      {hasil &&
        hasil.map((hasilSegmen, i) => {
          const dicari = segmenDicari[i]
          return (
            <section key={i} aria-label={`Hasil segmen ${i + 1}`} data-testid="hasil-segmen" className="flex flex-col gap-3">
              <JudulBagian>
                Segmen {i + 1}: {dicari ? `${namaKota(dicari.asal)} → ${namaKota(dicari.tujuan)}, ${formatTanggal(dicari.tanggal)}` : ''}
              </JudulBagian>
              {/* Langkah 5: jumlah penerbangan selalu tampil per segmen, juga 0 (4a menambah pesan di bawahnya). */}
              <p className="text-sm text-muted num" data-testid="jumlah-penerbangan">
                {hasilSegmen.jumlah} penerbangan ditemukan
              </p>
              <DaftarPenerbangan
                daftar={hasilSegmen.penerbangan}
                label={`Penerbangan segmen ${i + 1}`}
                aksi={(penerbangan) => (
                  <LinkTombol to={`/pesan/${penerbangan.id}`} varian="primary" ukuran="sm" aria-label={`Pesan ${penerbangan.nomorPenerbangan}`}>
                    Pesan
                  </LinkTombol>
                )}
              />
            </section>
          )
        })}
    </section>
  )
}
