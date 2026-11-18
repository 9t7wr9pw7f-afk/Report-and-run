import type { Report } from './types'

const DB_NAME = 'reserves-and-run'
const STORE = 'reports'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listReports(): Promise<Report[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const rows = req.result as Report[]
      rows.sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(rows)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveReport(report: Report): Promise<void> {
  report.updatedAt = Date.now()
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(report)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  syncUpstream(report).catch(() => {})
}

export async function deleteReport(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getReport(id: string): Promise<Report | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as Report | undefined)
    req.onerror = () => reject(req.error)
  })
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY)

async function syncUpstream(report: Report): Promise<void> {
  if (!cloudEnabled) return
  const row = {
    id: report.id,
    name: report.name,
    site: report.site,
    client: report.client,
    author: report.author,
    data: JSON.stringify(report),
    updated_at: new Date(report.updatedAt).toISOString(),
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`Supabase sync failed: ${res.status}`)
}

export async function cloudListReports(): Promise<Report[] | null> {
  if (!cloudEnabled) return null
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reports?select=data&order=updated_at.desc`, {
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!res.ok) return null
  const rows = (await res.json()) as { data: string }[]
  return rows.map((r) => JSON.parse(r.data) as Report)
}
