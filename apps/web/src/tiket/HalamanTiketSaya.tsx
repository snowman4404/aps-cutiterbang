import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { samaKode, type TiketSaya } from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { useAksi } from '../lib/useAksi.ts'
import { PESAN_GALAT_UMUM, useMuat } from '../lib/useMuat.ts'
import { Alert, Button, Dialog, EmptyState, LinkTombol, PageTitle } from '../ui/index.ts'
import { KartuTiket } from './KartuTiket.tsx'

// "Tiket Saya" (US-2a langkah 10, US-2b): daftar pemesanan, pemesan baru disorot (`?baru=<kode>`), aksi batal hanya
// bila `dapatDibatalkan` (2a), dan Dialog Konfirmasi sebelum membatalkan (3, 4, 4a).
export default function HalamanTiketSaya() {
  const [params] = useSearchParams()
  const baru = params.get('baru')
  const { data, galat: galatMuat, muatUlang } = useMuat<{ pemesanan: TiketSaya[] }>('/pemesanan/saya')

  // Daftar terakhir yang diterima tetap tampil selama dimuat ulang, dan diperbarui langsung dari jawaban pembatalan.
  const [daftar, setDaftar] = useState<TiketSaya[] | null>(null)
  useEffect(() => {
    if (data) setDaftar(data.pemesanan)
  }, [data])

  const [target, setTarget] = useState<TiketSaya | null>(null) // pemesanan yang sedang dikonfirmasi pembatalannya
  const [pesan, setPesan] = useState('') // galat pembatalan; keberhasilan terlihat dari status Cancelled pada kartu
  const { sibuk, jalankan } = useAksi(setPesan)

  const batalkan = () =>
    jalankan(async () => {
      if (!target) return
      setPesan('')
      try {
        const respons = await panggil<{ pemesanan?: TiketSaya; pesan?: string }>(
          `/pemesanan/${encodeURIComponent(target.kode)}/batalkan`,
          { method: 'POST' },
        )
        const dibatalkan = respons.data.pemesanan
        if (respons.status === 200 && dibatalkan) {
          setDaftar((daftarLama) => daftarLama?.map((tiket) => (tiket.kode === dibatalkan.kode ? dibatalkan : tiket)) ?? daftarLama)
        } else {
          setPesan(respons.data.pesan ?? PESAN_GALAT_UMUM)
          muatUlang()
        }
      } finally {
        setTarget(null)
      }
    })

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Pemesanan Anda, terbaru di atas. Pemesanan yang belum berangkat dapat dibatalkan.">Tiket Saya</PageTitle>

      {pesan && <Alert varian="negative">{pesan}</Alert>}
      {galatMuat && !daftar && <Alert varian="negative">{galatMuat}</Alert>}

      {daftar &&
        (daftar.length === 0 ? (
          <EmptyState>
            <p>Belum ada tiket</p>
            <div className="mt-4">
              <LinkTombol to="/penerbangan" varian="secondary">
                Cari penerbangan
              </LinkTombol>
            </div>
          </EmptyState>
        ) : (
          <ul aria-label="Daftar pemesanan" className="flex flex-col gap-3">
            {daftar.map((tiket) => (
              <KartuTiket
                key={tiket.kode}
                tiket={tiket}
                disorot={baru !== null && samaKode(tiket.kode, baru)}
                aksi={
                  tiket.dapatDibatalkan && (
                    <Button varian="secondary" ukuran="sm" aria-label={`Batalkan pemesanan ${tiket.kode}`} onClick={() => setTarget(tiket)}>
                      Batalkan
                    </Button>
                  )
                }
              />
            ))}
          </ul>
        ))}

      <Dialog
        buka={target !== null}
        onTutup={() => setTarget(null)}
        judul={`Batalkan pemesanan ${target?.kode ?? ''}?`}
        aksi={
          <>
            <Button varian="secondary" disabled={sibuk} onClick={() => setTarget(null)}>
              Tidak
            </Button>
            <Button varian="primary" disabled={sibuk} onClick={() => void batalkan()}>
              Ya, batalkan
            </Button>
          </>
        }
      >
        Pemesanan ini akan dibatalkan dan tidak dapat diurungkan.
      </Dialog>
    </section>
  )
}
