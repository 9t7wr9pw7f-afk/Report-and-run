import { useEffect, useRef, useState } from 'react'
import type { Item, Report } from './types'

export default function PlanEditor({
  report,
  activeItem,
  onChange,
  onSelectItem,
}: {
  report: Report
  activeItem: Item | null
  onChange: (patch: Partial<Report>) => void
  onSelectItem: (item: Item) => void
}) {
  const [activePlanId, setActivePlanId] = useState<string>(report.plans[0]?.id || '')
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!report.plans.find((p) => p.id === activePlanId)) {
      setActivePlanId(report.plans[0]?.id || '')
    }
  }, [report.plans])

  if (report.plans.length === 0) {
    return (
      <div className="panel empty">Aucun plan pour l'instant. Importe un plan (image au format paysage conseillé).</div>
    )
  }
  const plan = report.plans.find((p) => p.id === activePlanId) || report.plans[0]
  const pinnedItems = report.items.filter((it) => it.pin?.planId === plan.id)
  const allItems = report.items
  const pinNumber = (it: Item) => report.items.findIndex((x) => x.id === it.id) + 1

  const addPin = (e: React.MouseEvent) => {
    if (!activeItem) return
    const rect = wrapRef.current!.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    onChange({
      items: report.items.map((it) =>
        it.id === activeItem.id ? { ...it, pin: { planId: plan.id, x, y, label: pinNumber(it) } } : it
      ),
    })
  }

  const movePin = (itemId: string, clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    onChange({
      items: report.items.map((it) =>
        it.id === itemId && it.pin ? { ...it, pin: { ...it.pin, x, y } } : it
      ),
    })
  }

  return (
    <div className="plan-editor">
      <div className="plan-tabs">
        {report.plans.map((p) => (
          <button key={p.id} className={p.id === plan.id ? 'active' : ''} onClick={() => setActivePlanId(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      {activeItem ? (
        <p className="hint">
          Clique sur le plan pour placer le repère de «&nbsp;{activeItem.title || 'réservation'}&nbsp;».
          Glisse une épingle pour la déplacer.
        </p>
      ) : (
        <p className="hint">
          Sélectionne une réserve dans la liste ci-contre pour poser son repère sur le plan.
        </p>
      )}
      <div className="plan-wrap" ref={wrapRef} onClick={addPin}>
        <img src={plan.dataUrl} alt={plan.name} draggable={false} />
        {pinnedItems.map((it) => (
          <div
            key={it.id}
            className={`pin ${activeItem?.id === it.id ? 'active' : ''} status-${it.status}`}
            style={{ left: `${it.pin!.x * 100}%`, top: `${it.pin!.y * 100}%` }}
            onClick={(e) => {
              e.stopPropagation()
              onSelectItem(it)
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              const onMove = (ev: MouseEvent) => movePin(it.id, ev.clientX, ev.clientY)
              const onUp = () => {
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
          >
            <span className="pin-num">{pinNumber(it)}</span>
          </div>
        ))}
      </div>
      <table className="pin-table">
        <thead>
          <tr>
            <th>Repère</th>
            <th>Réserve</th>
            <th>Statut</th>
            <th>Assigné</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pinnedItems.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">Aucun repère sur ce plan.</td>
            </tr>
          )}
          {pinnedItems.map((it) => (
            <tr key={it.id} className={activeItem?.id === it.id ? 'selected' : ''} onClick={() => onSelectItem(it)}>
              <td>#{pinNumber(it)}</td>
              <td>{it.title}</td>
              <td>{it.status}</td>
              <td>{it.assignee || '—'}</td>
              <td>
                <button
                  className="danger small"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange({
                      items: report.items.map((x) => (x.id === it.id ? { ...x, pin: undefined } : x)),
                    })
                  }}
                >
                  Retirer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        {allItems.length} réserve(s) au total — {pinnedItems.length} repérée(s) sur ce plan.
      </p>
      <p className="muted small">
        Astuce : ajoute plusieurs plans (RDC, étage, façades…) via «&nbsp;Ajouter un plan&nbsp;».
      </p>
    </div>
  )
}
