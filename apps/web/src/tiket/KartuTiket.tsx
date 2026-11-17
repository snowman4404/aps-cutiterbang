import type { ReactNode } from 'react'
import { LABEL_ETIKET_DIBATALKAN, PESAN_ETIKET_TIDAK_BERLAKU, type EmailETiketDto, type ETiketDto, type TiketSaya } from '@cutiterbang/domain'
import { Card, Kode, Pill } from '../ui/index.ts'
import { formatWaktuKirim, VARIAN_STATUS_BOOKING } from './format.ts'
import { InfoPenerbangan } from './InfoPenerbangan.tsx'

// Satu pemesanan di "Tiket Saya" (US-2a/2b) dan "Tiket Saya" Pengunjung (US-8c), dan hasil pemesanan US-8b:
// kode booking reference, status booking, informasi penerbangan dan penumpang. `aksi` (mis. Batalkan) dititipkan pemanggil;
// `disorot` menandai pemesanan yang baru dibuat. US-8d: e-tiket (G5: void dengan label "Dibatalkan" bila pemesanan Cancelled)
// dan, untuk Pengunjung, email e-tiket yang dikirim kepadanya.
export function KartuTiket({ tiket, disorot = false, aksi }: { tiket: TiketSaya; disorot?: boolean; aksi?: ReactNode }) {
  return (
    <li
      data-testid="tiket"
      data-kode={tiket.kode}
      data-baru={disorot ? 'true' : undefined}
      aria-current={disorot ? 'true' : undefined}
      aria-label={disorot ? `Pemesanan baru ${tiket.kode}` : undefined}
    >
      <Card className={`flex flex-col gap-4 ${disorot ? 'outline-2 outline-accent' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-3">
            <span className="text-sm text-muted">Kode</span>
            <span data-testid="kode">
              <Kode>{tiket.kode}</Kode>
            </span>
          </span>
          <span data-testid="status">
            <Pill varian={VARIAN_STATUS_BOOKING[tiket.status]}>{tiket.label}</Pill>
          </span>
        </div>
        <InfoPenerbangan penerbangan={tiket.penerbangan} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">
            Penumpang: <span className="text-ink" data-testid="penumpang">{tiket.penumpang.join(', ')}</span>
          </span>
          {aksi}
        </div>
        {tiket.eTiket && <ETiket eTiket={tiket.eTiket} />}
        {tiket.emailETiket && tiket.emailETiket.length > 0 && (
          <ul aria-label={`Email e-tiket ${tiket.kode}`} className="flex flex-col gap-3">
            {tiket.emailETiket.map((email) => (
              <EmailETiket key={email.kepada} email={email} />
            ))}
          </ul>
        )}
      </Card>
    </li>
  )
}

// G5: e-tiket pemesanan yang sudah Cancelled tetap tampil, tetapi sebagai void (label "Dibatalkan" dan catatan tidak berlaku).
function ETiket({ eTiket }: { eTiket: ETiketDto }) {
  return (
    <div
      data-testid="etiket"
      data-berlaku={eTiket.berlaku ? 'true' : 'false'}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-control px-3 py-2 text-sm"
    >
      <span className="text-muted">E-tiket</span>
      <span data-testid="nomor-etiket" className={eTiket.berlaku ? '' : 'text-muted line-through'}>
        <Kode>{eTiket.nomor}</Kode>
      </span>
      {!eTiket.berlaku && (
        <>
          <span data-testid="label-etiket">
            <Pill varian="negative">{LABEL_ETIKET_DIBATALKAN}</Pill>
          </span>
          <span data-testid="catatan-etiket" className="text-muted">
            {PESAN_ETIKET_TIDAK_BERLAKU}
          </span>
        </>
      )}
    </div>
  )
}

// US-8d: email e-tiket di kotak keluar Layanan Email (simulasi): alamat tujuan, waktu kirim dan isinya. Juga dipakai panel simulator.
export function EmailETiket({ email }: { email: EmailETiketDto }) {
  return (
    <li data-testid="email-etiket" className="flex flex-col gap-2 rounded-control bg-raised px-3 py-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium text-ink">Email e-tiket</span>
        <span className="text-muted">
          Dikirim <span data-testid="waktu-kirim">{formatWaktuKirim(email.waktuKirim)}</span>
        </span>
      </div>
      <div className="text-muted">
        Kepada: <span className="text-ink" data-testid="kepada">{email.kepada}</span>
      </div>
      <div className="text-muted">
        Subjek: <span className="text-ink">{email.subjek}</span>
      </div>
      <pre data-testid="isi-email" className="whitespace-pre-wrap break-words font-sans text-ink">{email.isi}</pre>
    </li>
  )
}
