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
      {(p) => (
        <Select {...p} name={name} value={nilai} disabled={!daftar} onChange={(e) => onPilih(e.target.value)}>
          <option value="">{daftar ? placeholder : 'Memuat…'}</option>
          {daftar?.map((k) => (
            <option key={k.id} value={String(k.id)}>
              {k.nama}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
}
