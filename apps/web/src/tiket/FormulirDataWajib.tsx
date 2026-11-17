import type { GalatDataWajib, KolomDataWajib } from '@cutiterbang/domain'
import { Field, Input } from '../ui/index.ts'

export type IsianDataWajib = Record<KolomDataWajib, string>

export const KOLOM: { nama: KolomDataWajib; label: string; petunjuk?: string; jenis?: string; mode?: 'numeric' }[] = [
  { nama: 'namaLengkap', label: 'Nama lengkap', petunjuk: 'Sesuai kartu identitas, maksimal 100 karakter' },
  { nama: 'nomorIdentitas', label: 'Nomor identitas', petunjuk: '16 digit', mode: 'numeric' },
  { nama: 'tanggalLahir', label: 'Tanggal lahir', jenis: 'date' },
  { nama: 'nomorTelepon', label: 'Nomor telepon', petunjuk: '10 sampai 13 digit', jenis: 'tel', mode: 'numeric' },
  { nama: 'email', label: 'Email', jenis: 'email' },
]

/**
 * Lima kolom DataWajib (pemesanan US-2a dan Profil US-5a). `wajib` menandai kolom sebagai data wajib
 * dengan awalan "Wajib" pada petunjuknya.
 */
export function KolomFormulirDataWajib({
  isian,
  galat,
  onUbah,
  wajib = false,
}: {
  isian: IsianDataWajib
  galat: GalatDataWajib
  onUbah: (kolom: KolomDataWajib, nilai: string) => void
  wajib?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {KOLOM.map((kolom) => (
        <Field
          key={kolom.nama}
          label={kolom.label}
          petunjuk={wajib ? ['Wajib', kolom.petunjuk].filter(Boolean).join(' - ') : kolom.petunjuk}
          galat={galat[kolom.nama]}
        >
          {(kontrol) => (
            <Input
              {...kontrol}
              name={kolom.nama}
              type={kolom.jenis ?? 'text'}
              inputMode={kolom.mode}
              value={isian[kolom.nama]}
              onChange={(event) => onUbah(kolom.nama, event.target.value)}
            />
          )}
        </Field>
      ))}
    </div>
  )
}
