import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  hariIniWib,
  PESAN_KURSI_HABIS,
  validasiDataPenumpang,
  type DataWajib,
  type GalatDataWajib,
  type InformasiPenerbangan,
  type KolomDataWajib,
  type TiketSaya,
} from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { panggil } from '../akses/api.ts'
import { formatTanggal } from '../lib/tanggal.ts'
import { PESAN_GALAT_UMUM, useMuat } from '../lib/useMuat.ts'
import { Alert, Button, Card, Field, Input, LinkTombol, PageTitle } from '../ui/index.ts'
import { InfoPenerbangan } from './InfoPenerbangan.tsx'

type Isian = Record<KolomDataWajib, string>

const KOLOM: { nama: KolomDataWajib; label: string; petunjuk?: string; jenis?: string; mode?: 'numeric' }[] = [
  { nama: 'namaLengkap', label: 'Nama lengkap', petunjuk: 'Sesuai kartu identitas, maksimal 100 karakter' },
  { nama: 'nomorIdentitas', label: 'Nomor identitas', petunjuk: '16 digit', mode: 'numeric' },
  { nama: 'tanggalLahir', label: 'Tanggal lahir', jenis: 'date' },
  { nama: 'nomorTelepon', label: 'Nomor telepon', petunjuk: '10 sampai 13 digit', jenis: 'tel', mode: 'numeric' },
  { nama: 'email', label: 'Email', jenis: 'email' },
]

// US-2a di sisi web (boundary Halaman Pemesanan): formulir data penumpang wajib (langkah 3-4), ringkasan (5),
// konfirmasi (6), lalu ke Tiket Saya (10). Validasi memakai fungsi domain yang sama dengan API (7, 7a); 7b = 409.
export default function HalamanPemesanan() {
  const { idPenerbangan } = useParams()
  const { akun } = useAuth()
  const navigate = useNavigate()
  const { data, galat: galatMuat, memuat } = useMuat<{ penerbangan: InformasiPenerbangan }>(`/penerbangan/${idPenerbangan}`)

  const [isian, setIsian] = useState<Isian>({
    namaLengkap: akun?.nama ?? '',
    nomorIdentitas: '',
    tanggalLahir: '',
    nomorTelepon: '',
    email: akun?.email ?? '',
  })
  const [galat, setGalat] = useState<GalatDataWajib>({}) // tandaiKolomSalah (7a)
  const [ringkasan, setRingkasan] = useState<DataWajib | null>(null) // data yang sudah valid, ditampilkan di ringkasan
  const [pesan, setPesan] = useState('') // tampilkanPesan (7b dan galat lain)
  const [sibuk, setSibuk] = useState(false)

  const penerbangan = data?.penerbangan
  const ubah = (k: KolomDataWajib, nilai: string) => {
    setIsian((s) => ({ ...s, [k]: nilai }))
    setGalat((g) => ({ ...g, [k]: undefined }))
  }

  function lanjut(e: FormEvent) {
    e.preventDefault()
    const hasil = validasiDataPenumpang(isian, hariIniWib())
    if ('galat' in hasil) return setGalat(hasil.galat)
    setGalat({})
    setPesan('')
    setRingkasan(hasil.data)
  }

  async function konfirmasi() {
    if (!ringkasan || !penerbangan) return
    setSibuk(true)
    setPesan('')
    try {
      const r = await panggil<{ pemesanan?: TiketSaya; galat?: GalatDataWajib; pesan?: string }>('/pemesanan', {
        body: { idPenerbangan: penerbangan.id, dataPenumpang: ringkasan },
      })
      if (r.status === 201 && r.data.pemesanan) {
        void navigate(`/tiket-saya?baru=${encodeURIComponent(r.data.pemesanan.kode)}`)
      } else if (r.status === 400 && r.data.galat) {
        setGalat(r.data.galat) // 7a: kembali ke langkah 4 dengan kolom yang salah ditandai
        setRingkasan(null)
      } else {
        setPesan(r.data.pesan ?? PESAN_GALAT_UMUM) // 7b: "Kursi sudah habis"; pemesanan tidak dibuat
      }
    } catch {
      setPesan(PESAN_GALAT_UMUM)
    } finally {
      setSibuk(false)
    }
  }

  if (memuat) return <p className="text-muted">Memuat…</p>
  if (!penerbangan) return <Alert varian="negative">{galatMuat}</Alert>

  const kursiHabis = !penerbangan.tersedia || pesan === PESAN_KURSI_HABIS

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <PageTitle finding={<>Isi data penumpang, periksa ringkasan, lalu konfirmasi. Kursi dijamin setelah pemesanan dibuat.</>}>
        Pesan Tiket
      </PageTitle>

      <Card>
        <InfoPenerbangan f={penerbangan} />
      </Card>

      {pesan && <Alert varian="negative">{pesan}</Alert>}
      {!pesan && !penerbangan.tersedia && <Alert varian="negative">{PESAN_KURSI_HABIS}</Alert>}

      {kursiHabis ? (
        <div>
          <LinkTombol to="/penerbangan" varian="secondary">
            Cari penerbangan lain
          </LinkTombol>
        </div>
      ) : ringkasan ? (
        <Card className="flex flex-col gap-4" aria-label="Ringkasan pemesanan">
          <h2 className="text-lg font-semibold">Ringkasan pemesanan</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[180px_1fr]">
            {KOLOM.map((k) => (
              <div key={k.nama} className="contents">
                <dt className="text-muted">{k.label}</dt>
                <dd data-testid={`ringkasan-${k.nama}`}>
                  {k.nama === 'tanggalLahir' ? formatTanggal(ringkasan[k.nama]) : ringkasan[k.nama]}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-3">
            <Button varian="primary" disabled={sibuk} onClick={() => void konfirmasi()}>
              Konfirmasi pemesanan
            </Button>
            <Button varian="secondary" disabled={sibuk} onClick={() => setRingkasan(null)}>
              Ubah data
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <form onSubmit={lanjut} noValidate className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Data penumpang</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {KOLOM.map((k) => (
                <Field key={k.nama} label={k.label} petunjuk={k.petunjuk} galat={galat[k.nama]}>
                  {(p) => (
                    <Input
                      {...p}
                      name={k.nama}
                      type={k.jenis ?? 'text'}
                      inputMode={k.mode}
                      value={isian[k.nama]}
                      onChange={(e) => ubah(k.nama, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
            <div>
              <Button type="submit" varian="primary">
                Lanjut
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  )
}
