import type { ItemMenu } from '../shell/menu.ts'

export default function Placeholder({ item }: { item: ItemMenu }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{item.label}</h1>
      <p className="text-slate-600">Belum dibuat — Fase {item.fase}</p>
    </section>
  )
}
