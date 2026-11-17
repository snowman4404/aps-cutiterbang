import type { ItemMenu } from '../shell/menu.ts'
import { EmptyState, PageTitle } from '../ui/index.ts'

export default function Placeholder({ item }: { item: ItemMenu }) {
  return (
    <section className="flex flex-col gap-6">
      <PageTitle finding={`Belum dibuat — Fase ${item.fase}`}>{item.label}</PageTitle>
      <EmptyState>Fitur ini akan tersedia setelah fase pembangunannya selesai.</EmptyState>
    </section>
  )
}
