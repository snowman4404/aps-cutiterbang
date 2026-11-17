import type { PegawaiRingkas } from '@cutiterbang/domain'
import { Alert, Field, Select } from '../ui/index.ts'
import { useMuat } from '../lib/useMuat.ts'

// Langkah 1-2 US-1b/1c: daftar pegawai (nama + NIP), HRD memilih satu.
export function PilihPegawai({ nip, onPilih }: { nip: string; onPilih: (nip: string) => void }) {
  const { data, galat } = useMuat<{ pegawai: PegawaiRingkas[] }>('/cuti/pegawai', 'Gagal memuat daftar pegawai')
  const daftar = data?.pegawai ?? null

  if (galat) return <Alert varian="negative">{galat}</Alert>
  return (
    <div className="max-w-form">
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
