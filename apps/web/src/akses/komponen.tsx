import type { ReactNode } from 'react'

export const kelasInput =
  'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600'
export const kelasTombol =
  'rounded-md bg-sky-700 px-4 py-2 font-medium text-white hover:bg-sky-800 disabled:opacity-60'

export function Kolom({
  label,
  galat,
  children,
}: {
  label: string
  galat?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {children}
      </label>
      {galat && (
        <span role="alert" className="mt-1 block text-sm text-red-700">
          {galat}
        </span>
      )}
    </div>
  )
}
