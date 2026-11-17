import type { Kota } from '@cutiterbang/domain'
import { Field, Select } from '../ui/index.ts'

// Pilihan kota asal/tujuan (US-3 langkah 1-2). Daftar dimuat oleh pemanggil (null = masih memuat)
// supaya kedua pilihan memakai satu daftar kota.
export function PilihKota({
  label,
  name,
  placeholder,
  nilai,
  daftar,
  galat,
  onPilih,
}: {
  label: string
  name: string
  placeholder: string
  nilai: string
  daftar: Kota[] | null
  galat?: string
  onPilih: (id: string) => void
}) {
  return (
    <Field label={label} galat={galat}>
      {(kontrol) => (
        <Select {...kontrol} name={name} value={nilai} disabled={!daftar} onChange={(event) => onPilih(event.target.value)}>
          <option value="">{daftar ? placeholder : 'Memuat…'}</option>
          {daftar?.map((kota) => (
            <option key={kota.id} value={String(kota.id)}>
              {kota.nama}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
}
