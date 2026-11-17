// Data seed modul cuti (stand-in Data Kepegawaian). Murni data, tanpa I/O, supaya tes dan e2e
// bisa memakainya. Semua tanggal dihitung dari `tahun` (tahun berjalan saat seed) agar demo selalu
// bermakna; cuti dipasang pada Senin terdekat supaya jumlah hari kerjanya stabil dari tahun ke tahun.
import { hariDalamMinggu, tahunDari, tambahHari, type StatusPengajuanCuti } from '@cutiterbang/domain'

export const JATAH_CUTI_TAHUNAN = 12

export interface DataPegawai {
  nama: string
  nomorIndukPegawai: string
  jatahCutiTahunan: number
}
export interface DataHariLibur {
  tanggal: string
  keterangan: string
}
export interface DataPengajuan {
  nomorIndukPegawai: string
  tanggalMulai: string
  tanggalAkhir: string
  status: StatusPengajuanCuti
}

export const NIP = {
  agus: '198003122005011002',
  dewi: '198507202010012005',
  eko: '199001152015031001',
  fitri: '198811302012122003',
  gunawan: '197905082003121001',
  hana: '199208242018032004',
  indra: '198402172009011006',
  lestari: '199506102020122008',
} as const

const PEGAWAI: [string, string][] = [
  ['Agus Setiawan', NIP.agus],
  ['Dewi Kartika', NIP.dewi],
  ['Eko Prasetyo', NIP.eko], // tidak punya cuti disetujui tahun ini: "Belum ada riwayat cuti"
  ['Fitri Handayani', NIP.fitri], // melebihi jatah: sisa cuti negatif
  ['Gunawan Wibowo', NIP.gunawan], // cuti lintas 31 Des (dihitung penuh ke tahun mulainya)
  ['Hana Permata', NIP.hana],
  ['Indra Kusuma', NIP.indra],
  ['Lestari Ningsih', NIP.lestari],
]

const duaDigit = (angka: number) => String(angka).padStart(2, '0')
const tgl = (tahun: number, bulan: number, tanggal: number) => `${tahun}-${duaDigit(bulan)}-${duaDigit(tanggal)}`

/** Senin pertama pada atau setelah tanggal ini. */
function senin(tahun: number, bulan: number, tanggal: number) {
  let hari = tgl(tahun, bulan, tanggal)
  while (hariDalamMinggu(hari) !== 1) hari = tambahHari(hari, 1)
  return hari
}

