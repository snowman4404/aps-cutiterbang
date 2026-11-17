import { Outlet } from 'react-router'
import { BarAtas } from './BarAtas.tsx'
import { Sidebar } from './Sidebar.tsx'
import { useMenuPonsel } from './useMenuPonsel.ts'

/** Rangka halaman: sidebar + bar atas di sekeliling sheet putih tempat isi halaman (`Outlet`) duduk. */
export default function Layout() {
  const menu = useMenuPonsel()
  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] desk:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
      <Sidebar menuTerbuka={menu.terbuka} />
      <BarAtas menuTerbuka={menu.terbuka} alihkanMenu={menu.alihkan} />
      <main className="min-w-0 border border-border bg-sheet px-4 pb-10 pt-5 max-desk:border-x-0 max-desk:border-b-0 desk:mb-[var(--sheet-inset)] desk:mr-[var(--sheet-inset)] desk:rounded-sheet desk:px-6 desk:pt-6">
        <Outlet />
      </main>
    </div>
  )
}
