import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

/**
 * Dialog konfirmasi di atas `<dialog>` bawaan browser (modal: fokus terkunci, Esc menutup).
 * `buka` mengendalikan tampil/tutup; `onTutup` dipanggil saat ditutup dengan cara apa pun (Esc juga).
 * Taruh tombol di `aksi` (biasanya "Ya, ..." dan "Tidak"); tutup dari tombol dengan mengubah `buka` jadi false.
 */
export function Dialog({
  buka,
  onTutup,
  judul,
  aksi,
  children,
}: {
  buka: boolean
  onTutup: () => void
  judul: string
  aksi: ReactNode
  children?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idJudul = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (buka && !d.open) d.showModal()
    if (!buka && d.open) d.close()
  }, [buka])

  return (
    <dialog
      ref={ref}
      aria-labelledby={idJudul}
      onClose={onTutup}
      className="m-auto w-full max-w-dialog rounded-card border border-border bg-sheet p-5 text-ink shadow-lg backdrop:bg-black/40"
    >
      <h2 id={idJudul} className="text-lg font-semibold">
        {judul}
      </h2>
      {children && <div className="mt-2 text-muted">{children}</div>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">{aksi}</div>
    </dialog>
  )
}
