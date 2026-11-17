import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { normalKode, type TiketSaya } from '@cutiterbang/domain'
import { panggil } from '../akses/api.ts'
import { PESAN_GALAT_UMUM, useMuat } from '../lib/useMuat.ts'
import { Alert, Button, Card, Dialog, EmptyState, Kode, LinkTombol, PageTitle, Pill } from '../ui/index.ts'
import { VARIAN_STATUS_BOOKING } from './format.ts'
import { InfoPenerbangan } from './InfoPenerbangan.tsx'

// "Tiket Saya" (US-2a langkah 10, US-2b): daftar pemesanan, pemesan baru disorot (`?baru=<kode>`), aksi batal hanya
// bila `dapatDibatalkan` (2a), dan Dialog Konfirmasi sebelum membatalkan (3, 4, 4a).
export default function HalamanTiketSaya() {
  const [params] = useSearchParams()
  const baru = params.get('baru')
  const [versi, setVersi] = useState(0)
  const { data, galat: galatMuat } = useMuat<{ pemesanan: TiketSaya[] }>(`/pemesanan/saya?v=${versi}`)

  // Daftar terakhir yang diterima tetap tampil selama dimuat ulang, dan diperbarui langsung dari jawaban pembatalan.
  const [daftar, setDaftar] = useState<TiketSaya[] | null>(null)
  useEffect(() => {
    if (data) setDaftar(data.pemesanan)
  }, [data])

  const [target, setTarget] = useState<TiketSaya | null>(null) // pemesanan yang sedang dikonfirmasi pembatalannya
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<{ varian: 'negative' | 'neutral'; teks: string } | null>(null)

  async function batalkan() {
    if (!target) return
    setSibuk(true)
    try {
      const r = await panggil<{ pemesanan?: TiketSaya; pesan?: string }>(`/pemesanan/${encodeURIComponent(target.kode)}/batalkan`, {
        method: 'POST',
      })
      const dibatalkan = r.data.pemesanan
      if (r.status === 200 && dibatalkan) {
        setDaftar((d) => d?.map((t) => (t.kode === dibatalkan.kode ? dibatalkan : t)) ?? d)
        setPesan({ varian: 'neutral', teks: `Pemesanan ${dibatalkan.kode} dibatalkan` })
      } else {
        setPesan({ varian: 'negative', teks: r.data.pesan ?? PESAN_GALAT_UMUM })
        setVersi((v) => v + 1)
      }
    } catch {
      setPesan({ varian: 'negative', teks: PESAN_GALAT_UMUM })
    } finally {
      setSibuk(false)
      setTarget(null)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Pemesanan Anda, terbaru di atas. Pemesanan yang belum berangkat dapat dibatalkan.">Tiket Saya</PageTitle>

      {baru && daftar?.some((t) => normalKode(t.kode) === normalKode(baru)) && (
        <Alert varian="neutral" role="status">
          Pemesanan berhasil dibuat. Kode booking Anda: <Kode>{baru}</Kode>
        </Alert>
      )}
      {pesan && (
        <Alert varian={pesan.varian} role={pesan.varian === 'negative' ? 'alert' : 'status'}>
          {pesan.teks}
        </Alert>
      )}
      {galatMuat && !daftar && <Alert varian="negative">{galatMuat}</Alert>}

      {daftar &&
        (daftar.length === 0 ? (
          <EmptyState>
            <p>Belum ada pemesanan.</p>
            <div className="mt-4">
              <LinkTombol to="/penerbangan" varian="secondary">
                Cari penerbangan
              </LinkTombol>
            </div>
          </EmptyState>
        ) : (
          <ul aria-label="Daftar pemesanan" className="flex flex-col gap-3">
            {daftar.map((t) => {
              const disorot = baru !== null && normalKode(t.kode) === normalKode(baru)
              return (
                <li key={t.kode} data-testid="tiket" data-kode={t.kode} data-baru={disorot ? 'true' : undefined}>
                  <Card className={`flex flex-col gap-4 ${disorot ? 'outline-2 outline-accent' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-3">
                        <span className="text-sm text-muted">Kode</span>
                        <span data-testid="kode">
                          <Kode>{t.kode}</Kode>
                        </span>
                      </span>
                      <span data-testid="status">
                        <Pill varian={VARIAN_STATUS_BOOKING[t.status]}>{t.label}</Pill>
                      </span>
                    </div>
                    <InfoPenerbangan f={t.penerbangan} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-muted">
                        Penumpang: <span className="text-ink" data-testid="penumpang">{t.penumpang.join(', ')}</span>
                      </span>
                      {t.dapatDibatalkan && (
                        <Button varian="secondary" ukuran="sm" aria-label={`Batalkan pemesanan ${t.kode}`} onClick={() => setTarget(t)}>
                          Batalkan
                        </Button>
                      )}
                    </div>
                  </Card>
                </li>
              )
            })}
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
        Status pemesanan menjadi Cancelled dan kursinya dilepas kembali. Pembatalan tidak dapat diurungkan.
      </Dialog>
    </section>
  )
}
