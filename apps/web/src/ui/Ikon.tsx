// Ikon garis 16px (stroke 1.5), inline. Tanpa pustaka ikon.
const BENTUK = {
  menu: <path d="M2 4h12M2 8h12M2 12h12" />,
  tutup: <path d="m3.5 3.5 9 9M12.5 3.5l-9 9" />,
  bulan: <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />,
  matahari: (
    <>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
    </>
  ),
  panah: <path d="m6 3.5 4.5 4.5L6 12.5" />,
  layar: (
    <>
      <rect x="2" y="2.5" width="12" height="8.5" rx="1.5" />
      <path d="M6 14h4M8 11v3" />
    </>
  ),
} as const

export type NamaIkon = keyof typeof BENTUK

export function Ikon({ nama, className }: { nama: NamaIkon; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`flex-none ${className ?? ''}`}
    >
      {BENTUK[nama]}
    </svg>
  )
}
