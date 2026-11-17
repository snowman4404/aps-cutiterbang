import type { TiketSaya } from '@cutiterbang/domain'
import { useMuat } from '../lib/useMuat.ts'
import { Alert, EmptyState, Memuat, PageTitle } from '../ui/index.ts'
import { KartuTiket } from './KartuTiket.tsx'

// US-8c "Tiket Saya" milik Pengunjung: pemesanan yang mencantumkannya sebagai penumpang (kode booking reference,
// informasi penerbangan, status booking). Tanpa aksi: pengunjung bukan pemesan, jadi tidak ada Batalkan (G4).
export default function HalamanTiketDipesankan() {
  const { data, galat, memuat } = useMuat<{ pemesanan: TiketSaya[] }>('/tiket-dipesankan')

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Pemesanan yang dibuat Manajer Travel atas nama Anda, terbaru di atas.">Tiket Saya</PageTitle>
      {memuat && <Memuat />}
      {galat && !data && <Alert varian="negative">{galat}</Alert>}
      {data &&
        (data.pemesanan.length === 0 ? (
          <EmptyState>Belum ada tiket</EmptyState>
        ) : (
          <ul aria-label="Daftar pemesanan" className="flex flex-col gap-3">
            {data.pemesanan.map((tiket) => (
              <KartuTiket key={tiket.kode} tiket={tiket} />
            ))}
          </ul>
        ))}
    </section>
  )
}
