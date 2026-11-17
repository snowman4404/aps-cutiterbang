import type { ReactNode } from 'react'

/** Kode booking / ID. Satu-satunya tempat yang memakai IBM Plex Mono. */
export function Kode({ children }: { children: ReactNode }) {
  return <code className="font-mono text-sm font-medium">{children}</code>
}
