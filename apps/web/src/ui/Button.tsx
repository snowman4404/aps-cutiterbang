import { useId } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'

export type VarianTombol = 'primary' | 'secondary' | 'ghost'
/** sm = 32px (toolbar), md = 38px (formulir). */
export type UkuranTombol = 'sm' | 'md'

interface Opsi {
  varian?: VarianTombol
  ukuran?: UkuranTombol
  penuh?: boolean
}

const VARIAN: Record<VarianTombol, string> = {
  primary:
    'bg-primary text-on-primary border border-primary font-semibold disabled:border-active disabled:bg-active disabled:text-muted',
  secondary:
    'bg-surface text-ink border border-control font-medium hover:border-ink disabled:bg-raised disabled:text-muted disabled:hover:border-control',
  ghost:
    'border border-transparent text-ink font-medium hover:bg-active disabled:text-muted disabled:hover:bg-transparent',
}
const UKURAN: Record<UkuranTombol, string> = { sm: 'h-8 px-4', md: 'h-[38px] px-5' }

/** Kelas tombol; dipakai juga untuk tautan yang tampil seperti tombol. */
export function kelasTombol({ varian = 'secondary', ukuran = 'md', penuh }: Opsi = {}) {
  return [
    'inline-flex items-center justify-center gap-2 rounded-control whitespace-nowrap transition-[transform,border-color,background-color] duration-100 active:scale-[.97] disabled:cursor-not-allowed disabled:active:scale-100',
    VARIAN[varian],
    UKURAN[ukuran],
    penuh ? 'w-full' : '',
  ].join(' ')
}

interface PropsTombol extends ButtonHTMLAttributes<HTMLButtonElement>, Opsi {
  /** Teks alasan yang ditampilkan di samping tombol saat `disabled`. */
  alasan?: string
}

export function Button({ varian, ukuran, penuh, alasan, className, type = 'button', ...sisa }: PropsTombol) {
  const idAlasan = useId()
  const tampilAlasan = Boolean(sisa.disabled && alasan)
  return (
    <>
      <button
        type={type}
        aria-describedby={tampilAlasan ? idAlasan : undefined}
        className={`${kelasTombol({ varian, ukuran, penuh })} ${className ?? ''}`}
        {...sisa}
      />
      {tampilAlasan && (
        <span id={idAlasan} className="ml-3 text-xs text-muted">
          {alasan}
        </span>
      )}
    </>
  )
}

export function LinkTombol({
  varian,
  ukuran,
  penuh,
  className,
  ...sisa
}: LinkProps & Opsi & { children?: ReactNode }) {
  return <Link className={`${kelasTombol({ varian, ukuran, penuh })} ${className ?? ''}`} {...sisa} />
}
