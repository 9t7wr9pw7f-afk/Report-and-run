export type Status = 'open' | 'in_progress' | 'resolved'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Tool = 'pen' | 'line' | 'arrow' | 'circle' | 'cross' | 'tick' | 'rect' | 'polygon' | 'text'

export interface Annotation {
  tool: Tool
  color: string
  size: number
  points: number[]
  text?: string
}

export interface PhotoFilters {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  sharpen: number
}

export interface Pin {
  planId: string
  x: number
  y: number
  label: number
}

export interface Item {
  id: string
  sectionId: string
  title: string
  description: string
  dataUrl: string
  originalDataUrl: string
  annotations: Annotation[]
  filters: PhotoFilters
  crop?: { x: number; y: number; w: number; h: number }
  pin?: Pin
  status: Status
  assignee: string
  priority: Priority
  category: string
  createdAt: number
}

export interface Section {
  id: string
  name: string
}

export interface Plan {
  id: string
  name: string
  dataUrl: string
}

export interface Subcontractor {
  id: string
  name: string
  email: string
}

export interface Report {
  id: string
  name: string
  site: string
  client: string
  author: string
  createdAt: number
  updatedAt: number
  sections: Section[]
  plans: Plan[]
  items: Item[]
  subcontractors: Subcontractor[]
}

export const defaultFilters: PhotoFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  sharpen: 0,
}

export const statusLabels: Record<Status, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
}

export const priorityLabels: Record<Priority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
}

export const filterCss = (f: PhotoFilters) =>
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export function newReport(name: string): Report {
  const now = Date.now()
  return {
    id: uid(),
    name,
    site: '',
    client: '',
    author: '',
    createdAt: now,
    updatedAt: now,
    sections: [{ id: uid(), name: 'Général' }],
    plans: [],
    items: [],
    subcontractors: [],
  }
}