export function buatDataCuti(tahun: number): {
  pegawai: DataPegawai[]
  hariLibur: DataHariLibur[]
  pengajuan: DataPengajuan[]
} {
  const pegawai = PEGAWAI.map(([nama, nomorIndukPegawai]) => ({
    nama,
    nomorIndukPegawai,
    jatahCutiTahunan: JATAH_CUTI_TAHUNAN,
  }))

  const ajukan = (nip: string, mulai: string, hari: number, status: StatusPengajuanCuti): DataPengajuan => ({
    nomorIndukPegawai: nip,
    tanggalMulai: mulai,
    tanggalAkhir: tambahHari(mulai, hari),
    status,
  })
  const seninPada = (bulan: number, tanggal: number) => senin(tahun, bulan, tanggal)

  const pengajuan: DataPengajuan[] = [
    // Agus: 5 + 10 hari kerja disetujui, satu menunggu.
    ajukan(NIP.agus, seninPada(2, 2), 4, 'Disetujui'),
    ajukan(NIP.agus, seninPada(4, 6), 11, 'Disetujui'),
    ajukan(NIP.agus, seninPada(11, 23), 2, 'Diajukan'),
    // Dewi: Senin sampai Senin berikutnya, melewati akhir pekan dan cuti bersama (5 hari kerja).
    ajukan(NIP.dewi, seninPada(7, 6), 4, 'Disetujui'),
    ajukan(NIP.dewi, seninPada(9, 14), 7, 'Disetujui'),
    ajukan(NIP.dewi, seninPada(10, 12), 4, 'Diajukan'),
    ajukan(NIP.dewi, seninPada(5, 18), 1, 'Ditolak'),
    // Eko: hanya cuti tahun lalu, satu ditolak, satu diajukan => riwayat tahun ini kosong.
    ajukan(NIP.eko, senin(tahun - 1, 11, 3), 4, 'Disetujui'),
    ajukan(NIP.eko, seninPada(6, 8), 2, 'Ditolak'),
    ajukan(NIP.eko, seninPada(12, 7), 3, 'Diajukan'),
    // Fitri: 10 + 5 = 15 hari kerja dari jatah 12 => sisa -3.
    ajukan(NIP.fitri, seninPada(1, 12), 11, 'Disetujui'),
    ajukan(NIP.fitri, seninPada(3, 2), 4, 'Disetujui'),
    // Gunawan: lintas 31 Des (dua arah).
    {
      nomorIndukPegawai: NIP.gunawan,
      tanggalMulai: tgl(tahun - 1, 12, 29),
      tanggalAkhir: tgl(tahun, 1, 3),
      status: 'Disetujui',
    },
    ajukan(NIP.gunawan, seninPada(2, 16), 4, 'Disetujui'),
    {
      nomorIndukPegawai: NIP.gunawan,
      tanggalMulai: tgl(tahun, 12, 28),
      tanggalAkhir: tgl(tahun + 1, 1, 5),
      status: 'Disetujui',
    },
    // Hana
    ajukan(NIP.hana, seninPada(6, 15), 4, 'Disetujui'),
    ajukan(NIP.hana, seninPada(8, 24), 1, 'Diajukan'),
    ajukan(NIP.hana, seninPada(9, 28), 2, 'Ditolak'),
    // Indra: ada pengajuan yang berjalan di sekitar pertengahan November.
    ajukan(NIP.indra, seninPada(10, 19), 4, 'Disetujui'),
    ajukan(NIP.indra, seninPada(11, 16), 4, 'Diajukan'),
    // Lestari
    ajukan(NIP.lestari, seninPada(7, 20), 4, 'Disetujui'),
    ajukan(NIP.lestari, seninPada(12, 14), 4, 'Diajukan'),
  ]
  // Hari libur nasional (tanggal tetap, pendekatan) untuk SETIAP tahun yang disentuh pengajuan mana pun, supaya
  // tidak ada hari libur yang terhitung sebagai hari kerja di cuti seed.
  const tahunPengajuan = pengajuan.flatMap((baris) => [tahunDari(baris.tanggalMulai), tahunDari(baris.tanggalAkhir)])
  const tahunAwal = Math.min(tahun, ...tahunPengajuan)
  const tahunAkhir = Math.max(tahun, ...tahunPengajuan)
  const tetap: [number, number, string][] = [
    [1, 1, 'Tahun Baru'],
    [3, 20, 'Idulfitri (perkiraan)'],
    [3, 21, 'Idulfitri (perkiraan)'],
    [5, 1, 'Hari Buruh'],
    [5, 14, 'Kenaikan Yesus Kristus (perkiraan)'],
    [6, 1, 'Hari Lahir Pancasila'],
    [8, 17, 'Hari Kemerdekaan RI'],
    [12, 25, 'Hari Natal'],
  ]
  const hariLibur: DataHariLibur[] = []
  for (let tahunLibur = tahunAwal; tahunLibur <= tahunAkhir; tahunLibur++) {
    for (const [bulan, tanggal, keterangan] of tetap) hariLibur.push({ tanggal: tgl(tahunLibur, bulan, tanggal), keterangan })
  }
  // Cuti bersama demo di hari Rabu: cuti Dewi melewati hari libur dan akhir pekan sekaligus.
  hariLibur.push({ tanggal: tambahHari(senin(tahun, 9, 14), 2), keterangan: 'Cuti bersama (demo)' })

  return { pegawai, hariLibur, pengajuan }
}
