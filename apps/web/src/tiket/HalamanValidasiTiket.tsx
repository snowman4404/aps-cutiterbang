import { useState } from 'react'
import type { FormEvent } from 'react'
import type { HasilValidasiTiket, PerjalananTercatat } from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { useAksi } from '../lib/useAksi.ts'
import { PESAN_GALAT_UMUM, useMuat } from '../lib/useMuat.ts'
import { Alert, Button, Card, EmptyState, Field, Input, JudulBagian, Kode, Memuat, PageTitle, Pill } from '../ui/index.ts'
import { VARIAN_STATUS_BOOKING } from './format.ts'
import { InfoPenerbangan } from './InfoPenerbangan.tsx'

type Tampilan =
  | { jenis: 'ditolak'; pesan: string } // 3a, 4a, 5a
  | { jenis: 'hasil'; hasil: HasilValidasiTiket } // 6a, 7, 8a

// US-5b di sisi web (boundary Formulir Validasi Tiket): kode -> API (validasiIsianKode, statusProfil, cariDenganKode,
// cocokDengan, catatPerjalanan) -> tampilkanHasil. Pada 6a jawaban tidak memuat data penumpang, jadi tidak ada yang ditampilkan.
export default function HalamanValidasiTiket() {
  const [kode, setKode] = useState('')
  const [galatKode, setGalatKode] = useState('') // tandaiKolomSalah (2a)
  const [tampilan, setTampilan] = useState<Tampilan | null>(null)
  const [galatUmum, setGalatUmum] = useState('')
  const { sibuk, jalankan } = useAksi(setGalatUmum)
  const perjalanan = useMuat<{ perjalanan: PerjalananTercatat[] }>('/validasi-tiket/perjalanan') // dimuat ulang setelah validasi

  function kirim(event: FormEvent) {
    event.preventDefault()
    setGalatKode('')
    setGalatUmum('')
    setTampilan(null)
    void jalankan(async () => {
      const respons = await panggil<HasilValidasiTiket & { pesan?: string; galat?: { kode?: string } }>('/validasi-tiket', {
        body: { kode },
      })
      if (respons.status === 400 && respons.data.galat?.kode) {
        setGalatKode(respons.data.galat.kode)
      } else if (respons.status === 200 && 'hasil' in respons.data) {
        setTampilan({ jenis: 'hasil', hasil: respons.data })
        perjalanan.muatUlang()
      } else if (respons.data.pesan && (respons.status === 404 || respons.status === 409)) {
        setTampilan({ jenis: 'ditolak', pesan: respons.data.pesan })
      } else {
        setGalatUmum(respons.data.pesan ?? PESAN_GALAT_UMUM)
      }
    })
  }

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <PageTitle finding={<>Masukkan kode booking reference untuk mencatat perjalanan pada keanggotaan Anda.</>}>
        Validasi Tiket
      </PageTitle>

      <Card>
        <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
          <JudulBagian>Formulir validasi tiket</JudulBagian>
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
              Validasi
            </Button>
          </div>
        </form>
      </Card>

      {galatUmum && <Alert varian="negative">{galatUmum}</Alert>}
      {tampilan?.jenis === 'ditolak' && <Alert varian="negative">{tampilan.pesan}</Alert>}
      {tampilan?.jenis === 'hasil' && tampilan.hasil.hasil === 'tidakValid' && (
        <Card className="flex flex-col gap-2" aria-label="Hasil validasi">
          <div>
            <Pill varian="negative">tidak valid</Pill>
          </div>
          <p>{tampilan.hasil.pesan}</p>
        </Card>
      )}
      {tampilan?.jenis === 'hasil' && tampilan.hasil.hasil === 'valid' && (
        <Card className="flex flex-col gap-3" aria-label="Hasil validasi">
          <div className="flex flex-wrap items-center gap-2">
            <Pill varian="positive">valid</Pill>
            <Kode>{tampilan.hasil.perjalanan.kode}</Kode>
          </div>
          {tampilan.hasil.pesan && <p>{tampilan.hasil.pesan}</p>}
          <InfoPenerbangan penerbangan={tampilan.hasil.perjalanan.penerbangan} />
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <JudulBagian>Perjalanan tercatat</JudulBagian>
        {perjalanan.memuat && !perjalanan.data ? (
          <Memuat />
        ) : !perjalanan.data ? (
          <Alert varian="negative">{perjalanan.galat}</Alert>
        ) : perjalanan.data.perjalanan.length === 0 ? (
          <EmptyState>Belum ada perjalanan tercatat</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Perjalanan tercatat">
            {perjalanan.data.perjalanan.map((p) => (
              <li key={p.kode}>
                <Card className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Kode>{p.kode}</Kode>
                    <Pill varian={VARIAN_STATUS_BOOKING[p.status]}>{p.status}</Pill>
                  </div>
                  <InfoPenerbangan penerbangan={p.penerbangan} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
