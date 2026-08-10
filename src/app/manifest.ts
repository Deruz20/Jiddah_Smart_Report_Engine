import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jiddah Smart Report Engine',
    short_name: 'Jiddah',
    description: 'Smart Report Engine for Jiddah',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
