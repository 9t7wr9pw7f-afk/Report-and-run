import { useMemo, useRef, useState } from 'react'
import type { Item, Priority, Report, Status } from './types'
import { defaultFilters, priorityLabels, statusLabels, uid } from './types'
import Annotator from './Annotator'
import PlanEditor from './PlanEditor'
import { exportPdf } from './pdf'

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.readAsDataURL(file)
  })
}

export default function ReportEditor({
  report,
  onChange,
  onBack,
}: {
  report: Report
  onChange: (r: Report) => void
  onBack: () => void
}) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [tab, setTab] = useState<'reserve' | 'plan'>('reserve')
  const [search, setSearch] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const planInputRef = useRef<HTMLInputElement>(null)

  const patch = (p: Partial<Report>) => onChange({ ...report, ...p })
  const activeItem = report.items.find((it) => it.id === activeItemId) || null

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const sectionId = report.sections[0]?.id
    const items: Item[] = []
    let n = report.items.length + 1
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const dataUrl = await fileToDataUrl(file)
      items.push({
        id: uid(),
        sectionId,
        title: `Réserve ${n}`,
        description: '',
        dataUrl,
        originalDataUrl: dataUrl,
        annotations: [],
        filters: { ...defaultFilters },
        status: 'open',
        assignee: '',
        priority: 'medium',
        category: '',
        createdAt: Date.now(),
      })
      n++
    }
    patch({ items: [...report.items, ...items] })
    if (!activeItemId && items[0]) setActiveItemId(items[0].id)
  }

  const addPlan = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const plans = [...report.plans]
    let i = plans.length + 1
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      plans.push({ id: uid(), name: file.name.replace(/\.[^.]+$/, ''), dataUrl: await fileToDataUrl(file) })
      i++
    }
    patch({ plans })
  }

  const updateItem = (itemId: string, p: Partial<Item>) =>
    patch({ items: report.items.map((it) => (it.id === itemId ? { ...it, ...p } : it)) })

  const deleteItem = (itemId: string) => {
    patch({ items: report.items.filter((it) => it.id !== itemId) })
    if (activeItemId === itemId) setActiveItemId(null)
  }

  const addSection = () => {
    const name = window.prompt('Nom de la section (ex: Lot électricité, RDC, Étage 2) :')
    if (name) patch({ sections: [...report.sections, { id: uid(), name }] })
  }

  const assignees = useMemo(
    () => Array.from(new Set(report.items.map((i) => i.assignee).filter(Boolean))),
    [report.items]
  )

  const filtered = report.items.filter((it) =>
    search
      ? [it.title, it.description, it.assignee, it.category].join(' ').toLowerCase().includes(search.toLowerCase())
      : true
  )

  const pinNumber = (it: Item) => report.items.findIndex((x) => x.id === it.id) + 1

  return (
    <div className="editor">
      <header className="editor-header">
        <button onClick={onBack}>← Rapports</button>
        <input
          className="title-input"
          value={report.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Nom du rapport"
        />
        <button className="accent" onClick={() => exportPdf(report).catch(alert)}>
          📄 Exporter le PDF
        </button>
      </header>

      <div className="meta-grid">
        <label>
          Site
          <input value={report.site} onChange={(e) => patch({ site: e.target.value })} placeholder="Adresse du chantier" />
        </label>
        <label>
          Client
          <input value={report.client} onChange={(e) => patch({ client: e.target.value })} placeholder="Client / maître d'œuvre" />
        </label>
        <label>
          Auteur
          <input value={report.author} onChange={(e) => patch({ author: e.target.value })} placeholder="Ton nom" />
        </label>
      </div>

      <div className="tabs">
        <button className={tab === 'reserve' ? 'active' : ''} onClick={() => setTab('reserve')}>
          Réserves / désordres
        </button>
        <button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>
          Plans & repérage
        </button>
      </div>

      {tab === 'reserve' && (
        <div className="editor-body">
          <div className="item-list">
            <div className="list-controls">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une réserve…" />
              <button className="accent" onClick={() => photoInputRef.current?.click()}>
                ＋ Photo(s)
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => addPhotos(e.target.files)}
              />
            </div>
            {filtered.map((it) => (
              <div
                key={it.id}
                className={`item-row ${it.status} ${activeItemId === it.id ? 'selected' : ''}`}
                onClick={() => setActiveItemId(it.id)}
              >
                <span className="pin-num">{pinNumber(it)}</span>
                <div className="thumbs">
                  <img src={it.dataUrl} alt={it.title} />
                  {it.pin && <span className="badge plan-badge">📍</span>}
                </div>
                <div className="item-info">
                  <strong>{it.title}</strong>
                  <span className="muted small">
                    {statusLabels[it.status]} · {priorityLabels[it.priority]}
                    {it.assignee ? ` · ${it.assignee}` : ''}
                  </span>
                </div>
                <button
                  className="danger small"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Supprimer cette réserve ?')) deleteItem(it.id)
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div className="panel empty">Ajoute des photos pour créer des réserves.</div>}
            <div className="sections-box">
              <h4>Sections</h4>
              {report.sections.map((s) => (
                <span key={s.id} className="chip">
                  {s.name} ({report.items.filter((i) => i.sectionId === s.id).length})
                </span>
              ))}
              <button onClick={addSection}>＋ Section</button>
            </div>
          </div>

          {activeItem && (
            <div className="item-detail">
              <Annotator item={activeItem} onChange={(p) => updateItem(activeItem.id, p)} />
              <div className="form-grid">
                <label>
                  Titre
                  <input
                    value={activeItem.title}
                    onChange={(e) => updateItem(activeItem.id, { title: e.target.value })}
                  />
                </label>
                <label>
                  Section
                  <select
                    value={activeItem.sectionId}
                    onChange={(e) => updateItem(activeItem.id, { sectionId: e.target.value })}
                  >
                    {report.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Statut
                  <select
                    value={activeItem.status}
                    onChange={(e) => updateItem(activeItem.id, { status: e.target.value as Status })}
                  >
                    {Object.entries(statusLabels).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priorité
                  <select
                    value={activeItem.priority}
                    onChange={(e) => updateItem(activeItem.id, { priority: e.target.value as Priority })}
                  >
                    {Object.entries(priorityLabels).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sous-traitant / responsable
                  <input
                    list="assignees"
                    value={activeItem.assignee}
                    onChange={(e) => updateItem(activeItem.id, { assignee: e.target.value })}
                    placeholder="Ex: SARL Dupont"
                  />
                  <datalist id="assignees">
                    {assignees.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Catégorie
                  <input
                    value={activeItem.category}
                    onChange={(e) => updateItem(activeItem.id, { category: e.target.value })}
                    placeholder="Ex: Fissure, peinture, étanchéité"
                  />
                </label>
                <label className="full">
                  Description
                  <textarea
                    rows={3}
                    value={activeItem.description}
                    onChange={(e) => updateItem(activeItem.id, { description: e.target.value })}
                    placeholder="Décris avec précision le désordre et son emplacement"
                  />
                </label>
                {activeItem.pin && (
                  <p className="hint full">📍 {pinNumber(activeItem)} repérée sur le plan — onglet « Plans & repérage ».</p>
                )}
              </div>
              <button
                className="accent"
                onClick={() => exportPdf(report, [activeItem]).catch(alert)}
              >
                Exporter cette réserve en PDF
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'plan' && (
        <div className="editor-body">
          <PlanEditor
            report={report}
            activeItem={activeItem}
            onChange={patch}
            onSelectItem={(it) => {
              setActiveItemId(it.id)
              setTab('plan')
            }}
          />
          <div className="plan-upload">
            <button onClick={() => planInputRef.current?.click()}>＋ Ajouter un plan</button>
            <input ref={planInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPlan(e.target.files)} />
            {report.plans.map((p) => (
              <div key={p.id} className="chip">
                {p.name}
                <button
                  className="danger small"
                  onClick={() =>
                    patch({
                      plans: report.plans.filter((x) => x.id !== p.id),
                      items: report.items.map((it) => (it.pin?.planId === p.id ? { ...it, pin: undefined } : it)),
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
