import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  const filePath = path.join(process.cwd(), 'public', 'icon-512.png')
  const base64 = fs.readFileSync(filePath).toString('base64')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <img
          src={`data:image/png;base64,${base64}`}
          width={512}
          height={512}
          style={{ width: 512, height: 512 }}
        />
      </div>
    ),
    { ...size }
  )
}