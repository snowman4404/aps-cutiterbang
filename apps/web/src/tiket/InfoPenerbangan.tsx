import type { HasilPencarian } from '@cutiterbang/domain'
import { formatTanggalDenganHari } from '../lib/tanggal.ts'
import { formatHarga, formatWaktu } from './format.ts'

/** Informasi penerbangan yang sama di ringkasan pemesanan dan "Tiket Saya" (US-2a jaminan sukses). */
export function InfoPenerbangan({ penerbangan }: { penerbangan: Omit<HasilPencarian, 'id' | 'sisaKursi'> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <span className="text-sm text-muted">per penumpang</span>
      </div>
    </div>
  )
}
