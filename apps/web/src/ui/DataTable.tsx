import type { TableHTMLAttributes } from 'react'

/** Tabel data. Kolom angka: beri `className="num"` pada th dan td (rata kanan, angka tabular).
 *  Beri setiap `td` `data-label` (nama kolom): di bawah 640px baris menjadi blok label-nilai.
 *  Gaya ada di index.css (`.tabel`). Pembungkus menggulir sendiri agar halaman tidak bergulir ke samping. */
export function DataTable({ className, ...sisa }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={`tabel ${className ?? ''}`} {...sisa} />
    </div>
  )
}
