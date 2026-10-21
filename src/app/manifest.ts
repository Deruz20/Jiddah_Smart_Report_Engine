import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jiddah Islamic School - Report Engine',
    short_name: 'Jiddah School',
    description: 'Smart Report Engine for Jiddah Islamic Nursery and Primary School, Nsaggu',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f5b48',
    theme_color: '#0f5b48',
    orientation: 'portrait',
    categories: ['education'],
    icons: [
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}