import sharp from 'sharp'

export function removeWhiteMatte(rgba: Buffer) {
  if (rgba.length % 4 !== 0) {
    throw new Error('RGBA input must contain complete pixels.')
  }

  const output = Buffer.allocUnsafe(rgba.length)

  for (let offset = 0; offset < rgba.length; offset += 4) {
    const red = rgba[offset]
    const green = rgba[offset + 1]
    const blue = rgba[offset + 2]
    const sourceAlpha = rgba[offset + 3]
    const whiteMatteAlpha = 255 - Math.min(red, green, blue)
    const alpha = Math.min(255, Math.round(sourceAlpha * whiteMatteAlpha * 1.45 / 255))

    output[offset + 3] = alpha
    if (alpha === 0) {
      output[offset] = 0
      output[offset + 1] = 0
      output[offset + 2] = 0
      continue
    }

    const matte = 255 - whiteMatteAlpha
    output[offset] = Math.max(0, Math.min(255, Math.round((red - matte) * 255 / whiteMatteAlpha)))
    output[offset + 1] = Math.max(0, Math.min(255, Math.round((green - matte) * 255 / whiteMatteAlpha)))
    output[offset + 2] = Math.max(0, Math.min(255, Math.round((blue - matte) * 255 / whiteMatteAlpha)))
  }

  return output
}

export async function createTransparentSignaturePng(input: Buffer) {
  const image = sharp(input, { limitInputPixels: 25_000_000 }).toColourspace('srgb').ensureAlpha().raw()
  const { data, info } = await image.toBuffer({ resolveWithObject: true })
  const transparent = removeWhiteMatte(data)

  const outputImage = sharp(transparent, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })

  if (info.width < 3 || info.height < 3) {
    return outputImage.png().toBuffer()
  }

  return outputImage.trim({
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    threshold: 12,
    margin: 6,
  }).png().toBuffer()
}
