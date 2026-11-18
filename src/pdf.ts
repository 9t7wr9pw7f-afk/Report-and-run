import { jsPDF } from 'jspdf'
import type { Report, Item } from './types'
import { priorityLabels, statusLabels } from './types'
import { renderComposited, loadImage } from './render'

export async function exportPdf(report: Report, only: Item[] | null = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 14
  const items = only ?? report.items
  const pinIndex = new Map(report.items.map((it, i) => [it.id, i + 1]))

  const header = (title: string) => {
    doc.setFillColor(17, 45, 78)
    doc.rect(0, 0, pageW, 24, 'F')
    doc.setTextColor(255)
    doc.setFontSize(15)
    doc.text(title, margin, 11)
    doc.setFontSize(9)
    doc.text(
      `${new Date().toLocaleDateString('fr-FR')}  ·  Site: ${report.site || '-'}  ·  Client: ${report.client || '-'}  ·  Auteur: ${report.author || '-'}`,
      margin,
      18
    )
    doc.setTextColor(0)
  }

  const footer = () => {
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(
      `${report.name} · page ${doc.getNumberOfPages()}`,
      margin,
      pageH - 7
    )
    doc.setTextColor(0)
  }

  doc.addPage()
  header(report.name)
  doc.setFontSize(16)
  doc.setTextColor(30)
  doc.text('Rapport de réserves', margin, 40)
  doc.setFontSize(11)
  const summary = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.status] = (acc[it.status] || 0) + 1
    return acc
  }, {})
  const lines = [
    `Nombre de réserves / désordres : ${items.length}`,
    ...Object.entries(summary).map(([s, n]) => `  ${statusLabels[s as keyof typeof statusLabels]} : ${n}`),
  ]
  doc.setFontSize(11)
  let y = 50
  for (const l of lines) {
    doc.text(l, margin, y)
    y += 6
  }
  y += 4
  doc.setFontSize(12)
  doc.text('Sommaire', margin, y)
  y += 6
  doc.setFontSize(9)
  for (const it of items) {
    const line = `${pinIndex.get(it.id)}. ${it.title} — ${statusLabels[it.status]} / ${priorityLabels[it.priority]}${it.assignee ? ` / ${it.assignee}` : ''}`
    doc.text(line, margin + 4, y)
    y += 5
    if (y > pageH - 20) {
      footer()
      doc.addPage()
      header(report.name)
      y = 34
    }
  }

  let pageY = 0
  const newPage = () => {
    footer()
    doc.addPage()
    header(report.name)
    pageY = 32
  }
  newPage()

  for (const section of report.sections) {
    const sectionItems = items.filter((it) => it.sectionId === section.id)
    if (sectionItems.length === 0) continue
    if (pageY > pageH - 40) newPage()
    doc.setFontSize(13)
    doc.setTextColor(17, 45, 78)
    doc.text(section.name, margin, pageY)
    doc.setDrawColor(17, 45, 78)
    doc.line(margin, pageY + 2, pageW - margin, pageY + 2)
    pageY += 10
    doc.setTextColor(0)

    for (const it of sectionItems) {
      const imgH = 70
      if (pageY + imgH + 26 > pageH - 12) newPage()
      let canvas: HTMLCanvasElement
      try {
        canvas = await renderComposited(it.dataUrl, it.annotations, it.filters, 1200)
      } catch {
        continue
      }
      const iw = canvas.width
      const ih = canvas.height
      const drawH = Math.min(imgH, ((pageW - margin * 2) * ih) / iw)
      try {
        doc.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', margin, pageY, pageW - margin * 2, drawH)
      } catch {
        continue
      }
      pageY += drawH + 3
      doc.setFontSize(10)
      doc.setTextColor(17, 45, 78)
      doc.text(`#${pinIndex.get(it.id)} — ${it.title}`, margin, pageY)
      doc.setTextColor(0)
      pageY += 5
      doc.setFontSize(8)
      const info = `Statut: ${statusLabels[it.status]}  ·  Priorité: ${priorityLabels[it.priority]}${it.assignee ? `  ·  Assigné à: ${it.assignee}` : ''}${it.pin ? '  ·  Repère plan: ' + pinIndex.get(it.id) : ''}`
      doc.text(info, margin, pageY)
      pageY += 4.5
      if (it.description) {
        const desc = doc.splitTextToSize(it.description, pageW - margin * 2)
        doc.text(desc, margin, pageY)
        pageY += desc.length * 4
      }
      pageY += 6
    }
  }

  for (const plan of report.plans) {
    const planItems = items.filter((it) => it.pin?.planId === plan.id)
    if (planItems.length === 0) continue
    footer()
    doc.addPage()
    header(`Plan — ${plan.name}`)
    let img: HTMLImageElement
    try {
      img = await loadImage(plan.dataUrl)
    } catch {
      continue
    }
    const availW = pageW - margin * 2 - 20
    const availH = pageH - 50
    const ratio = img.width / img.height
    let drawW = availW
    let drawH = drawW / ratio
    if (drawH > availH) {
      drawH = availH
      drawW = drawH * ratio
    }
    const offX = margin
    const offY = 32
    try {
      doc.addImage(plan.dataUrl, 'JPEG', offX, offY, drawW, drawH)
    } catch {
      continue
    }
    const r = 3
    doc.setFontSize(7)
    for (const it of planItems) {
      if (!it.pin) continue
      const px = offX + it.pin.x * drawW
      const py = offY + it.pin.y * drawH
      const num = pinIndex.get(it.id)!
      doc.setFillColor(220, 30, 30)
      doc.circle(px, py, r, 'F')
      doc.setFillColor(220, 30, 30)
      doc.circle(px, py - r - 1.6, 3.6, 'F')
      doc.setTextColor(255)
      doc.text(String(num), px - 1.4, py - r + 0.2)
      doc.setTextColor(0)
    }
    doc.setFontSize(8)
    doc.text('Légende : numéro = ordre de la réserve dans le rapport', margin, pageH - 16)
    doc.setDrawColor(180)
    let ly = pageH - 12
    for (const it of planItems) {
      if (ly < offY + drawH + 2) break
      doc.text(`#${pinIndex.get(it.id)} ${it.title}`, margin + 2, ly)
      ly -= 4
    }
  }

  footer()
  doc.save(`${report.name.replace(/[^\w\-]+/g, '_')}.pdf`)
}
