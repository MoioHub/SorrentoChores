import { formatDistanceToNowStrict } from 'date-fns'
import { it } from 'date-fns/locale'

// "2 giorni fa", "5 minuti fa", ecc. in italiano
export function timeAgo(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNowStrict(d, { addSuffix: true, locale: it })
}

// Iniziali dal nome: "Maria Rossi" -> "MR"
export function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

// Piccola palette di colori caldi — usata come default in UI di creazione profilo
export const PRESET_COLORS = [
  '#E76F51', // coral
  '#F4A261', // sand
  '#E9C46A', // mustard
  '#2A9D8F', // teal
  '#457B9D', // blue
  '#8E7DBE', // lavender
  '#A3B18A', // sage
  '#D4A373', // caramel
  '#BC4749', // brick
  '#6D6875', // slate
]

// Ritorna un colore di testo leggibile (nero/bianco) su sfondo hex
export function textOn(hex) {
  if (!hex) return '#FFFFFF'
  const h = hex.replace('#', '')
  const bigint = parseInt(
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h,
    16
  )
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  // luminanza semplificata
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luma > 0.6 ? '#2B2522' : '#FFFFFF'
}
