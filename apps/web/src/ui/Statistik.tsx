import type { ReactNode } from 'react'

/**
 * Angka besar (32px, tabular) dengan catatan/Pill di sebelahnya. `label` opsional adalah teks sekunder biasa
 * (14px, abu) di bawah angka: tidak ada label kecil di atas angka.
 */
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
      <div className="flex flex-wrap items-center gap-3">
        <span data-testid={testId} className="text-stat font-semibold leading-none tabular-nums">
          {nilai}
        </span>
        {catatan}
      </div>
      {label && <span className="text-sm text-muted">{label}</span>}
    </div>
  )
}
