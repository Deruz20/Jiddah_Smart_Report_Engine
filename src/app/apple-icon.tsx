import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  const filePath = path.join(process.cwd(), 'public', 'apple-touch-icon.png')
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
          width={180}
          height={180}
          style={{ width: 180, height: 180 }}
        />
      </div>
    ),
    { ...size }
  )
}