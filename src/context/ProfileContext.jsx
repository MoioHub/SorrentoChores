import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * ProfileContext
 * --------------
 * Tiene traccia di:
 *  - `profiles`:      tutti i profili presenti su Supabase
 *  - `activeProfile`: il profilo selezionato su QUESTO dispositivo (da localStorage)
 *  - `loading`:       stato di caricamento iniziale
 *
 * Espone:
 *  - setActiveProfileId(id):  salva la scelta in localStorage e aggiorna lo stato
 *  - refresh():               ricarica la lista profili da Supabase
 *
 * Perché localStorage: l'app non ha login, quindi il "chi sono" è una preferenza
 * del dispositivo. Ogni telefono ricorda il proprio utente.
 */

const STORAGE_KEY = 'sorrento_chores.active_profile_id'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profiles, setProfiles] = useState([])
  const [activeProfileId, setActiveProfileIdState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  const loadProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setProfiles(data ?? [])
    return { data, error }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await loadProfiles()
      if (mounted) setLoading(false)
    })()
    return () => { mounted = false }
  }, [loadProfiles])

  const setActiveProfileId = useCallback((id) => {
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* quota o privacy mode: ignoriamo */ }
    setActiveProfileIdState(id)
  }, [])

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null

  const value = {
    profiles,
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    loading,
    refresh: loadProfiles,
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfiles() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfiles deve essere usato dentro <ProfileProvider>')
  return ctx
}
