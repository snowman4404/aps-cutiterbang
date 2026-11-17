import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  LABEL_TERMURAH,
  PESAN_KURSI_HABIS,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  tandaiTermurah,
  type HasilPencarian,
  type InformasiPenerbangan,
} from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { formatTanggalDenganHari } from '../lib/tanggal.ts'
import { PESAN_GALAT_UMUM } from '../lib/useMuat.ts'
import { useAksi } from '../lib/useAksi.ts'
import { Alert, Button, Card, JudulBagian, Pill } from '../ui/index.ts'
import { formatHarga, formatWaktu } from './format.ts'

// Boundary "Tampilan Perbandingan" (US-6b, US-6c) dengan control PengendaliPerbandingan:
// `tampilkanPerbandingan(info, termurah)` = tampilan ini (info sudah disusun berdampingan oleh pemanggil;
// `termurah = tandaiTermurah(info)`), `tersedia()` + `bukaHalamanPemesanan(f)` = `pesan`, `tampilkanPesan(pesan)` = Alert.
// Penerbangan terpilih dan keadaan terbuka hidup di URL (pemanggil), jadi kembali dari halaman pemesanan memulihkannya (6c 4a).
export function TampilanPerbandingan({ info, onTutup }: { info: HasilPencarian[]; onTutup: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [pesan, setPesan] = useState('')
  const { sibuk, jalankan } = useAksi(setPesan)
  const termurah = tandaiTermurah(info)

  /** tersedia() lalu bukaHalamanPemesanan(f); tidak tersedia = "Kursi sudah habis" dan halaman pemesanan tetap tertutup (2a). */
  const pesanPenerbangan = (id: number) =>
    jalankan(async () => {
      setPesan('')
      const respons = await panggil<{ penerbangan?: InformasiPenerbangan }>(`/penerbangan/${id}`)
      // 4a: halaman pemesanan menerima alamat perbandingan ini sebagai tujuan "Kembali ke perbandingan".
      if (respons.status === 200 && respons.data.penerbangan?.tersedia)
        navigate(`/pesan/${id}`, { state: { kembali: `${location.pathname}${location.search}` } })
      else if (respons.status === 200) setPesan(PESAN_KURSI_HABIS)
      else if (respons.status === 404) setPesan(PESAN_PENERBANGAN_TIDAK_DITEMUKAN)
      else setPesan(PESAN_GALAT_UMUM)
    })

  return (
    <div className="flex flex-col gap-4" data-testid="tampilan-perbandingan">
      <div className="flex items-center justify-between gap-3">
        <JudulBagian>Perbandingan penerbangan</JudulBagian>
        <Button varian="secondary" ukuran="sm" onClick={onTutup}>
          Kembali ke hasil
        </Button>
      </div>
      {pesan && <Alert varian="negative">{pesan}</Alert>}
      <ul aria-label="Perbandingan penerbangan" className={`grid grid-cols-1 gap-3 ${info.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {info.map((penerbangan) => (
          <li key={penerbangan.id} data-testid="banding">
            <Card className="flex h-full flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-ink">{penerbangan.maskapai}</span>
                <span className="text-sm text-muted num">{penerbangan.nomorPenerbangan}</span>
                <span className="text-sm text-muted">{formatTanggalDenganHari(penerbangan.tanggalKeberangkatan)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted">
                  {penerbangan.asal.nama} → {penerbangan.tujuan.nama}
                </span>
                <span className="text-ink num">
                  <span data-testid="berangkat">{formatWaktu(penerbangan.waktuBerangkat, penerbangan.asal.zonaWaktu)}</span>
                  {' → '}
                  <span data-testid="tiba">{formatWaktu(penerbangan.waktuTiba, penerbangan.tujuan.zonaWaktu)}</span>
                </span>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium text-ink num" data-testid="harga">
                  {formatHarga(penerbangan.harga)}
                </span>
                {termurah.includes(penerbangan.id) && <Pill varian="positive">{LABEL_TERMURAH}</Pill>}
                <span className="text-sm text-muted num" data-testid="sisa-kursi">
                  Sisa {penerbangan.sisaKursi} kursi
                </span>
              </div>
              <div className="mt-auto">
                <Button varian="primary" ukuran="sm" disabled={sibuk} aria-label={`Pesan ${penerbangan.nomorPenerbangan}`} onClick={() => void pesanPenerbangan(penerbangan.id)}>
                  Pesan
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
