import { useEffect, useState } from 'react'
import { Alert, Field, Select } from '../ui/index.ts'
import { panggil } from '../akses/api.ts'
import type { PegawaiRingkas } from './format.ts'

// Langkah 1-2 US-1b/1c: daftar pegawai (nama + NIP), HRD memilih satu.
export function PilihPegawai({ nip, onPilih }: { nip: string; onPilih: (nip: string) => void }) {
  const [daftar, setDaftar] = useState<PegawaiRingkas[] | null>(null)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    let batal = false
    void panggil<{ pegawai: PegawaiRingkas[]; pesan?: string }>('/cuti/pegawai').then((r) => {
      if (batal) return
      if (r.status === 200) setDaftar(r.data.pegawai)
      else setGalat(r.data.pesan ?? 'Gagal memuat daftar pegawai')
    })
    return () => {
      batal = true
    }
  }, [])

  if (galat) return <Alert varian="negative">{galat}</Alert>
  return (
    <div className="max-w-[420px]">
      <Field label="Pegawai">
        {(p) => (
          <Select {...p} name="pegawai" value={nip} disabled={!daftar} onChange={(e) => onPilih(e.target.value)}>
            <option value="">{daftar ? 'Pilih pegawai' : 'Memuat…'}</option>
            {daftar?.map((d) => (
              <option key={d.nomorIndukPegawai} value={d.nomorIndukPegawai}>
                {d.nama} ({d.nomorIndukPegawai})
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  )
}
