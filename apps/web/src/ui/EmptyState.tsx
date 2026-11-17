import type { ReactNode } from 'react'

/** Keadaan kosong: satu kalimat abu di dalam bingkai blok. Tanpa ilustrasi. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface px-5 py-10 text-center text-muted">
      {children}
    </div>
  )
}
