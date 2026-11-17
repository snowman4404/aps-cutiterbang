import { useEffect, useState } from 'react'
import { Alert, Field, Select } from '../ui/index.ts'
import { panggil } from '../lib/api.ts'
import type { PegawaiRingkas } from './format.ts'

// Langkah 1-2 US-1b/1c: daftar pegawai (nama + NIP), HRD memilih satu.
export function PilihPegawai({ nip, onPilih }: { nip: string; onPilih: (nip: string) => void }) {
  const [daftar, setDaftar] = useState<PegawaiRingkas[] | null>(null)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    let batal = false
    void panggil<{ pegawai: PegawaiRingkas[]; pesan?: string }>('/cuti/pegawai').then((respons) => {
      if (batal) return
      if (respons.status === 200) setDaftar(respons.data.pegawai)
      else setGalat(respons.data.pesan ?? 'Gagal memuat daftar pegawai')
    })
    return () => {
      batal = true
    }
  }, [])

  if (galat) return <Alert varian="negative">{galat}</Alert>
  return (
    <div className="max-w-[420px]">
      <Field label="Pegawai">
        {(kontrol) => (
          <Select {...kontrol} name="pegawai" value={nip} disabled={!daftar} onChange={(event) => onPilih(event.target.value)}>
            <option value="">{daftar ? 'Pilih pegawai' : 'Memuat…'}</option>
            {daftar?.map((pegawai) => (
              <option key={pegawai.nomorIndukPegawai} value={pegawai.nomorIndukPegawai}>
                {pegawai.nama} ({pegawai.nomorIndukPegawai})
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  )
}
