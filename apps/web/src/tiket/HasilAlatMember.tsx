import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import {
  batalkanPilihan,
  periksaJumlahPilihan,
  pilihPenerbangan,
  saringMenurutWaktuBerangkat,
  susunBerdampingan,
  urutkan,
  validasiIsianJam,
  JUMLAH_PILIHAN_MAKSIMAL,
  type ArahUrutan,
  type GalatJam,
  type HasilPencarian,
  type IsianJam,
} from '@cutiterbang/domain'
import { Alert, Button, Card, Chip, Field, Input, LinkTombol, Select } from '../ui/index.ts'
import { DaftarPenerbangan } from './KartuPenerbangan.tsx'
import { TampilanPerbandingan } from './TampilanPerbandingan.tsx'

const PARAM_PILIHAN = 'bandingkan'
const PARAM_TERBUKA = 'lihat'

/** Pilihan perbandingan dari URL (`bandingkan=12,34`): hanya id yang ada di hasil, paling banyak 3. */
const pilihanDariUrl = (teks: string | null, hasil: readonly HasilPencarian[]) =>
  (teks ?? '')
    .split(',')
    .map(Number)
    .filter((id, i, semua) => Number.isInteger(id) && semua.indexOf(id) === i && hasil.some((f) => f.id === id))
    .slice(0, JUMLAH_PILIHAN_MAKSIMAL)

