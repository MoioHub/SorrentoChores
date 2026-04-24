import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Avviso chiaro in console ma NON throw: permette alla UI di montarsi e
  // mostrare un messaggio intellegibile invece di una pagina bianca.
  // eslint-disable-next-line no-console
  console.warn(
    '[Sorrento Chores] Mancano VITE_SUPABASE_URL e/o VITE_SUPABASE_ANON_KEY. ' +
    'Controlla il file .env in locale o i secrets GitHub in produzione.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 5 } },
})

export const isSupabaseConfigured = Boolean(url && anonKey)
