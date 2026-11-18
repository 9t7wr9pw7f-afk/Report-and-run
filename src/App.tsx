import { useEffect, useState } from 'react'
import type { Report } from './types'
import { cloudEnabled, cloudListReports, listReports, saveReport } from './storage'
import ReportsList from './ReportsList'
import ReportEditor from './ReportEditor'

export default function App() {
  const [reports, setReports] = useState<Report[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    listReports()
      .then(async (local) => {
        if (cloudEnabled) {
          const fromCloud = await cloudListReports()
          if (fromCloud) {
            const merged = fromCloud.slice()
            for (const l of local) {
              const idx = merged.findIndex((c) => c.id === l.id)
              if (idx === -1) merged.push(l)
              else if (l.updatedAt > merged[idx].updatedAt) merged[idx] = l
            }
            setReports(merged)
            return
          }
        }
        setReports(local)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const currentReport = reports.find((r) => r.id === current) || null

  if (!loaded) return <div className="loading">Chargement…</div>

  if (currentReport) {
    return (
      <ReportEditor
        report={currentReport}
        onChange={(r) => {
          setReports(reports.map((x) => (x.id === r.id ? r : x)))
          saveReport(r).catch(() => {})
        }}
        onBack={() => setCurrent(null)}
      />
    )
  }

  return (
    <div className="app">
      <h1>🏗️ Réserves &amp; Run</h1>
      <p className="tagline">Rapports photo de chantier · plans repérés · PDF pour les sous-traitants</p>
      <ReportsList
        reports={reports}
        setReports={(r) => {
          setReports(r)
          if (r.length > reports.length) saveReport(r[0]).catch(() => {})
        }}
        onOpen={(r) => setCurrent(r.id)}
      />
    </div>
  )
}
