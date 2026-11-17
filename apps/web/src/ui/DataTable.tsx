import type { TableHTMLAttributes } from 'react'

/** Tabel data. Kolom angka: beri `className="num"` pada th dan td (rata kanan, angka tabular).
 *  Gaya ada di index.css (`.tabel`). Pembungkus menggulir sendiri agar halaman tidak bergulir ke samping. */
export function DataTable({ className, ...sisa }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={`tabel ${className ?? ''}`} {...sisa} />
    </div>
  )
}
