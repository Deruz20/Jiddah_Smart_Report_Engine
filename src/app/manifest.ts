import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jiddah Islamic Nur. & Pri. Day and Boarding School',
    short_name: 'Jiddah Islamic',
    description: 'Academic Assessment & Terminal Reporting System for Jiddah Islamic Nursery and Primary School',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0B132B',
    orientation: 'portrait',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    shortcuts: [
      {
        name: 'Marks Entry',
        short_name: 'Marks',
        description: 'Open Teacher Marks Entry',
        url: '/admin/marks',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Report Center',
        short_name: 'Reports',
        description: 'Open Academic Report Center',
        url: '/admin/reports',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Daily Roll Call',
        short_name: 'Attendance',
        description: 'Record Daily Roll Call',
        url: '/teacher/roll-call',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
