import type { FormEvent } from 'react'
import { punyaPeran } from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { Alert, Button, Card, Field, Input, LinkTombol, PageTitle } from '../ui/index.ts'
import { HasilAlatMember } from './HasilAlatMember.tsx'
import { DaftarPenerbangan } from './KartuPenerbangan.tsx'
import { PilihKota } from './PilihKota.tsx'
import { useCariPenerbangan } from './useCariPenerbangan.ts'

// US-3: Formulir Pencarian + Halaman Hasil Pencarian (tanpa login). Member juga mendapat alat US-6a/6b/6c (`HasilAlatMember`). Pengambilan data dan sinkronisasi URL
// ada di `useCariPenerbangan`; halaman ini hanya menampilkan.
export default function HalamanCariPenerbangan() {
  const { kota, pesanKota, isian, ubahIsian, cari, galat, pesan, sibuk, hasil, kunciPencarian } = useCariPenerbangan()
  const { akun, memuat } = useAuth()
  // Pesan hanya untuk yang belum login atau berperan CalonPenumpang (Member juga); peran lain tidak memesan tiket.
  // US-6a/6b/6c: alat saring jam, urutkan harga dan bandingkan hanya untuk Member yang sudah masuk (G12).
  const adalahMember = !memuat && akun?.peran === 'MemberFrequentTraveller'
  const bolehPesan = !memuat && (akun === null || punyaPeran(akun.peran, ['CalonPenumpang']))

  function kirimPencarian(event: FormEvent) {
    event.preventDefault()
    cari()
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Penerbangan yang belum berangkat dan masih punya kursi, urut keberangkatan paling awal.">
        Cari Penerbangan
      </PageTitle>
      <Card>
        <form onSubmit={kirimPencarian} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2 desk:grid-cols-cari desk:items-start">
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
          <div className="sm:col-span-2 desk:col-span-1 desk:pt-label-field">
            <Button type="submit" varian="primary" disabled={sibuk}>
              Cari
            </Button>
          </div>
        </form>
      </Card>

      {pesanKota && <Alert varian="negative">{pesanKota}</Alert>}
      {pesan && <Alert varian="negative">{pesan}</Alert>}
      {hasil &&
        (adalahMember ? (
          <HasilAlatMember key={kunciPencarian} hasil={hasil} />
        ) : (
          <DaftarPenerbangan
            daftar={hasil}
            label="Hasil pencarian penerbangan"
            aksi={(penerbangan) =>
              bolehPesan && (
                <LinkTombol to={`/pesan/${penerbangan.id}`} varian="primary" ukuran="sm" aria-label={`Pesan ${penerbangan.nomorPenerbangan}`}>
                  Pesan
                </LinkTombol>
              )
            }
          />
        ))}
    </section>
  )
}
