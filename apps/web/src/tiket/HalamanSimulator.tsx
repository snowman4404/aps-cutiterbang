import type { SistemLuar } from '@cutiterbang/domain'
import { Alert, Button, DataTable, EmptyState, JudulBagian, Kode, Memuat, PageTitle, Pill } from '../ui/index.ts'
import { VARIAN_STATUS_BOOKING } from './format.ts'
import { EmailETiket } from './KartuTiket.tsx'
import { useSimulator } from './useSimulator.ts'

/** Tombol per sistem luar; status yang memunculkannya ditentukan `sistemLuarUntuk` (di API). */
const LABEL_SIMULATOR: Record<SistemLuar, string> = {
  pembayaran: 'Simulasikan pembayaran',
  maskapai: 'Simulasikan konfirmasi maskapai',
}

/** Nama kolom: judul tabel dan `data-label` sel (tampilan ponsel) dari satu sumber. */
const KOLOM = {
  kode: 'Kode booking reference',
  pemesan: 'Pemesan',
  penumpang: 'Nama penumpang',
  status: 'Status booking',
  sistem: 'Sistem luar',
} as const

// Panel simulator demo (Fase 7), bukan bagian dari use case mana pun: menggantikan sistem luar yang di luar lingkup
// (Pembayaran, Maskapai, Layanan Email; spesifikasi: "cukup disimulasikan"). Tanpa penjaga peran, seperti /api/simulasi;
// mati bila API mematikannya. Reset data demo ada di sidebar.
export default function HalamanSimulator() {
  const { ringkasan, galat, memuat, sibuk, pesan, picu } = useSimulator()

  return (
    <section className="flex flex-col gap-8">
      <PageTitle finding="Sistem pembayaran, Maskapai, Layanan Email: di luar cakupan, cukup disimulasikan.">Simulator demo</PageTitle>

      {memuat && <Memuat />}
      {galat && <EmptyState>{galat}</EmptyState>}

      {ringkasan && (
        <>
          <div className="flex flex-col gap-3">
            <JudulBagian>Pemesanan</JudulBagian>
            {pesan && <Alert varian="negative">{pesan}</Alert>}
            <DataTable aria-label="Pemesanan untuk simulator">
              <thead>
                <tr>
                  <th>{KOLOM.kode}</th>
                  <th>{KOLOM.pemesan}</th>
                  <th>{KOLOM.penumpang}</th>
                  <th>{KOLOM.status}</th>
                  <th>{KOLOM.sistem}</th>
                </tr>
              </thead>
              <tbody>
                {ringkasan.pemesanan.map((b) => (
                  <tr key={b.kode} data-testid="baris-simulator" data-kode={b.kode}>
                    <td data-label={KOLOM.kode}>
                      <Kode>{b.kode}</Kode>
                    </td>
                    <td data-label={KOLOM.pemesan}>{b.pemesan}</td>
                    <td data-label={KOLOM.penumpang}>{b.penumpang.join(', ')}</td>
                    <td data-testid="status" data-label={KOLOM.status}>
                      <Pill varian={VARIAN_STATUS_BOOKING[b.status]}>{b.label}</Pill>
                    </td>
                    <td data-label={KOLOM.sistem}>
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

          {ringkasan.email.length > 0 && (
            <div className="flex max-w-2xl flex-col gap-3">
              <JudulBagian>Kotak keluar email</JudulBagian>
              <ul className="flex flex-col gap-2" aria-label="Kotak keluar email">
                {ringkasan.email.map((e) => (
                  <EmailETiket key={`${e.kode}-${e.kepada}`} email={e} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
