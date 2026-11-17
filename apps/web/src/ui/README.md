# UI kit (gaya A, acuan: design/mockups/clean.html)

Pakai komponen ini dan token di `src/index.css` (`bg-sheet text-muted border-border` ...). Jangan pakai varian `dark:`:
variabelnya sudah berganti per tema.

Komponen (impor dari `../ui/index.ts`): Button/LinkTombol/kelasTombol (primary, secondary, ghost; 32 atau 38px; `text` =
aksi kecil abu di sidebar, `tautan` = teks berwarna tautan; ukuran `ikon` = hanya ikon, `aria-label` wajib; jangan pakai
`<button>` mentah), Field + Input/Select (tanggal = Input type="date"), PilihanRadio (fieldset + legend + galat untuk satu
pilihan dari beberapa), Card (default, raised), PageTitle (+ `finding`), JudulBagian (h2 di dalam halaman), Memuat
(keterangan memuat), Pill (+ kelasPill), Chip (pressed), Kode (mono), Alert (negative/warning/neutral), EmptyState,
DataTable (kelas `num` untuk kolom angka), Ikon (garis 16px), TombolTema (tiga keadaan: Perangkat, Terang, Gelap).

Aturan rumah:
- Tanpa gradien, glow, blur kaca, bayangan saat diam (hanya menu/dialog melayang), emoji, penomoran 01/02, label huruf
  besar berjarak, label kecil di atas judul, atau ikon dalam kotak berwarna.
- Huruf kapital kalimat di mana-mana. Satu keluarga huruf (Plex Sans); Plex Mono hanya untuk kode booking/ID (`<Kode>`).
- Aksen biru hanya untuk data, tautan, dan fokus. Aksi utama = hampir hitam (`primary`).
- Teks berjalan warna ink >= 14px; abu hanya untuk teks sekunder (kontras >= 4.5:1).
- Radius hanya 16 (sheet) / 8 (card) / 6 (kontrol) / 4 (pill). Satu-satunya pengecualian: lingkaran penuh (`rounded-full`)
  untuk avatar orang. Pill status: positive, accent, warning, neutral, negative.
- Tanda merek memakai warna ink (bukan aksen) dan radius pill.
- Angka dengan `num` / tabular-nums. Isi halaman duduk di sheet putih; satu h1 per halaman lewat PageTitle.
