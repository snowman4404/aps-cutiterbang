import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import {
  hariIniWib,
  PESAN_PENERBANGAN_TIDAK_DITEMUKAN,
  validasiIsianPencarian,
  type GalatPencarian,
} from '@cutiterbang/domain'
import { panggil } from '../akses/api.ts'
import { Alert, Button, Card, EmptyState, Field, Input, PageTitle, Select } from '../ui/index.ts'
import { formatHarga, formatTanggal, formatWaktu, type HasilPenerbangan, type KotaPilihan } from './format.ts'

// US-3: Formulir Pencarian + Halaman Hasil Pencarian (tanpa login). Pencarian disimpan di URL
// (`?asal=<kotaId>&tujuan=<kotaId>&tanggal=YYYY-MM-DD`) supaya bertahan saat dimuat ulang dan bisa ditautkan.
export default function HalamanCariPenerbangan() {
  const [params, setParams] = useSearchParams()
  const asalUrl = params.get('asal') ?? ''
  const tujuanUrl = params.get('tujuan') ?? ''
  const tanggalUrl = params.get('tanggal') ?? ''

  const [kota, setKota] = useState<KotaPilihan[] | null>(null)
  const [galatKota, setGalatKota] = useState('')
  const [asal, setAsal] = useState(asalUrl)
  const [tujuan, setTujuan] = useState(tujuanUrl)
  const [tanggal, setTanggal] = useState(tanggalUrl)
  const [galat, setGalat] = useState<GalatPencarian>({})
  const [pesanGalat, setPesanGalat] = useState('')
  const [hasil, setHasil] = useState<HasilPenerbangan[] | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [versi, setVersi] = useState(0) // naik tiap submit supaya pencarian yang sama diulang

  // Langkah 1: daftar kota yang dilayani.
  useEffect(() => {
    let batal = false
    void panggil<{ kota: KotaPilihan[]; pesan?: string }>('/penerbangan/kota').then((r) => {
      if (batal) return
      if (r.status === 200) setKota(r.data.kota)
      else setGalatKota(r.data.pesan ?? 'Gagal memuat daftar kota')
    })
    return () => {
      batal = true
    }
  }, [])

  // Langkah 3-5: setiap perubahan URL (atau submit) memvalidasi lalu mencari; isian formulir selalu mengikuti URL.
  useEffect(() => {
    setAsal(asalUrl)
    setTujuan(tujuanUrl)
    setTanggal(tanggalUrl)
    setPesanGalat('')
    if (!asalUrl && !tujuanUrl && !tanggalUrl) {
      setGalat({})
      setHasil(null)
      return
    }
    const lokal = validasiIsianPencarian({ asal: asalUrl, tujuan: tujuanUrl, tanggal: tanggalUrl }, hariIniWib())
    setGalat(lokal)
    if (Object.keys(lokal).length > 0) {
      setHasil(null)
      return
    }
    let batal = false
    setSibuk(true)
    const q = new URLSearchParams({ asal: asalUrl, tujuan: tujuanUrl, tanggal: tanggalUrl })
    void panggil<{ penerbangan?: HasilPenerbangan[]; galat?: GalatPencarian; pesan?: string }>(
      `/penerbangan/cari?${q}`,
    ).then((r) => {
      if (batal) return
      setSibuk(false)
      if (r.status === 200) {
        setHasil(r.data.penerbangan ?? [])
      } else {
        setHasil(null)
        setGalat(r.data.galat ?? {})
        if (!r.data.galat) setPesanGalat(r.data.pesan ?? 'Terjadi kesalahan, coba lagi')
      }
    })
    return () => {
      batal = true
    }
  }, [asalUrl, tujuanUrl, tanggalUrl, versi])

  function cari(e: FormEvent) {
    e.preventDefault()
    const lokal = validasiIsianPencarian({ asal, tujuan, tanggal }, hariIniWib())
    setGalat(lokal)
    if (Object.keys(lokal).length > 0) {
      setHasil(null) // alur 3a-3c: tolak dan tandai kolom yang salah; isian tetap
      return
    }
    setParams({ asal, tujuan, tanggal })
    setVersi((v) => v + 1)
  }

  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Penerbangan yang belum berangkat dan masih punya kursi, urut keberangkatan paling awal.">
        Cari Penerbangan
      </PageTitle>
      <Card>
        <form onSubmit={cari} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2 desk:grid-cols-[1fr_1fr_200px_auto] desk:items-start">
          <Field label="Kota asal" galat={galat.asal}>
            {(p) => (
              <Select {...p} name="asal" value={asal} disabled={!kota} onChange={(e) => setAsal(e.target.value)}>
                <option value="">{kota ? 'Pilih kota asal' : 'Memuat…'}</option>
                {kota?.map((k) => (
                  <option key={k.id} value={String(k.id)}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Kota tujuan" galat={galat.tujuan}>
            {(p) => (
              <Select {...p} name="tujuan" value={tujuan} disabled={!kota} onChange={(e) => setTujuan(e.target.value)}>
                <option value="">{kota ? 'Pilih kota tujuan' : 'Memuat…'}</option>
                {kota?.map((k) => (
                  <option key={k.id} value={String(k.id)}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Tanggal keberangkatan" galat={galat.tanggal}>
            {(p) => (
              <Input {...p} type="date" name="tanggal" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            )}
          </Field>
          <div className="sm:col-span-2 desk:col-span-1 desk:pt-[22px]">
            <Button type="submit" varian="primary" disabled={sibuk}>
              Cari
            </Button>
          </div>
        </form>
      </Card>

      {galatKota && <Alert varian="negative">{galatKota}</Alert>}
      {pesanGalat && <Alert varian="negative">{pesanGalat}</Alert>}
      {hasil &&
        (hasil.length === 0 ? (
          <EmptyState>{PESAN_PENERBANGAN_TIDAK_DITEMUKAN}</EmptyState>
        ) : (
          <ul aria-label="Hasil pencarian penerbangan" className="flex flex-col gap-3">
            {hasil.map((f) => (
              <li key={f.id} data-testid="penerbangan">
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-ink">{f.maskapai}</span>
                    <span className="text-sm text-muted num">{f.nomorPenerbangan}</span>
                    <span className="text-sm text-muted">{formatTanggal(f.tanggalKeberangkatan)}</span>
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
                    <span className="text-sm text-muted num" data-testid="sisa-kursi">
                      Sisa {f.sisaKursi} kursi
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
