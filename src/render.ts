import type { Annotation, PhotoFilters } from './types'

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawArrowhead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, size: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 7), y2 - size * Math.sin(angle - Math.PI / 7))
  ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 7), y2 - size * Math.sin(angle + Math.PI / 7))
  ctx.closePath()
  ctx.fill()
}

export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  a: Annotation,
  w: number,
  h: number
) {
  const p = a.points
  const X = (v: number) => v * w
  const Y = (v: number) => v * h
  ctx.strokeStyle = a.color
  ctx.fillStyle = a.color
  ctx.lineWidth = a.size
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  switch (a.tool) {
    case 'pen':
    case 'line':
      ctx.beginPath()
      ctx.moveTo(X(p[0]), Y(p[1]))
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(X(p[i]), Y(p[i + 1]))
      ctx.stroke()
      break
    case 'arrow':
      ctx.beginPath()
      ctx.moveTo(X(p[0]), Y(p[1]))
      ctx.lineTo(X(p[2]), Y(p[3]))
      ctx.stroke()
      drawArrowhead(ctx, X(p[0]), Y(p[1]), X(p[2]), Y(p[3]), a.size * 3.5)
      break
    case 'circle': {
      const cx = (X(p[0]) + X(p[2])) / 2
      const cy = (Y(p[1]) + Y(p[3])) / 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, Math.abs(X(p[2]) - X(p[0])) / 2, Math.abs(Y(p[3]) - Y(p[1])) / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'rect':
      ctx.strokeRect(Math.min(X(p[0]), X(p[2])), Math.min(Y(p[1]), Y(p[3])), Math.abs(X(p[2]) - X(p[0])), Math.abs(Y(p[3]) - Y(p[1])))
      break
    case 'cross': {
      const s = a.size * 4
      const x = X(p[0])
      const y = Y(p[1])
      ctx.beginPath()
      ctx.moveTo(x - s, y - s * 0.4)
      ctx.lineTo(x - s * 0.4, y - s * 0.4)
      ctx.lineTo(x - s * 0.4, y - s)
      ctx.lineTo(x + s * 0.4, y - s)
      ctx.lineTo(x + s * 0.4, y - s * 0.4)
      ctx.lineTo(x + s, y - s * 0.4)
      ctx.lineTo(x + s, y + s * 0.4)
      ctx.lineTo(x + s * 0.4, y + s * 0.4)
      ctx.lineTo(x + s * 0.4, y + s)
      ctx.lineTo(x - s * 0.4, y + s)
      ctx.lineTo(x - s * 0.4, y + s * 0.4)
      ctx.lineTo(x - s, y + s * 0.4)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'tick': {
      const x = X(p[0])
      const y = Y(p[1])
      const s = a.size * 4
      ctx.lineWidth = a.size * 1.6
      ctx.beginPath()
      ctx.moveTo(x - s, y)
      ctx.lineTo(x - s * 0.2, y + s * 0.8)
      ctx.lineTo(x + s, y - s * 0.8)
      ctx.stroke()
      break
    }
    case 'polygon': {
      if (p.length >= 6) {
        ctx.beginPath()
        ctx.moveTo(X(p[0]), Y(p[1]))
        for (let i = 2; i < p.length; i += 2) ctx.lineTo(X(p[i]), Y(p[i + 1]))
        ctx.closePath()
        ctx.stroke()
      }
      break
    }
    case 'text':
      if (a.text) {
        ctx.font = `bold ${a.size * 6}px sans-serif`
        ctx.fillText(a.text, X(p[0]), Y(p[1]))
      }
      break
  }
}

export async function renderComposited(
  dataUrl: string,
  annotations: Annotation[],
  filters: PhotoFilters,
  maxDim = 1600
): Promise<HTMLCanvasElement> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg)`
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  ctx.filter = 'none'
  for (const a of annotations) drawAnnotation(ctx, a, canvas.width, canvas.height)
  if (filters.sharpen > 0) {
    const amount = (filters.sharpen / 100) * 0.8
    const src = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const out = ctx.createImageData(canvas.width, canvas.height)
    const d = src.data
    const o = out.data
    const k = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0]
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let i = 0
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              sum += d[((y + dy) * canvas.width + (x + dx)) * 4 + c] * k[i++]
            }
          }
          const idx = (y * canvas.width + x) * 4 + c
          o[idx] = Math.max(0, Math.min(255, sum))
        }
        o[(y * canvas.width + x) * 4 + 3] = 255
      }
    }
    ctx.putImageData(out, 0, 0)
  }
  return canvas
}
