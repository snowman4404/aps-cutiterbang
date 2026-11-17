import { useEffect, useState } from 'react'
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
import { Alert, Button, DataTable, EmptyState, Field, Kode, Memuat, PageTitle, Pill, Select } from '../ui/index.ts'
import { VARIAN_STATUS_BOOKING } from './format.ts'
import { useSimulator } from './useSimulator.ts'

// US-7 di sisi web (boundary "Halaman Status Booking", control PengendaliStatusBooking di API): semua pemesanan terbaru dulu,
// lalu satu pilihan status (2, 3). Filter tinggal di URL (`?status=`); "Semua status" = tanpa parameter (2a);
// daftar kosong = "Tidak ada pemesanan dengan status ini" (3a).
export default function HalamanStatusBooking() {
  const [params, setParams] = useSearchParams()
  const filter: FilterStatus = filterStatusDariTeks(params.get('status')) ?? NILAI_SEMUA_STATUS
  const [versi, setVersi] = useState(0)
  const { data, galat } = useMuat<{ pemesanan: BarisStatusBooking[] }>(`/travel/status?status=${filter}&v=${versi}`)

  // Daftar terakhir untuk filter yang sama tetap tampil selama dimuat ulang (setelah simulator); filter lain tidak pernah meminjamnya.
  const [daftar, setDaftar] = useState<{ filter: FilterStatus; baris: BarisStatusBooking[] } | null>(null)
  useEffect(() => {
    if (data) setDaftar({ filter, baris: data.pemesanan })
  }, [data, filter])
  const baris = daftar?.filter === filter ? daftar.baris : null

  const simulator = useSimulator(() => setVersi((v) => v + 1))

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
      {simulator.pesan && <Alert varian="negative">{simulator.pesan}</Alert>}
      {!baris && !galat && <Memuat />}
      {baris &&
        (baris.length === 0 ? (
          <EmptyState>{PESAN_TIDAK_ADA_PEMESANAN}</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            <DataTable aria-label="Daftar status booking">
              <thead>
                <tr>
                  <th>Kode booking reference</th>
                  <th>Nama penumpang</th>
                  <th>Status booking</th>
                  {simulator.aktif && <th>Simulator demo</th>}
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.kode} data-testid="baris-status" data-kode={b.kode}>
                    <td data-testid="kode">
                      <Kode>{b.kode}</Kode>
                    </td>
                    <td data-testid="penumpang">{b.penumpang.join(', ')}</td>
                    <td data-testid="status">
                      <Pill varian={VARIAN_STATUS_BOOKING[b.status]}>{b.label}</Pill>
                    </td>
                    {simulator.aktif && (
                      <td>
                        {b.status === 'WaitingForThePayment' && (
                          <Button varian="ghost" ukuran="sm" disabled={simulator.sibuk} onClick={() => void simulator.picu('pembayaran', b.kode)}>
                            Simulasikan pembayaran
                          </Button>
                        )}
                        {b.status === 'Booked' && (
                          <Button varian="ghost" ukuran="sm" disabled={simulator.sibuk} onClick={() => void simulator.picu('maskapai', b.kode)}>
                            Simulasikan konfirmasi maskapai
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </DataTable>
            {simulator.aktif && (
              <p className="text-xs text-muted">
                Simulator demo mewakili sistem pembayaran dan maskapai (di luar lingkup); bukan bagian dari halaman ini.
              </p>
            )}
          </div>
        ))}
    </section>
  )
}
