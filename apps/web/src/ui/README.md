# UI kit (gaya A, acuan: design/mockups/clean.html)

Pakai komponen ini dan token di `src/index.css` (`bg-sheet text-muted border-border` ...). Jangan pakai varian `dark:`:
variabelnya sudah berganti per tema.

Komponen (impor dari `../ui/index.ts`): Button/LinkTombol/kelasTombol (primary, secondary, ghost; 32 atau 38px),
Field + Input/Select (tanggal = Input type="date"), Card (default, raised), PageTitle (+ `finding`), Pill (+ kelasPill),
Chip (pressed), Kode (mono), Alert (negative/warning/neutral), EmptyState, DataTable (kelas `num` untuk kolom angka),
Dialog (konfirmasi modal di atas `<dialog>`: `buka`, `onTutup`, `judul`, `aksi` berisi tombol; satu-satunya tempat bayangan),
Statistik (angka besar `text-stat` + label/catatan/Pill), Ikon (garis 16px), TombolTema.

Ukuran khusus form dan statistik dipakai lewat token di `src/index.css` (`max-w-form`, `sm:w-kolom-tanggal`,
`sm:pt-label-field`, `text-stat`), bukan nilai `[..px]` di halaman.

Aturan rumah:
- Tanpa gradien, glow, blur kaca, bayangan saat diam (hanya menu/dialog melayang), emoji, penomoran 01/02, label huruf
  besar berjarak, label kecil di atas judul, atau ikon dalam kotak berwarna.
- Huruf kapital kalimat di mana-mana. Satu keluarga huruf (Plex Sans); Plex Mono hanya untuk kode booking/ID (`<Kode>`).
- Aksen biru hanya untuk data, tautan, dan fokus. Aksi utama = hampir hitam (`primary`).
- Teks berjalan warna ink >= 14px; abu hanya untuk teks sekunder (kontras >= 4.5:1).
- Radius hanya 16 (sheet) / 8 (card) / 6 (kontrol) / 4 (pill). Pill status: positive, accent, warning, neutral, negative.
- Angka dengan `num` / tabular-nums. Isi halaman duduk di sheet putih; satu h1 per halaman lewat PageTitle.
