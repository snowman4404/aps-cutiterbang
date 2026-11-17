import type { SistemLuar } from '@cutiterbang/domain'
import { useResetDemo } from '../shell/useResetDemo.ts'
import { Alert, Button, DataTable, EmptyState, JudulBagian, Kode, Memuat, PageTitle, Pill } from '../ui/index.ts'
import { VARIAN_STATUS_BOOKING } from './format.ts'
import { EmailETiket } from './KartuTiket.tsx'
import { useSimulator } from './useSimulator.ts'

/** Tombol per sistem luar; status yang memunculkannya ditentukan `sistemLuarUntuk` (di API). */
const LABEL_SIMULATOR: Record<SistemLuar, string> = {
  pembayaran: 'Simulasikan pembayaran',
  maskapai: 'Simulasikan konfirmasi maskapai',
}

// Panel simulator demo (Fase 7), bukan bagian dari use case mana pun: menggantikan sistem luar yang di luar lingkup
// (Pembayaran, Maskapai, Layanan Email) dan reset data demo. Tanpa penjaga peran, seperti /api/simulasi; mati bila API mematikannya.
export default function HalamanSimulator() {
  const { ringkasan, galat, memuat, sibuk, pesan, picu } = useSimulator()
  const reset = useResetDemo()

  return (
    <section className="flex flex-col gap-8">
      <PageTitle finding="Mewakili sistem di luar lingkup aplikasi: pembayaran, konfirmasi maskapai dan layanan email. Bukan bagian dari use case mana pun.">
        Simulator demo
      </PageTitle>

      {memuat && <Memuat />}
      {galat && <EmptyState>{galat}</EmptyState>}

      {ringkasan && (
        <>
          <div className="flex flex-col gap-3">
            <JudulBagian>Pemesanan</JudulBagian>
            <p className="text-sm text-muted">
              Pembayaran mengubah Waiting for the payment menjadi Booked. Konfirmasi maskapai mengubah Booked menjadi Confirmed,
              menerbitkan e-tiket dan mengirim email ke pengunjung (pemesanan Manajer Travel).
            </p>
            {pesan && <Alert varian="negative">{pesan}</Alert>}
            <DataTable aria-label="Pemesanan untuk simulator">
              <thead>
                <tr>
                  <th>Kode booking reference</th>
                  <th>Pemesan</th>
                  <th>Nama penumpang</th>
                  <th>Status booking</th>
                  <th>Sistem luar</th>
                </tr>
              </thead>
              <tbody>
                {ringkasan.pemesanan.map((b) => (
                  <tr key={b.kode} data-testid="baris-simulator" data-kode={b.kode}>
                    <td data-label="Kode booking reference">
                      <Kode>{b.kode}</Kode>
                    </td>
                    <td data-label="Pemesan">{b.pemesan}</td>
                    <td data-label="Nama penumpang">{b.penumpang.join(', ')}</td>
                    <td data-testid="status" data-label="Status booking">
                      <Pill varian={VARIAN_STATUS_BOOKING[b.status]}>{b.label}</Pill>
                    </td>
                    <td data-label="Sistem luar">
                      {b.sistem && (
                        <Button varian="secondary" ukuran="sm" disabled={sibuk} onClick={() => void picu(b.sistem!, b.kode)}>
                          {LABEL_SIMULATOR[b.sistem]}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          <div className="flex max-w-2xl flex-col gap-3">
            <JudulBagian>Kotak keluar email</JudulBagian>
            {ringkasan.email.length === 0 ? (
              <EmptyState>Belum ada email terkirim</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Kotak keluar email">
                {ringkasan.email.map((e) => (
                  <EmailETiket key={`${e.kode}-${e.kepada}`} email={e} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {reset.aktif && (
        <div className="flex max-w-2xl flex-col items-start gap-3">
          <JudulBagian>Data demo</JudulBagian>
          <p className="text-sm text-muted">Kembalikan semua data ke seed awal. Sesi ikut terhapus, jadi semua pengguna keluar.</p>
          <Button varian="secondary" onClick={reset.resetData} disabled={reset.mereset}>
            Reset data demo
          </Button>
        </div>
      )}
    </section>
  )
}
