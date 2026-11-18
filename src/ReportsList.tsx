import { useMemo, useState } from 'react'
import type { Report } from './types'
import { newReport } from './types'
import { cloudEnabled, deleteReport } from './storage'

export default function ReportsList({
  reports,
  setReports,
  onOpen,
}: {
  reports: Report[]
  setReports: (r: Report[]) => void
  onOpen: (r: Report) => void
}) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [sub, setSub] = useState('')
  const [section, setSection] = useState('')
  const [priority, setPriority] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const subcontractors = useMemo(
    () =>
      Array.from(
        new Set(reports.flatMap((r) => r.items.map((i) => i.assignee).filter(Boolean)))
      ).sort(),
    [reports]
  )
  const statuses = ['open', 'in_progress', 'resolved']
  const priorities = ['low', 'medium', 'high', 'critical']

  const filtered = reports.filter((r) => {
    if (q && !`${r.name} ${r.site} ${r.client}`.toLowerCase().includes(q.toLowerCase())) return false
    const items = r.items.filter((it) => {
      if (status && it.status !== status) return false
      if (sub && it.assignee !== sub) return false
      if (section && it.sectionId !== section) return false
      if (priority && it.priority !== priority) return false
      const d = new Date(it.createdAt)
      if (from && d < new Date(from)) return false
      if (to && d > new Date(`${to}T23:59:59`)) return false
      return true
    })
    if ((status || sub || section || priority || from || to) && items.length === 0) return false
    return true
  })

  const sections = useMemo(
    () => Array.from(new Set(reports.flatMap((r) => r.sections.map((s) => `${r.id}|${s.id}|${s.name}`)))),
    [reports]
  )

  return (
    <div className="reports-list">
      <header className="list-header">
        <h2>Mes rapports</h2>
        <button
          className="accent"
          onClick={() => {
            const r = newReport(`Rapport ${reports.length + 1}`)
            setReports([r, ...reports])
            onOpen(r)
          }}
        >
          ＋ Nouveau rapport
        </button>
      </header>

      <div className="search-panel">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un rapport, site, client…" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Statut : tous</option>
          <option value="open">Ouvert</option>
          <option value="in_progress">En cours</option>
          <option value="resolved">Résolu</option>
        </select>
        <select value={sub} onChange={(e) => setSub(e.target.value)}>
          <option value="">Sous-traitant : tous</option>
          {subcontractors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="">Section : toutes</option>
          {sections.map((s) => {
            const [rid, sid, name] = s.split('|')
            return (
              <option key={sid} value={sid}>
                {name}
              </option>
            )
          })}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Priorité : toutes</option>
          <option value="critical">Critique</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
        <label className="inline">
          Du <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="inline">
          Au <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button
          onClick={() => {
            setQ('')
            setStatus('')
            setSub('')
            setSection('')
            setPriority('')
            setFrom('')
            setTo('')
          }}
        >
          Réinitialiser
        </button>
      </div>

      {cloudEnabled ? (
        <p className="chip cloud">☁️ Sync cloud active (Supabase)</p>
      ) : (
        <p className="chip muted-chip">💾 Stockage local — configure Supabase pour le cloud (voir README)</p>
      )}

      {filtered.map((r) => {
        const done = r.items.filter((i) => i.status === 'resolved').length
        return (
          <div key={r.id} className="report-card" onClick={() => onOpen(r)}>
            <div>
              <h3>{r.name || 'Rapport sans nom'}</h3>
              <span className="muted small">
                {r.site || 'Site non défini'} · {new Date(r.updatedAt).toLocaleDateString('fr-FR')}
              </span>
              <div className="tag-row">
                <span className="chip small">{r.items.length} réserves</span>
                {r.plans.length > 0 && <span className="chip small">{r.plans.length} plan(s)</span>}
                {done < r.items.length && <span className="chip small warn">{r.items.length - done} en cours</span>}
                {r.items.length > 0 && done === r.items.length && <span className="chip small ok">Terminé</span>}
              </div>
            </div>
            <button
              className="danger small"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('Supprimer ce rapport ?')) {
                  deleteReport(r.id)
                  setReports(reports.filter((x) => x.id !== r.id))
                }
              }}
            >
              ✕
            </button>
          </div>
        )
      })}
      {filtered.length === 0 && <div className="panel empty">Aucun rapport ne correspond aux filtres.</div>}
    </div>
  )
}
