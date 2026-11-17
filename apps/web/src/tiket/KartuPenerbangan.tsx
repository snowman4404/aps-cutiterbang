import type { ReactNode } from 'react'
import { PESAN_PENERBANGAN_TIDAK_DITEMUKAN, type HasilPencarian } from '@cutiterbang/domain'
import { formatTanggalDenganHari } from '../lib/tanggal.ts'
import { Card, EmptyState } from '../ui/index.ts'
import { formatHarga, formatWaktu } from './format.ts'

// Satu baris hasil pencarian (US-3, US-4, US-6a/6b): informasi penerbangan; aksi (Pesan, Bandingkan) dititipkan lewat `children`.
export function KartuPenerbangan({ penerbangan, children }: { penerbangan: HasilPencarian; children?: ReactNode }) {
  return (
    <li data-testid="penerbangan">
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex flex-col gap-1 sm:items-end">
          <span className="font-medium text-ink num" data-testid="harga">
            {formatHarga(penerbangan.harga)}
          </span>
          <span className="text-sm text-muted num" data-testid="sisa-kursi">
            Sisa {penerbangan.sisaKursi} kursi
          </span>
        </div>
        {children}
      </Card>
    </li>
  )
}

/** Daftar kartu hasil; daftar kosong = "Penerbangan tidak ditemukan". `aksi(f)` memberi aksi di akhir tiap kartu. */
export function DaftarPenerbangan({
  daftar,
  label,
  aksi,
}: {
  daftar: HasilPencarian[]
  label: string
  aksi?: (penerbangan: HasilPencarian) => ReactNode
}) {
  if (daftar.length === 0) return <EmptyState>{PESAN_PENERBANGAN_TIDAK_DITEMUKAN}</EmptyState>
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {daftar.map((penerbangan) => (
        <KartuPenerbangan key={penerbangan.id} penerbangan={penerbangan}>
          {aksi?.(penerbangan)}
        </KartuPenerbangan>
      ))}
    </ul>
  )
}
