import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  hariIniWib,
  KOLOM_DATA_WAJIB,
  LABEL_STATUS_PROFIL,
  validasiProfil,
  type GalatDataWajib,
  type KolomDataWajib,
  type ProfilDto,
} from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { useAksi } from '../lib/useAksi.ts'
import { PESAN_GALAT_UMUM, useMuat } from '../lib/useMuat.ts'
import { Alert, Button, Card, JudulBagian, Memuat, PageTitle, Pill } from '../ui/index.ts'
import { KolomFormulirDataWajib, type IsianDataWajib } from './FormulirDataWajib.tsx'
import { VARIAN_STATUS_PROFIL } from './format.ts'

const keIsian = (data: ProfilDto['data']): IsianDataWajib =>
  Object.fromEntries(KOLOM_DATA_WAJIB.map((kolom) => [kolom, data[kolom] ?? ''])) as IsianDataWajib

// US-5a di sisi web (boundary Halaman Profil): langkah 1 menampilkan data terakhir disimpan, kolom wajib bertanda dan
// status profil; langkah 2-3 mengubah lalu menyimpan; 4a menandai kolom terisi yang salah; 7 pesan berhasil + status baru.
// Validasi format memakai fungsi domain yang sama dengan API (hanya kolom terisi).
export default function HalamanProfil() {
  const { data, galat: galatMuat, memuat } = useMuat<{ profil: ProfilDto }>('/profil')
  if (memuat) return <Memuat />
  if (!data) return <Alert varian="negative">{galatMuat}</Alert>
  return <FormulirProfil awal={data.profil} />
}

function FormulirProfil({ awal }: { awal: ProfilDto }) {
  const [isian, setIsian] = useState<IsianDataWajib>(keIsian(awal.data))
  const [status, setStatus] = useState(awal.status)
  const [galat, setGalat] = useState<GalatDataWajib>({}) // tandaiKolomSalah (4a)
  const [pesan, setPesan] = useState('') // tampilkanPesan (7)
  const [galatUmum, setGalatUmum] = useState('')
  const { sibuk, jalankan } = useAksi(setGalatUmum)

  const ubah = (kolom: KolomDataWajib, nilai: string) => {
    setIsian((lama) => ({ ...lama, [kolom]: nilai }))
    setGalat((lama) => ({ ...lama, [kolom]: undefined }))
    setPesan('')
  }

  function simpan(event: FormEvent) {
    event.preventDefault()
    setPesan('')
    setGalatUmum('')
    const hasil = validasiProfil(isian, hariIniWib())
    if ('galat' in hasil) {
      setGalat(hasil.galat) // 4a: tidak ada yang dikirim; Member kembali ke langkah 2
      return
    }
    setGalat({})
    void jalankan(async () => {
      const respons = await panggil<{ pesan?: string; profil?: ProfilDto; galat?: GalatDataWajib }>('/profil', {
        method: 'PUT',
        body: isian,
      })
      if (respons.status === 200 && respons.data.profil) {
        setIsian(keIsian(respons.data.profil.data))
        setStatus(respons.data.profil.status)
        setPesan(respons.data.pesan ?? '')
      } else if (respons.status === 400 && respons.data.galat) {
        setGalat(respons.data.galat)
      } else {
        setGalatUmum(respons.data.pesan ?? PESAN_GALAT_UMUM)
      }
    })
  }

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <PageTitle finding={<>Lengkapi kelima data wajib agar profil dapat dipakai untuk memvalidasi tiket.</>}>Profil</PageTitle>

      {pesan && (
        <Alert varian="neutral" role="status">
          {pesan}
        </Alert>
      )}
      {galatUmum && <Alert varian="negative">{galatUmum}</Alert>}

      <Card>
        <form onSubmit={simpan} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <JudulBagian>Data profil</JudulBagian>
            <span className="flex items-center gap-2 text-sm text-muted">
              Status profil
              <span data-testid="status-profil">
                <Pill varian={VARIAN_STATUS_PROFIL[status]}>{LABEL_STATUS_PROFIL[status]}</Pill>
              </span>
            </span>
          </div>
          <KolomFormulirDataWajib isian={isian} galat={galat} onUbah={ubah} wajib />
          <div>
            <Button type="submit" varian="primary" disabled={sibuk}>
              Simpan
            </Button>
          </div>
        </form>
      </Card>
    </section>
  )
}
