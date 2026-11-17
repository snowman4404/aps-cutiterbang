import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export const kelasKontrol =
  'block h-[38px] w-full rounded-control border border-control bg-sheet px-3 text-sm text-ink placeholder:text-faint aria-[invalid=true]:border-pill-negative-ink disabled:bg-raised disabled:text-muted'

/** Props a11y yang diberikan Field ke kontrolnya. */
export interface PropsKontrol {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

/** Label di atas (12px, 500, abu), kontrol di bawahnya, galat di bawah kontrol. */
export function Field({
  label,
  galat,
  petunjuk,
  children,
}: {
  label: string
  galat?: string
  petunjuk?: string
  children: (p: PropsKontrol) => ReactNode
}) {
  const id = useId()
  const idGalat = `${id}-galat`
  const idPetunjuk = `${id}-petunjuk`
  const deskripsi = [petunjuk ? idPetunjuk : '', galat ? idGalat : ''].filter(Boolean).join(' ')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': galat ? true : undefined,
        'aria-describedby': deskripsi || undefined,
      })}
      {petunjuk && (
        <span id={idPetunjuk} className="text-xs text-muted">
          {petunjuk}
        </span>
      )}
      {galat && (
        <span id={idGalat} role="alert" className="text-sm text-pill-negative-ink">
          {galat}
        </span>
      )}
    </div>
  )
}

/** Input teks/email/sandi/angka. Untuk tanggal pakai `type="date"`: gayanya sama. */
export function Input({ className, ...sisa }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${kelasKontrol} ${className ?? ''}`} {...sisa} />
}

export function Select({ className, ...sisa }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${kelasKontrol} ${className ?? ''}`} {...sisa} />
}
