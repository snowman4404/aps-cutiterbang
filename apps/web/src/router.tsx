import { createBrowserRouter, Navigate } from 'react-router'
import HalamanDaftar from './akses/HalamanDaftar.tsx'
import HalamanMasuk from './akses/HalamanMasuk.tsx'
import { Butuh } from './akses/Butuh.tsx'
import Beranda from './halaman/Beranda.tsx'
import Placeholder from './halaman/Placeholder.tsx'
import Layout from './shell/Layout.tsx'
import { MENU } from './shell/menu.ts'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Beranda /> },
      { path: '/masuk', element: <HalamanMasuk /> },
      { path: '/daftar', element: <HalamanDaftar /> },
      ...MENU.map((item) => ({
        path: item.path,
        element:
          item.peran === 'publik' ? (
            <Placeholder item={item} />
          ) : (
            <Butuh peran={item.peran}>
              <Placeholder item={item} />
            </Butuh>
          ),
      })),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
