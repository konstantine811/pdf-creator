export function isHeicFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return (
    lower.endsWith('.heic') ||
    lower.endsWith('.heif') ||
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence'
  )
}

/** Convert HEIC/HEIF to a JPEG Blob that browsers and pdf-lib can use. */
export async function convertHeicToJpeg(file: File): Promise<{
  blob: Blob
  mimeType: 'image/jpeg'
}> {
  const { default: heic2any } = await import('heic2any')

  try {
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95,
    })

    const blob = Array.isArray(result) ? result[0] : result
    if (!(blob instanceof Blob)) {
      throw new Error(`Не вдалося конвертувати HEIC: ${file.name}`)
    }

    return { blob, mimeType: 'image/jpeg' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Не вдалося прочитати HEIC з iPhone (${file.name}). ${message}`,
    )
  }
}
