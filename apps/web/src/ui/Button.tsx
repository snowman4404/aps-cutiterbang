import { useId } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'

/**
 * primary/secondary/ghost = tombol berbingkai. text = aksi sekunder kecil abu (sidebar); tautan = teks berwarna tautan
 * di dalam kalimat atau daftar. text dan tautan membawa ukurannya sendiri (parameter `ukuran` diabaikan).
 */
export type VarianTombol = 'primary' | 'secondary' | 'ghost' | 'text' | 'tautan'
/** sm = 32px (toolbar), md = 38px (formulir), ikon = 32px hanya ikon (wajib `aria-label`). */
export type UkuranTombol = 'sm' | 'md' | 'ikon'

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
  text: 'h-8 justify-start px-2.5 text-left text-xs text-muted hover:text-ink disabled:opacity-60',
  tautan: 'text-left text-link hover:underline disabled:opacity-60',
}
const UKURAN: Record<UkuranTombol, string> = { sm: 'h-8 px-4', md: 'h-[38px] px-5', ikon: 'h-8 px-2.5' }
const TANPA_UKURAN: readonly VarianTombol[] = ['text', 'tautan']

/** Kelas tombol; dipakai juga untuk tautan yang tampil seperti tombol. */
export function kelasTombol({ varian = 'secondary', ukuran = 'md', penuh }: Opsi = {}) {
  return [
    'inline-flex items-center gap-2 rounded-control whitespace-nowrap transition-[transform,border-color,background-color,color] duration-100 active:scale-[.97] disabled:cursor-not-allowed disabled:active:scale-100',
    TANPA_UKURAN.includes(varian) ? '' : 'justify-center',
    VARIAN[varian],
    TANPA_UKURAN.includes(varian) ? '' : UKURAN[ukuran],
    penuh ? 'w-full' : '',
  ].join(' ')
}

type PropsDasarTombol = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> &
  Omit<Opsi, 'ukuran'> & {
    /** Teks alasan yang ditampilkan di samping tombol saat `disabled`. */
    alasan?: string
  }

// Tombol hanya-ikon tidak punya teks, jadi nama aksesibelnya (`aria-label`) wajib.
type PropsTombol = PropsDasarTombol &
  ({ ukuran?: 'sm' | 'md'; 'aria-label'?: string } | { ukuran: 'ikon'; 'aria-label': string })

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
