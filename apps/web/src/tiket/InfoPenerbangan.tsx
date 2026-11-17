import type { HasilPencarian } from '@cutiterbang/domain'
import { formatTanggalDenganHari } from '../lib/tanggal.ts'
import { formatHarga, formatWaktu } from './format.ts'

/** Informasi penerbangan yang sama di ringkasan pemesanan dan "Tiket Saya" (US-2a jaminan sukses). */
export function InfoPenerbangan({ f }: { f: Omit<HasilPencarian, 'id' | 'sisaKursi'> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-ink">{f.maskapai}</span>
        <span className="text-sm text-muted num">{f.nomorPenerbangan}</span>
        <span className="text-sm text-muted">{formatTanggalDenganHari(f.tanggalKeberangkatan)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted">
          {f.asal.nama} → {f.tujuan.nama}
        </span>
        <span className="text-ink num">
          <span data-testid="berangkat">{formatWaktu(f.waktuBerangkat, f.asal.zonaWaktu)}</span>
          {' → '}
          <span data-testid="tiba">{formatWaktu(f.waktuTiba, f.tujuan.zonaWaktu)}</span>
        </span>
      </div>
      <div className="flex flex-col gap-1 sm:items-end">
        <span className="font-medium text-ink num" data-testid="harga">
          {formatHarga(f.harga)}
        </span>
        <span className="text-sm text-muted">per penumpang</span>
      </div>
    </div>
  )
}
