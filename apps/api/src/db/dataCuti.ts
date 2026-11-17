// Data seed modul cuti (stand-in Data Kepegawaian). Murni data, tanpa I/O, supaya tes dan e2e
// bisa memakainya. Semua tanggal dihitung dari `tahun` (tahun berjalan saat seed) agar demo selalu
// bermakna; cuti dipasang pada Senin terdekat supaya jumlah hari kerjanya stabil dari tahun ke tahun.
import { hariDalamMinggu, tambahHari, type StatusPengajuanCuti } from '@cutiterbang/domain'

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

const pad = (n: number) => String(n).padStart(2, '0')
const tgl = (t: number, b: number, h: number) => `${t}-${pad(b)}-${pad(h)}`

/** Senin pertama pada atau setelah tanggal ini. */
function senin(t: number, b: number, h: number) {
  let d = tgl(t, b, h)
  while (hariDalamMinggu(d) !== 1) d = tambahHari(d, 1)
  return d
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

  // Hari libur nasional (tanggal tetap, pendekatan) untuk tahun lalu, ini, dan depan.
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
  for (const t of [tahun - 1, tahun, tahun + 1]) {
    for (const [b, h, keterangan] of tetap) hariLibur.push({ tanggal: tgl(t, b, h), keterangan })
  }
  // Cuti bersama demo di hari Rabu: cuti Dewi melewati hari libur dan akhir pekan sekaligus.
  const rabuBersama = tambahHari(senin(tahun, 9, 14), 2)
  hariLibur.push({ tanggal: rabuBersama, keterangan: 'Cuti bersama (demo)' })

  const p = (nip: string, mulai: string, hari: number, status: StatusPengajuanCuti): DataPengajuan => ({
    nomorIndukPegawai: nip,
    tanggalMulai: mulai,
    tanggalAkhir: tambahHari(mulai, hari),
    status,
  })
  const M = (b: number, h: number) => senin(tahun, b, h)

  const pengajuan: DataPengajuan[] = [
    // Agus: 5 + 10 hari kerja disetujui, satu menunggu.
    p(NIP.agus, M(2, 2), 4, 'Disetujui'),
    p(NIP.agus, M(4, 6), 11, 'Disetujui'),
    p(NIP.agus, M(11, 23), 2, 'Diajukan'),
    // Dewi: Senin sampai Senin berikutnya, melewati akhir pekan dan cuti bersama (5 hari kerja).
    p(NIP.dewi, M(7, 6), 4, 'Disetujui'),
    p(NIP.dewi, M(9, 14), 7, 'Disetujui'),
    p(NIP.dewi, M(10, 12), 4, 'Diajukan'),
    p(NIP.dewi, M(5, 18), 1, 'Ditolak'),
    // Eko: hanya cuti tahun lalu, satu ditolak, satu diajukan => riwayat tahun ini kosong.
    p(NIP.eko, senin(tahun - 1, 11, 3), 4, 'Disetujui'),
    p(NIP.eko, M(6, 8), 2, 'Ditolak'),
    p(NIP.eko, M(12, 7), 3, 'Diajukan'),
    // Fitri: 10 + 5 = 15 hari kerja dari jatah 12 => sisa -3.
    p(NIP.fitri, M(1, 12), 11, 'Disetujui'),
    p(NIP.fitri, M(3, 2), 4, 'Disetujui'),
    // Gunawan: lintas 31 Des (dua arah).
    {
      nomorIndukPegawai: NIP.gunawan,
      tanggalMulai: tgl(tahun - 1, 12, 29),
      tanggalAkhir: tgl(tahun, 1, 3),
      status: 'Disetujui',
    },
    p(NIP.gunawan, M(2, 16), 4, 'Disetujui'),
    {
      nomorIndukPegawai: NIP.gunawan,
      tanggalMulai: tgl(tahun, 12, 28),
      tanggalAkhir: tgl(tahun + 1, 1, 5),
      status: 'Disetujui',
    },
    // Hana
    p(NIP.hana, M(6, 15), 4, 'Disetujui'),
    p(NIP.hana, M(8, 24), 1, 'Diajukan'),
    p(NIP.hana, M(9, 28), 2, 'Ditolak'),
    // Indra: ada pengajuan yang berjalan di sekitar pertengahan November.
    p(NIP.indra, M(10, 19), 4, 'Disetujui'),
    p(NIP.indra, M(11, 16), 4, 'Diajukan'),
    // Lestari
    p(NIP.lestari, M(7, 20), 4, 'Disetujui'),
    p(NIP.lestari, M(12, 14), 4, 'Diajukan'),
  ]

  return { pegawai, hariLibur, pengajuan }
}
