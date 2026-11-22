// Shrink a photo in the browser before upload (a phone photo is 3-6 MB; we send about 150 KB).
export function fitSize(w: number, h: number, max = 1280): { w: number; h: number } {
  const s = Math.min(1, max / Math.max(w, h))
  return { w: Math.round(w * s), h: Math.round(h * s) }
}

export async function compressImage(file: File, max = 1280, quality = 0.7): Promise<Blob> {
  try {
    if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return file
    const bmp = await createImageBitmap(file)
    const { w, h } = fitSize(bmp.width, bmp.height, max)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bmp, 0, 0, w, h)
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file // never block the user because compression failed
  }
}
