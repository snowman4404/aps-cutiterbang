import type { ReactNode } from 'react'

/** Judul halaman (h1) + satu baris temuan opsional; sorot angka/nama dengan <strong>. */
export function PageTitle({ children, finding }: { children: ReactNode; finding?: ReactNode }) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em]">{children}</h1>
      {finding && <p className="mt-1.5 text-muted [&_strong]:font-semibold [&_strong]:text-ink">{finding}</p>}
    </div>
  )
}
