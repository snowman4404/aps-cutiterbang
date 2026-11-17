import type { ReactNode } from 'react'

export type VarianAlert = 'negative' | 'warning' | 'neutral'

const KELAS: Record<VarianAlert, string> = {
  negative: 'bg-pill-negative-bg text-pill-negative-ink',
  warning: 'bg-pill-warning-bg text-pill-warning-ink',
  neutral: 'bg-pill-neutral-bg text-pill-neutral-ink',
}

/** Pesan galat/peringatan satu blok. Teks pesan ditaruh langsung di dalamnya. */
export function Alert({
  varian = 'negative',
  role = 'alert',
  children,
}: {
  varian?: VarianAlert
  role?: 'alert' | 'status'
  children: ReactNode
}) {
  return (
    <div role={role} className={`rounded-card p-4 ${KELAS[varian]}`}>
      {children}
    </div>
  )
}
