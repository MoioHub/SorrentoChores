import { useState } from 'react'
import { useProfiles } from '../context/ProfileContext.jsx'
import Avatar from './Avatar.jsx'
import CreateProfileModal from './CreateProfileModal.jsx'

/**
 * Schermata iniziale quando il dispositivo non ha ancora scelto un profilo.
 * - Mostra tutti i profili esistenti come card (foto, nome, colore)
 * - Tap su una card → salva la scelta in localStorage
 * - Pulsante "Sono nuovo — aggiungi il mio profilo" → modale di creazione
 *
 * Appare anche da Impostazioni quando l'utente sceglie "Cambia profilo attivo":
 * il flusso di selezione è lo stesso.
 */
export default function ProfilePicker() {
  const { profiles, setActiveProfileId, refresh } = useProfiles()
  const [showCreate, setShowCreate] = useState(false)

  const hasProfiles = profiles.length > 0

  return (
    <div className="min-h-full">
      <div className="max-w-xl mx-auto px-5 pt-10 pb-24">
        <h1 className="text-3xl font-semibold mb-1">Sorrento Chores</h1>
        <p className="text-muted mb-8">
          {hasProfiles
            ? 'Tocca il tuo profilo per iniziare — lo ricorderemo su questo dispositivo.'
            : 'Benvenuto. Non c\'è ancora nessun profilo: creane uno per iniziare.'}
        </p>

        {hasProfiles && (
          <div className="grid grid-cols-2 gap-3 mb-8">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProfileId(p.id)}
                className="rounded-2xl bg-white p-4 flex flex-col items-center gap-3 shadow-sm border border-sand hover:shadow-md transition active:scale-[0.98]"
                style={{ borderColor: p.color }}
              >
                <Avatar profile={p} size={72} />
                <div className="font-medium text-center" style={{ color: p.color }}>
                  {p.display_name}
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowCreate(true)}
          className="w-full rounded-2xl border-2 border-dashed border-sand py-4 text-muted hover:text-ink hover:border-ink/40 transition"
        >
          + Sono nuovo — aggiungi il mio profilo
        </button>
      </div>

      {showCreate && (
        <CreateProfileModal
          onClose={() => setShowCreate(false)}
          onCreated={async (newProfile) => {
            await refresh()
            setActiveProfileId(newProfile.id)
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}
