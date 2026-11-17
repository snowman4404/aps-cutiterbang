import type { HTMLAttributes } from 'react'

/** Panel: surface + garis 1px, radius 8, padding 20. `raised` = latar raised tanpa garis (mis. kotak cari). */
export function Card({
  varian = 'default',
  className,
  ...sisa
}: HTMLAttributes<HTMLDivElement> & { varian?: 'default' | 'raised' }) {
  const gaya = varian === 'raised' ? 'bg-raised' : 'border border-border bg-surface'
  return <div className={`rounded-card p-5 ${gaya} ${className ?? ''}`} {...sisa} />
}
