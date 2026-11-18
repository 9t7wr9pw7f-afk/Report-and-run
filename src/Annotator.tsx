import { useEffect, useRef, useState } from 'react'
import type { Annotation, Item, Tool } from './types'
import { defaultFilters, filterCss } from './types'
import { loadImage } from './render'

const tools: { id: Tool; label: string }[] = [
  { id: 'pen', label: '✏️ Dessin' },
  { id: 'arrow', label: '➡️ Flèche' },
  { id: 'circle', label: '⭕ Cercle' },
  { id: 'rect', label: '▭ Rectangle' },
  { id: 'cross', label: '❌ Croix' },
  { id: 'tick', label: '✔️ Cochage' },
  { id: 'polygon', label: '⬡ Polygone' },
  { id: 'text', label: '🅣 Texte' },
]

const colors = ['#e03131', '#f08c00', '#2f9e44', '#1971c2', '#f7f7f7', '#111111']

export default function Annotator({
  item,
  onChange,
}: {
  item: Item
  onChange: (patch: Partial<Item>) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('arrow')
  const [color, setColor] = useState('#e03131')
  const [size, setSize] = useState(4)
  const draftRef = useRef<Annotation | null>(null)
  const polyRef = useRef<number[]>([])
  const reRender = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = canvas.parentElement!.querySelector('img') as HTMLImageElement
    const resize = () => {
      if (!img.width || !img.height) return
      canvas.width = img.width
      canvas.height = img.height
      redraw()
    }
    if (img.complete) resize()
    else img.onload = resize
    const ro = new ResizeObserver(resize)
    ro.observe(img)
    return () => ro.disconnect()
  }, [item.id])

  async function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = canvas.parentElement!.querySelector('img') as HTMLImageElement
    if (!img.width) return
    if (canvas.width !== img.width) {
      canvas.width = img.width
      canvas.height = img.height
    }
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const { drawAnnotation } = await import('./render')
    for (const a of item.annotations) drawAnnotation(ctx, a, canvas.width, canvas.height)
    if (polyRef.current.length >= 2) {
      drawAnnotation(
        ctx,
        { tool: 'pen', color, size, points: [...polyRef.current] },
        canvas.width,
        canvas.height
      )
    }
  }

  useEffect(() => {
    redraw()
  }, [item.annotations, reRender.current])

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  const onDown = (e: React.PointerEvent) => {
    const p = pos(e)
    if (tool === 'polygon') {
      polyRef.current.push(p.x, p.y)
      reRender.current++
      redraw()
      return
    }
    if (tool === 'text') {
      const text = window.prompt('Texte à ajouter :')
      if (text) {
        onChange({
          annotations: [...item.annotations, { tool: 'text', color, size, points: [p.x, p.y], text }],
        })
      }
      return
    }
    const startPoints =
      tool === 'line' || tool === 'arrow' || tool === 'rect'
        ? [p.x, p.y, p.x, p.y]
        : tool === 'circle'
        ? [p.x, p.y, p.x, p.y]
        : [p.x, p.y]
    draftRef.current = { tool, color, size, points: startPoints }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onMove = (e: React.PointerEvent) => {
    const d = draftRef.current
    if (!d || e.buttons === 0) return
    const p = pos(e)
    if (d.tool === 'pen') d.points.push(p.x, p.y)
    else {
      d.points[2] = p.x
      d.points[3] = p.y
    }
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    import('./render').then(({ drawAnnotation }) => {
      drawAnnotation(ctx, d, canvas.width, canvas.height)
      for (const a of item.annotations) drawAnnotation(ctx, a, canvas.width, canvas.height)
    })
  }

  const onUp = () => {
    const d = draftRef.current
    if (!d) return
    draftRef.current = null
    onChange({ annotations: [...item.annotations, d] })
  }

  const finishPolygon = () => {
    if (polyRef.current.length >= 6) {
      onChange({
        annotations: [
          ...item.annotations,
          { tool: 'polygon', color, size, points: [...polyRef.current] },
        ],
      })
    }
    polyRef.current = []
    redraw()
  }

  const undo = () => onChange({ annotations: item.annotations.slice(0, -1) })
  const clearAll = () => onChange({ annotations: [] })

  async function applyCrop() {
    const x1 = window.prompt('Recadrer — gauche en % (0-100) :', '10')
    if (!x1) return
    const y1 = window.prompt('Haut en % :', '10')
    const x2 = window.prompt('Droite en % :', '90')
    const y2 = window.prompt('Bas en % :', '90')
    const n = (v: string | null, d: number) => Math.min(100, Math.max(0, Number(v ?? d) || d))
    const box = { x: n(x1, 0), y: n(y1, 0), w: n(x2, 100) - n(x1, 0), h: n(y2, 100) - n(y1, 0) }
    if (box.w <= 0 || box.h <= 0) return
    const img = await loadImage(item.dataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round((img.width * box.w) / 100)
    canvas.height = Math.round((img.height * box.h) / 100)
    const ctx = canvas.getContext('2d')!
    const scaleX = img.width / (canvas.clientWidth || img.width)
    ctx.drawImage(
      img,
      (img.width * box.x) / 100,
      (img.height * box.y) / 100,
      (img.width * box.w) / 100,
      (img.height * box.h) / 100,
      0,
      0,
      canvas.width,
      canvas.height
    )
    onChange({ dataUrl: canvas.toDataURL('image/jpeg', 0.9) })
  }

  const resetFilters = () => onChange({ filters: { ...defaultFilters } })

  return (
    <div className="annotator">
      <div className="img-wrap">
        <img src={item.dataUrl} alt={item.title} style={{ filter: filterCss(item.filters) }} draggable={false} />
        <canvas
          ref={canvasRef}
          className="overlay"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        />
      </div>

      <div className="toolbar">
        <div className="tools">
          {tools.map((t) => (
            <button
              key={t.id}
              className={tool === t.id ? 'active' : ''}
              onClick={() => {
                if (polyRef.current.length) finishPolygon()
                setTool(t.id)
              }}
            >
              {t.label}
            </button>
          ))}
          {tool === 'polygon' && (
            <button className="accent" onClick={finishPolygon}>
              ✓ Terminer polygone
            </button>
          )}
        </div>
        <div className="tools">
          {colors.map((c) => (
            <button
              key={c}
              className={`swatch ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <label className="inline">
            Épaisseur
            <input
              type="range"
              min={2}
              max={12}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <button onClick={undo}>↩︎ Annuler</button>
          <button className="danger" onClick={clearAll}>
            Tout effacer
          </button>
        </div>

        <details className="filters">
          <summary>🎨 Filtres photo</summary>
          <div className="filter-grid">
            {(
              [
                ['brightness', 'Luminosité', 50, 200],
                ['contrast', 'Contraste', 50, 200],
                ['saturation', 'Saturation', 0, 250],
                ['hue', 'Teinte', -180, 180],
                ['sharpen', 'Netteté', 0, 100],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key}>
                {label}
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={item.filters[key]}
                  onChange={(e) =>
                    onChange({ filters: { ...item.filters, [key]: Number(e.target.value) } })
                  }
                />
              </label>
            ))}
            <button onClick={resetFilters}>Réinitialiser</button>
            <button onClick={applyCrop}>Recadrer</button>
            <button
              onClick={async () => {
                if (window.confirm('Revenir à la photo d’origine ? Les annotations seront conservées.')) {
                  onChange({ dataUrl: item.originalDataUrl, filters: { ...defaultFilters } })
                }
              }}
            >
              Photo d'origine
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}
