import type { ReactNode } from 'react'

/** Angka besar (32px, tabular) dengan label kecil opsional di atas dan catatan/Pill di sebelahnya. */
export function Statistik({
  nilai,
  label,
  catatan,
  testId,
}: {
  nilai: ReactNode
  label?: string
  catatan?: ReactNode
  testId?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <div className="flex flex-wrap items-center gap-3">
        <span data-testid={testId} className="text-stat font-semibold leading-none tabular-nums">
          {nilai}
        </span>
        {catatan}
      </div>
    </div>
  )
}
