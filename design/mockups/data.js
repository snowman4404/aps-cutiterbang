// Sample data for the style mockups. Times are local: CGK in WIB (UTC+7), DPS in WITA (UTC+8).
window.MOCK = {
  user: { nama: 'Sari Dewi', inisial: 'SD', peran: 'Member Frequent Traveller' },
  pencarian: { tanggal: 'Selasa, 15 Desember 2026', tanggalInput: '2026-12-15', penumpang: 1 },
  penerbangan: [
    { maskapai: 'Nusa Air', kode: 'NA', nomor: 'NA 210', berangkat: '05:40', tiba: '08:35', harga: 1145000, sisa: 12 },
    { maskapai: 'Rajawali Air', kode: 'RJ', nomor: 'RJ 451', berangkat: '07:15', tiba: '10:05', harga: 1320000, sisa: 4 },
    { maskapai: 'Samudra Jet', kode: 'SJ', nomor: 'SJ 118', berangkat: '09:30', tiba: '12:25', harga: 985000, sisa: 0 },
    { maskapai: 'Kencana Air', kode: 'KA', nomor: 'KA 732', berangkat: '12:50', tiba: '15:40', harga: 1050000, sisa: 23 },
    { maskapai: 'Nusa Air', kode: 'NA', nomor: 'NA 214', berangkat: '15:20', tiba: '18:15', harga: 1210000, sisa: 9 },
    { maskapai: 'Rajawali Air', kode: 'RJ', nomor: 'RJ 457', berangkat: '18:45', tiba: '21:35', harga: 1095000, sisa: 2 },
    { maskapai: 'Samudra Jet', kode: 'SJ', nomor: 'SJ 126', berangkat: '20:10', tiba: '23:00', harga: 890000, sisa: 17 },
  ],
  pemesanan: [
    { kode: 'KDX7QM', rute: 'CGK → KNO', tanggal: '2 Des 2026', status: 'Confirmed' },
    { kode: 'PLN3RA', rute: 'CGK → UPG', tanggal: '20 Des 2026', status: 'Booked' },
    { kode: 'WB5ZTC', rute: 'CGK → SUB', tanggal: '5 Jan 2027', status: 'Waiting for the payment' },
    { kode: 'TQ8VHE', rute: 'CGK → YIA', tanggal: '9 Nov 2026', status: 'Cancelled' },
  ],
  jam: [
    { id: 'semua', label: 'Semua jam', dari: 0, sampai: 24 },
    { id: 'pagi', label: 'Pagi 05–11', dari: 5, sampai: 11 },
    { id: 'siang', label: 'Siang 11–15', dari: 11, sampai: 15 },
    { id: 'sore', label: 'Sore 15–18', dari: 15, sampai: 18 },
    { id: 'malam', label: 'Malam 18–24', dari: 18, sampai: 24 },
  ],
}
// Duration: arrival is in WITA, one hour ahead of the WIB departure.
{
  const menit = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  for (const p of window.MOCK.penerbangan) {
    p.menit = menit(p.tiba) - 60 - menit(p.berangkat)
    console.assert(p.menit > 0 && p.menit < 180, 'durasi', p.nomor)
  }
}
