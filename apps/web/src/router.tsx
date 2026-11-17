import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import HalamanDaftar from './akses/HalamanDaftar.tsx'
import HalamanMasuk from './akses/HalamanMasuk.tsx'
import { Butuh } from './akses/Butuh.tsx'
import HalamanDaftarPengajuanCuti from './cuti/HalamanDaftarPengajuanCuti.tsx'
import HalamanRiwayatCuti from './cuti/HalamanRiwayatCuti.tsx'
import HalamanSisaCuti from './cuti/HalamanSisaCuti.tsx'
import Beranda from './halaman/Beranda.tsx'
import Placeholder from './halaman/Placeholder.tsx'
import Layout from './shell/Layout.tsx'
import { MENU } from './shell/menu.ts'

// Halaman yang sudah dibangun menggantikan Placeholder (kunci = path menu).
const HALAMAN: Record<string, ReactNode> = {
  '/cuti/pengajuan': <HalamanDaftarPengajuanCuti />,
  '/cuti/riwayat': <HalamanRiwayatCuti />,
  '/cuti/sisa': <HalamanSisaCuti />,
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Beranda /> },
      { path: '/masuk', element: <HalamanMasuk /> },
      { path: '/daftar', element: <HalamanDaftar /> },
      ...MENU.map((item) => {
        const halaman = HALAMAN[item.path] ?? <Placeholder item={item} />
        return {
          path: item.path,
          element: item.peran === 'publik' ? halaman : <Butuh peran={item.peran}>{halaman}</Butuh>,
        }
      }),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
