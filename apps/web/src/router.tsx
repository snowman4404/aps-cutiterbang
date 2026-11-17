import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import HalamanDaftar from './akses/HalamanDaftar.tsx'
import HalamanMasuk from './akses/HalamanMasuk.tsx'
import { HanyaUntuk } from './akses/HanyaUntuk.tsx'
import HalamanDaftarPengajuanCuti from './cuti/HalamanDaftarPengajuanCuti.tsx'
import HalamanRiwayatCuti from './cuti/HalamanRiwayatCuti.tsx'
import HalamanSisaCuti from './cuti/HalamanSisaCuti.tsx'
import HalamanCariPenerbangan from './tiket/HalamanCariPenerbangan.tsx'
import HalamanPemesanan from './tiket/HalamanPemesanan.tsx'
import HalamanTiketSaya from './tiket/HalamanTiketSaya.tsx'
import Beranda from './halaman/Beranda.tsx'
import Placeholder from './halaman/Placeholder.tsx'
import Layout from './shell/Layout.tsx'
import { MENU, peranTerbatas } from './shell/menu.ts'

// Halaman yang sudah dibangun menggantikan Placeholder (kunci = path menu).
const HALAMAN: Record<string, ReactNode> = {
  '/cuti/pengajuan': <HalamanDaftarPengajuanCuti />,
  '/cuti/riwayat': <HalamanRiwayatCuti />,
  '/cuti/sisa': <HalamanSisaCuti />,
  '/penerbangan': <HalamanCariPenerbangan />,
  '/tiket-saya': <HalamanTiketSaya />,
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Beranda /> },
      { path: '/masuk', element: <HalamanMasuk /> },
      { path: '/daftar', element: <HalamanDaftar /> },
      // US-2a: bukan item menu (dibuka dari tombol Pesan di hasil pencarian).
      {
        path: '/pesan/:idPenerbangan',
        element: (
          <HanyaUntuk peran={['CalonPenumpang']}>
            <HalamanPemesanan />
          </HanyaUntuk>
        ),
      },
      ...MENU.map((item) => {
        const halaman = HALAMAN[item.path] ?? <Placeholder item={item} />
        const terbatas = peranTerbatas(item)
        return {
          path: item.path,
          element: terbatas ? <HanyaUntuk peran={terbatas}>{halaman}</HanyaUntuk> : halaman,
        }
      }),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
