import type { ReactNode } from 'react'

/** Judul bagian di dalam halaman (h2); judul halaman memakai PageTitle. */
export function JudulBagian({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold tracking-[-0.01em]">{children}</h2>
}