// Alat khusus Member pada hasil US-3 (extension point "hasil pencarian"): US-6a saring jam (klien, pencarian tidak
// diulang), US-6b urutkan harga + pilih untuk dibandingkan, tampilan perbandingan. Operasi control mengikuti diagram
// urutan (`validasiIsianJam`, `saringMenurutWaktuBerangkat`, `urutkan`, `periksaJumlahPilihan`, `tahanTampilan`,
// `susunBerdampingan`, ...) dan memakai fungsi domain murni. Pilihan dan keadaan terbuka ada di URL supaya kembali dari
// halaman pemesanan memulihkan perbandingan yang sama (US-6c 4a).
export function HasilAlatMember({ hasil }: { hasil: HasilPencarian[] }) {
  const [params, setParams] = useSearchParams()
  const [urutan, setUrutan] = useState<ArahUrutan | ''>('')
  const [isianJam, setIsianJam] = useState<IsianJam>({ jamAwal: '', jamAkhir: '' })
  const [galatJam, setGalatJam] = useState<GalatJam>({})
  const [saring, setSaring] = useState<IsianJam | null>(null)
  const [pesanPilihan, setPesanPilihan] = useState('')

  const pilihan = pilihanDariUrl(params.get(PARAM_PILIHAN), hasil)
  const bolehBuka = periksaJumlahPilihan(pilihan.length)
  const terbuka = params.get(PARAM_TERBUKA) === '1' && bolehBuka // 4a: kurang dari 2 = tampilan ditahan

  function ubahUrl(ubah: (p: URLSearchParams) => void, ganti: boolean) {
    setParams(
      (lama) => {
        const baru = new URLSearchParams(lama)
        ubah(baru)
        return baru
      },
      { replace: ganti },
    )
  }
  const tulisPilihan = (ids: number[]) =>
    ubahUrl((p) => (ids.length ? p.set(PARAM_PILIHAN, ids.join(',')) : p.delete(PARAM_PILIHAN)), true)

  /** Langkah 3 / 3a: pilih atau batalkan satu penerbangan; yang keempat ditolak dengan pesan. */
  function ubahPilihan(id: number) {
    if (pilihan.includes(id)) {
      setPesanPilihan('')
      tulisPilihan(batalkanPilihan(pilihan, id))
      return
    }
    const hasilPilih = pilihPenerbangan(pilihan, id)
    if ('pesan' in hasilPilih) setPesanPilihan(hasilPilih.pesan)
    else {
      setPesanPilihan('')
      tulisPilihan(hasilPilih.pilihan)
    }
  }

  /** US-6a langkah 2-4: validasiIsianJam menolak (3a, 3b) atau saringMenurutWaktuBerangkat pada hasil yang sudah ada. */
  function terapkanFilter(event: FormEvent) {
    event.preventDefault()
    const galat = validasiIsianJam(isianJam.jamAwal, isianJam.jamAkhir)
    setGalatJam(galat)
    if (Object.keys(galat).length > 0) return
    const filter = { jamAwal: isianJam.jamAwal.trim(), jamAkhir: isianJam.jamAkhir.trim() }
    setSaring(filter)
    // Pilihan perbandingan hanya mencakup penerbangan yang tampil: yang disembunyikan filter dilepas
    // (tidak kembali saat filter dihapus), sehingga hitungan dan batas 3 sesuai yang terlihat.
    const terlihat = saringMenurutWaktuBerangkat(hasil, filter.jamAwal, filter.jamAkhir)
    const sisaPilihan = pilihan.filter((id) => terlihat.some((f) => f.id === id))
    if (sisaPilihan.length !== pilihan.length) {
      setPesanPilihan('')
      tulisPilihan(sisaPilihan)
    }
  }
  /** 4c: hapus filter, semua hasil tampil kembali. */
  function hapusFilter() {
    setSaring(null)
    setGalatJam({})
    setIsianJam({ jamAwal: '', jamAkhir: '' })
  }

  const tersaring = saring ? saringMenurutWaktuBerangkat(hasil, saring.jamAwal, saring.jamAkhir) : hasil
  const tampil = urutan ? urutkan(tersaring, urutan) : tersaring

  if (terbuka) {
    return (
      <TampilanPerbandingan
        info={susunBerdampingan(hasil, pilihan)}
        onTutup={() => ubahUrl((p) => p.delete(PARAM_TERBUKA), false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <form onSubmit={terapkanFilter} noValidate aria-label="Filter jam keberangkatan" className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="sm:w-kolom-tanggal">
            <Field label="Jam awal" galat={galatJam.jamAwal}>
              {(kontrol) => (
                <Input {...kontrol} type="time" name="jamAwal" value={isianJam.jamAwal} onChange={(e) => setIsianJam({ ...isianJam, jamAwal: e.target.value })} />
              )}
            </Field>
          </div>
          <div className="sm:w-kolom-tanggal">
            <Field label="Jam akhir" galat={galatJam.jamAkhir}>
              {(kontrol) => (
                <Input {...kontrol} type="time" name="jamAkhir" value={isianJam.jamAkhir} onChange={(e) => setIsianJam({ ...isianJam, jamAkhir: e.target.value })} />
              )}
            </Field>
          </div>
          <div className="flex gap-2 sm:pt-label-field">
            <Button type="submit" varian="secondary">
              Terapkan
            </Button>
            {saring && (
              <Button varian="ghost" onClick={hapusFilter}>
                Hapus filter
              </Button>
            )}
          </div>
        </form>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:w-kolom-tanggal">
            <Field label="Urutkan">
              {(kontrol) => (
                <Select {...kontrol} name="urutan" value={urutan} onChange={(e) => setUrutan(e.target.value as ArahUrutan | '')}>
                  <option value="">Waktu berangkat</option>
                  <option value="termurah">Harga termurah</option>
                  <option value="termahal">Harga termahal</option>
                </Select>
              )}
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted num" data-testid="jumlah-pilihan">
              {pilihan.length} dari {JUMLAH_PILIHAN_MAKSIMAL} dipilih
            </span>
            <Button
              varian="primary"
              disabled={!bolehBuka}
              alasan="Pilih 2 atau 3 penerbangan"
              onClick={() => ubahUrl((p) => p.set(PARAM_TERBUKA, '1'), false)}
            >
              Lihat perbandingan
            </Button>
          </div>
        </div>
      </Card>
      {pesanPilihan && <Alert varian="negative">{pesanPilihan}</Alert>}
      <DaftarPenerbangan
        daftar={tampil}
        label="Hasil pencarian penerbangan"
        aksi={(f) => (
          <div className="flex items-center gap-2">
            <Chip pressed={pilihan.includes(f.id)} aria-label={`Bandingkan ${f.nomorPenerbangan}`} onClick={() => ubahPilihan(f.id)}>
              Bandingkan
            </Chip>
            <LinkTombol to={`/pesan/${f.id}`} varian="primary" ukuran="sm" aria-label={`Pesan ${f.nomorPenerbangan}`}>
              Pesan
            </LinkTombol>
          </div>
        )}
      />
    </div>
  )
}
