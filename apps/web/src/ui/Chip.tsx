import type { ButtonHTMLAttributes } from 'react'

/** Tombol toggle (filter). `pressed` -> aria-pressed; aktif = isi ink dengan label warna sheet. */
export function Chip({
  pressed,
  className,
  ...sisa
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`h-[30px] whitespace-nowrap rounded-control border px-3 text-[13px] transition-[transform,color,border-color] duration-100 active:scale-[.97] ${
        pressed
          ? 'border-chip-on bg-chip-on text-on-chip'
          : 'border-control bg-surface text-muted hover:border-ink hover:text-ink'
      } ${className ?? ''}`}
      {...sisa}
    />
  )
}
