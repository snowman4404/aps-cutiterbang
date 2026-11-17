import { LinkTombol } from '../ui/index.ts'

/** Pasangan Masuk / Daftar untuk pengunjung yang belum masuk (bar atas di desktop, sidebar di ponsel). */
export function TombolMasukDaftar({ className }: { className?: string }) {
  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <LinkTombol to="/masuk" varian="secondary" ukuran="sm">
        Masuk
      </LinkTombol>
      <LinkTombol to="/daftar" varian="primary" ukuran="sm">
        Daftar
      </LinkTombol>
    </div>
  )
}
