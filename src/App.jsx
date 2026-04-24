import { Routes, Route, Navigate } from 'react-router-dom'
import { useProfiles } from './context/ProfileContext.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'
import ProfilePicker from './components/ProfilePicker.jsx'
import ProfileIndicator from './components/ProfileIndicator.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomePage from './pages/HomePage.jsx'
import ShoppingPage from './pages/ShoppingPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

export default function App() {
  const { activeProfile, loading } = useProfiles()

  // 1) Caso di configurazione mancante (sviluppatore non ha messo le env)
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold">Configurazione mancante</h1>
          <p className="text-muted">
            Le variabili <code>VITE_SUPABASE_URL</code> e{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> non sono impostate. Aggiungile
            nel file <code>.env</code> in locale o nei secret GitHub per la
            produzione, poi ricostruisci l'app.
          </p>
        </div>
      </div>
    )
  }

  // 2) Caricamento iniziale
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="animate-pulse text-muted">Caricamento…</div>
      </div>
    )
  }

  // 3) Nessun profilo attivo su questo dispositivo → mostra selettore
  if (!activeProfile) {
    return <ProfilePicker />
  }

  // 4) App completa
  return (
    <div className="min-h-full flex flex-col pb-20">
      <ProfileIndicator />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-2">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/spesa" element={<ShoppingPage />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  )
}
