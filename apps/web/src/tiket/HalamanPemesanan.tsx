import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import {
  hariIniWib,
  PESAN_DATA_PENUMPANG_TIDAK_LENGKAP,
  PESAN_KURSI_HABIS,
  validasiDataPenumpang,
  type DataWajib,
  type GalatDataWajib,
  type InformasiPenerbangan,
  type KolomDataWajib,
  type TiketSaya,
} from '@cutiterbang/domain'
import { useAuth } from '../akses/AuthContext.tsx'
import { panggil } from '../lib/api.ts'
import { formatTanggal } from '../lib/tanggal.ts'
import { useAksi } from '../lib/useAksi.ts'
import { PESAN_GALAT_UMUM, useMuat } from '../lib/useMuat.ts'
import { Alert, Button, Card, JudulBagian, LinkTombol, Memuat, PageTitle } from '../ui/index.ts'
import { KOLOM, KolomFormulirDataWajib, type IsianDataWajib } from './FormulirDataWajib.tsx'
import { InfoPenerbangan } from './InfoPenerbangan.tsx'

// US-2a di sisi web (boundary Halaman Pemesanan): formulir data penumpang wajib (langkah 3-4), ringkasan (5),
// konfirmasi (6), lalu ke Tiket Saya (10). Validasi memakai fungsi domain yang sama dengan API (7, 7a); 7b = 409.
// Urutan mengikuti spesifikasi: formulir dan ringkasan selalu tampil untuk penerbangan yang dikenal; "Kursi sudah habis"
// baru muncul setelah konfirmasi.
export default function HalamanPemesanan() {
  const { idPenerbangan } = useParams()
  const { akun } = useAuth()
  const navigate = useNavigate()
  // US-6c 4a: dibuka dari tampilan perbandingan; hanya alamat /penerbangan internal yang diterima.
  const asal = (useLocation().state as { kembali?: unknown } | null)?.kembali
  const kembali = typeof asal === 'string' && asal.startsWith('/penerbangan') ? asal : null
  const { data, galat: galatMuat, memuat } = useMuat<{ penerbangan: InformasiPenerbangan }>(`/penerbangan/${idPenerbangan}`)

  const [isian, setIsian] = useState<IsianDataWajib>({
    namaLengkap: akun?.nama ?? '',
    nomorIdentitas: '',
    tanggalLahir: '',
    nomorTelepon: '',
    email: akun?.email ?? '',
  })
  const [galat, setGalat] = useState<GalatDataWajib>({}) // tandaiKolomSalah (7a)
  const [ringkasan, setRingkasan] = useState<DataWajib | null>(null) // data yang sudah valid, ditampilkan di ringkasan
  const [tidakLengkap, setTidakLengkap] = useState(false) // 7a: pesan "Data penumpang wajib tidak lengkap"
  const [pesan, setPesan] = useState('') // tampilkanPesan (7b dan galat lain)
  const { sibuk, jalankan } = useAksi(setPesan)

  const penerbangan = data?.penerbangan
  const ubah = (kolom: KolomDataWajib, nilai: string) => {
    setIsian((isianLama) => ({ ...isianLama, [kolom]: nilai }))
    setGalat((galatLama) => ({ ...galatLama, [kolom]: undefined }))
  }

  function lanjut(event: FormEvent) {
    event.preventDefault()
    const hasil = validasiDataPenumpang(isian, hariIniWib())
    if ('galat' in hasil) {
      setGalat(hasil.galat)
      setTidakLengkap(true)
      return
    }
    setGalat({})
    setTidakLengkap(false)
    setPesan('')
    setRingkasan(hasil.data)
  }

  const konfirmasi = () =>
    jalankan(async () => {
      if (!ringkasan || !penerbangan) return
      setPesan('')
      const respons = await panggil<{ pemesanan?: TiketSaya; galat?: GalatDataWajib; pesan?: string }>('/pemesanan', {
        body: { idPenerbangan: penerbangan.id, dataPenumpang: ringkasan },
      })
      if (respons.status === 201 && respons.data.pemesanan) {
        void navigate(`/tiket-saya?baru=${encodeURIComponent(respons.data.pemesanan.kode)}`)
      } else if (respons.status === 400 && respons.data.galat) {
        setGalat(respons.data.galat) // 7a: kembali ke langkah 4 dengan kolom yang salah ditandai
        setTidakLengkap(true)
        setRingkasan(null)
      } else {
        setPesan(respons.data.pesan ?? PESAN_GALAT_UMUM) // 7b: "Kursi sudah habis"; pemesanan tidak dibuat
      }
    })

  if (memuat) return <Memuat />
  if (!penerbangan) return <Alert varian="negative">{galatMuat}</Alert>

  const kursiHabis = pesan === PESAN_KURSI_HABIS // 7b: use case berakhir gagal

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <PageTitle finding={<>Isi data penumpang, periksa ringkasan, lalu konfirmasi. Kursi dijamin setelah pemesanan dibuat.</>}>
        Pesan Tiket
      </PageTitle>
      {kembali && (
        <div>
          <LinkTombol to={kembali} varian="secondary" ukuran="sm">
            Kembali ke perbandingan
          </LinkTombol>
        </div>
      )}

      <Card>
        <InfoPenerbangan penerbangan={penerbangan} />
      </Card>

      {pesan && <Alert varian="negative">{pesan}</Alert>}
      {tidakLengkap && !kursiHabis && <Alert varian="negative">{PESAN_DATA_PENUMPANG_TIDAK_LENGKAP}</Alert>}

      {kursiHabis ? (
        <div>
          <LinkTombol to="/penerbangan" varian="secondary">
            Cari penerbangan lain
          </LinkTombol>
        </div>
      ) : ringkasan ? (
        <Card className="flex flex-col gap-4" aria-label="Ringkasan pemesanan">
          <JudulBagian>Ringkasan pemesanan</JudulBagian>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-ringkasan">
            {KOLOM.map((kolom) => (
              <div key={kolom.nama} className="contents">
                <dt className="text-muted">{kolom.label}</dt>
                <dd data-testid={`ringkasan-${kolom.nama}`}>
                  {kolom.nama === 'tanggalLahir' ? formatTanggal(ringkasan[kolom.nama]) : ringkasan[kolom.nama]}
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
            <JudulBagian>Data penumpang</JudulBagian>
            <KolomFormulirDataWajib isian={isian} galat={galat} onUbah={ubah} />
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
