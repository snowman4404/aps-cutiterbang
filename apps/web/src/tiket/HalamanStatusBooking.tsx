import { useSearchParams } from 'react-router'
import {
  filterStatusDariTeks,
  NILAI_SEMUA_STATUS,
  PESAN_TIDAK_ADA_PEMESANAN,
  PILIHAN_FILTER_STATUS,
  type BarisStatusBooking,
  type FilterStatus,
} from '@cutiterbang/domain'
import { useMuat } from '../lib/useMuat.ts'
import { Alert, DataTable, EmptyState, Field, Kode, Memuat, PageTitle, Pill, Select } from '../ui/index.ts'
import { VARIAN_STATUS_BOOKING } from './format.ts'

/** Nama kolom: judul tabel dan `data-label` sel (tampilan ponsel) dari satu sumber. */
const KOLOM = {
  kode: 'Kode booking reference',
  penumpang: 'Nama penumpang',
  status: 'Status booking',
} as const

// US-7 di sisi web (boundary "Halaman Status Booking", control PengendaliStatusBooking di API): semua pemesanan terbaru dulu,
// lalu satu pilihan status (2, 3). Filter tinggal di URL (`?status=`); "Semua status" = tanpa parameter (2a);
// daftar kosong = "Tidak ada pemesanan dengan status ini" (3a).
export default function HalamanStatusBooking() {
  const [params, setParams] = useSearchParams()
  const filter: FilterStatus = filterStatusDariTeks(params.get('status')) ?? NILAI_SEMUA_STATUS
  const { data, galat } = useMuat<{ pemesanan: BarisStatusBooking[] }>(`/travel/status?status=${filter}`)
  const baris = data?.pemesanan ?? null

  function pilih(nilai: string) {
    const baru = new URLSearchParams(params)
    if (nilai === NILAI_SEMUA_STATUS) baru.delete('status')
    else baru.set('status', nilai)
    setParams(baru)
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Semua pemesanan, terbaru di atas. Saring menurut status booking untuk menindaklanjuti yang belum dibayar atau belum terkonfirmasi.">
        Status Booking
      </PageTitle>

      <div className="max-w-form">
        <Field label="Status booking">
          {(kontrol) => (
            <Select {...kontrol} name="status" value={filter} onChange={(event) => pilih(event.target.value)}>
              {PILIHAN_FILTER_STATUS.map((p) => (
                <option key={p.nilai} value={p.nilai}>
                  {p.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {galat && !baris && <Alert varian="negative">{galat}</Alert>}
      {!baris && !galat && <Memuat />}
      {baris &&
        (baris.length === 0 ? (
          <EmptyState>{PESAN_TIDAK_ADA_PEMESANAN}</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            <DataTable aria-label="Daftar status booking">
              <thead>
                <tr>
                  <th>{KOLOM.kode}</th>
                  <th>{KOLOM.penumpang}</th>
                  <th>{KOLOM.status}</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.kode} data-testid="baris-status" data-kode={b.kode}>
                    <td data-testid="kode" data-label={KOLOM.kode}>
                      <Kode>{b.kode}</Kode>
                    </td>
                    <td data-testid="penumpang" data-label={KOLOM.penumpang}>{b.penumpang.join(', ')}</td>
                    <td data-testid="status" data-label={KOLOM.status}>
                      <Pill varian={VARIAN_STATUS_BOOKING[b.status]}>{b.label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        ))}
    </section>
  )
}
