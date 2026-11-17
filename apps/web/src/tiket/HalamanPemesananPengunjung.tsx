import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import {
  jumlahDariTeks,
  LABEL_STATUS_PROFIL,
  PESAN_KURSI_HABIS,
  validasiDaftarPengunjung,
  type InformasiPenerbangan,
  type PengunjungDto,
  type TiketSaya,
} from '@cutiterbang/domain'
import { panggil } from '../lib/api.ts'
import { formatTanggal } from '../lib/tanggal.ts'
import { useAksi } from '../lib/useAksi.ts'
import { PESAN_GALAT_UMUM, useMuat } from '../lib/useMuat.ts'
import { Alert, Button, Card, JudulBagian, LinkTombol, Memuat, PageTitle, Pill } from '../ui/index.ts'
import { KOLOM } from './FormulirDataWajib.tsx'
import { VARIAN_STATUS_PROFIL } from './format.ts'
import { InfoPenerbangan } from './InfoPenerbangan.tsx'
import { KartuTiket } from './KartuTiket.tsx'

// US-8b di sisi web (boundary Halaman Pemesanan, kontrak C2): ringkasan penerbangan, daftar pengunjung terdaftar sebagai
// pilihan (langkah 2), data penumpang dari Profil tiap pengunjung terpilih (langkah 3, hanya-baca), dan konfirmasi (4).
// Jumlah penumpang pada pencarian US-8a (`?jumlah=`) hanya petunjuk; manajer travel memilih satu atau lebih pengunjung.
// 5a (profil tidak lengkap, menyebut nama) dan 5b (Kursi sudah habis) datang dari API sebagai 409.
export default function HalamanPemesananPengunjung() {
  const { idPenerbangan } = useParams()
  const [params] = useSearchParams()
  const jumlahDicari = jumlahDariTeks(params.get('jumlah'))
  const { data: dataPenerbangan, galat: galatMuat, memuat } = useMuat<{ penerbangan: InformasiPenerbangan }>(`/penerbangan/${idPenerbangan}`)
  const { data: dataPengunjung, galat: galatPengunjung, memuat: memuatPengunjung } = useMuat<{ pengunjung: PengunjungDto[] }>('/travel/pengunjung')

  const [terpilih, setTerpilih] = useState<number[]>([]) // id pengunjung, urut pilihan
  const [pesan, setPesan] = useState('') // tampilkanPesan (daftar kosong, 5a, 5b, galat lain)
  const [dibuat, setDibuat] = useState<TiketSaya | null>(null) // tampilkanPemesanan(b)
  const { sibuk, jalankan } = useAksi(setPesan)

  const penerbangan = dataPenerbangan?.penerbangan
  const daftar = dataPengunjung?.pengunjung ?? []

  const pilih = (id: number, dipilih: boolean) => {
    setPesan('')
    setTerpilih((lama) => (dipilih ? [...lama, id] : lama.filter((idLama) => idLama !== id)))
  }

  const konfirmasi = () =>
    jalankan(async () => {
      if (!penerbangan) return
      const daftarSah = validasiDaftarPengunjung(terpilih)
      if ('pesan' in daftarSah) {
        setPesan(daftarSah.pesan)
        return
      }
      setPesan('')
      const respons = await panggil<{ pemesanan?: TiketSaya; pesan?: string }>('/travel/pemesanan', {
        body: { idPenerbangan: penerbangan.id, pengunjung: daftarSah.daftar },
      })
      if (respons.status === 201 && respons.data.pemesanan) setDibuat(respons.data.pemesanan)
      else setPesan(respons.data.pesan ?? PESAN_GALAT_UMUM)
    })

  if (memuat || memuatPengunjung) return <Memuat />
  if (!penerbangan) return <Alert varian="negative">{galatMuat}</Alert>

  const kursiHabis = pesan === PESAN_KURSI_HABIS // 5b: use case berakhir gagal

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <PageTitle finding="Pilih pengunjung, data penumpang diambil dari profil mereka. Satu pemesanan, satu kode booking reference.">
        Pesan untuk Pengunjung
      </PageTitle>

      <Card className="flex flex-col gap-3">
        <InfoPenerbangan penerbangan={penerbangan} />
        <span className="text-sm text-muted num" data-testid="sisa-kursi">
          Sisa {penerbangan.sisaKursi} kursi
        </span>
      </Card>

      {pesan && <Alert varian="negative">{pesan}</Alert>}

      {dibuat ? (
        <>
          <ul aria-label="Pemesanan yang dibuat" className="flex flex-col gap-3">
            <KartuTiket tiket={dibuat} disorot />
          </ul>
          <div>
            <LinkTombol to="/travel/cari" varian="secondary">
              Cari penerbangan lain
            </LinkTombol>
          </div>
        </>
      ) : kursiHabis ? (
        <div>
          <LinkTombol to="/travel/cari" varian="secondary">
            Cari penerbangan lain
          </LinkTombol>
        </div>
      ) : (
        <Card className="flex flex-col gap-4">
          <JudulBagian>Pengunjung</JudulBagian>
          {galatPengunjung && <Alert varian="negative">{galatPengunjung}</Alert>}
          {jumlahDicari !== null && (
            <p className="text-sm text-muted" data-testid="jumlah-dicari">
              Pencarian untuk {jumlahDicari} penumpang. Pilih satu atau lebih pengunjung terdaftar
            </p>
          )}
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Pilih pengunjung</legend>
            <ul className="flex flex-col gap-3">
              {daftar.map((v) => {
                const dipilih = terpilih.includes(v.id)
                return (
                  <li key={v.id} data-testid="pengunjung" data-nama={v.nama} className="rounded-control border border-border p-3">
                    <label className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="pengunjung"
                          value={v.id}
                          checked={dipilih}
                          onChange={(event) => pilih(v.id, event.target.checked)}
                          className="size-4 accent-accent"
                        />
                        <span className="font-medium text-ink">{v.nama}</span>
                      </span>
                      <span data-testid="status-profil">
                        <Pill varian={VARIAN_STATUS_PROFIL[v.status]}>{LABEL_STATUS_PROFIL[v.status]}</Pill>
                      </span>
                    </label>
                    {dipilih && (
                      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-ringkasan" aria-label={`Data penumpang ${v.nama}`}>
                        {KOLOM.map((kolom) => {
                          const nilai = v.data[kolom.nama]
                          return (
                            <div key={kolom.nama} className="contents">
                              <dt className="text-muted">{kolom.label}</dt>
                              <dd data-testid={`data-${kolom.nama}`}>
                                {nilai ? (kolom.nama === 'tanggalLahir' ? formatTanggal(nilai) : nilai) : <span className="text-faint">Belum diisi</span>}
                              </dd>
                            </div>
                          )
                        })}
                      </dl>
                    )}
                  </li>
                )
              })}
            </ul>
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <Button varian="primary" disabled={sibuk} onClick={() => void konfirmasi()}>
              Konfirmasi pemesanan
            </Button>
            <span className="text-sm text-muted" data-testid="jumlah-terpilih">
              {terpilih.length} pengunjung dipilih
            </span>
          </div>
        </Card>
      )}
    </section>
  )
}
