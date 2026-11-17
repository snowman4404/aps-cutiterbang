import type { ItemMenu } from '../shell/menu.ts'
import { EmptyState, PageTitle } from '../ui/index.ts'

// Halaman untuk menu yang belum punya layar sendiri.
export default function Placeholder({ item }: { item: ItemMenu }) {
  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding="Belum tersedia">{item.label}</PageTitle>
      <EmptyState>Halaman ini belum bisa dipakai.</EmptyState>
    </section>
  )
}
