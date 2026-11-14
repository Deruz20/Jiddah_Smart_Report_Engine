import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jiddah Islamic Nur. & Pri. Day and Boarding School',
    short_name: 'Jiddah Islamic',
    description: 'Academic Assessment & Terminal Reporting System for Jiddah Islamic Nursery and Primary School',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#039D4A',
    orientation: 'portrait',
    categories: ['education'],
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
  }
}
