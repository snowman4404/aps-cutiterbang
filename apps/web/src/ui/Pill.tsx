import type { ReactNode } from 'react'

export type VarianPill = 'positive' | 'accent' | 'warning' | 'neutral' | 'negative'

const KELAS: Record<VarianPill, string> = {
  positive: 'bg-pill-positive-bg text-pill-positive-ink',
  accent: 'bg-pill-accent-bg text-pill-accent-ink',
  warning: 'bg-pill-warning-bg text-pill-warning-ink',
  neutral: 'bg-pill-neutral-bg text-pill-neutral-ink',
  negative: 'bg-pill-negative-bg text-pill-negative-ink',
}

export const kelasPill = (varian: VarianPill) => KELAS[varian]

// Pemetaan yang disarankan untuk StatusBooking (diterapkan di fase pemesanan):
//   Confirmed -> positive, Booked -> accent, WaitingForThePayment -> warning, Cancelled -> neutral.
export function Pill({ varian = 'neutral', children }: { varian?: VarianPill; children: ReactNode }) {
  return (
    <span
      className={`inline-block flex-none whitespace-nowrap rounded-pill px-2 py-0.5 text-xs font-medium ${KELAS[varian]}`}
    >
      {children}
    </span>
  )
}
