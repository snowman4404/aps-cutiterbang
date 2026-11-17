// Pembantu format tanggal netral modul (dipakai cuti dan tiket); tidak boleh mengimpor modul mana pun.
const buatFormat = (hari: Intl.DateTimeFormatOptions) => {
  const pemformat = new Intl.DateTimeFormat('id-ID', { ...hari, day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return (iso: string) => pemformat.format(new Date(`${iso}T00:00:00Z`))
}

/** "2026-12-29" -> "29 Des 2026". */
export const formatTanggal = buatFormat({})

/** "2026-12-29" -> "Sel, 29 Des 2026". */
export const formatTanggalDenganHari = buatFormat({ weekday: 'short' })
