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
