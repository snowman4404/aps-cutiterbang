import { useId } from 'react'

export interface OpsiRadio<T extends string> {
  nilai: T
  label: string
}

/** Versi Field untuk satu pilihan dari beberapa: fieldset + legend (gaya label Field), opsi radio, galat terhubung lewat aria-describedby. */
export function PilihanRadio<T extends string>({
  legend,
  name,
  nilai,
  pilihan,
  onPilih,
  galat,
}: {
  legend: string
  name: string
  nilai: T
  pilihan: readonly OpsiRadio<T>[]
  onPilih: (nilai: T) => void
  galat?: string
}) {
  const idGalat = `${useId()}-galat`
  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={galat ? idGalat : undefined}
    >
      <legend className="mb-1.5 text-xs font-medium text-muted">{legend}</legend>
      {pilihan.map((opsi) => (
        <label key={opsi.nilai} className="flex min-h-[34px] items-center gap-2.5">
          <input
            type="radio"
            name={name}
            value={opsi.nilai}
            className="h-4 w-4 accent-primary"
            checked={nilai === opsi.nilai}
            onChange={() => onPilih(opsi.nilai)}
          />
          {opsi.label}
        </label>
      ))}
      {galat && (
        <span id={idGalat} role="alert" className="text-sm text-pill-negative-ink">
          {galat}
        </span>
      )}
    </fieldset>
  )
}
