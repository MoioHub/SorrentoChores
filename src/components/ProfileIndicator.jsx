import { useNavigate } from 'react-router-dom'
import { useProfiles } from '../context/ProfileContext.jsx'
import Avatar from './Avatar.jsx'

/**
 * Piccola barra in alto che mostra chi è il profilo attivo sul dispositivo.
 * Cliccandola si va su Impostazioni (dove c'è "Cambia profilo attivo").
 * È discreta ma persistente: funge da reminder e da shortcut.
 */
export default function ProfileIndicator() {
  const { activeProfile } = useProfiles()
  const navigate = useNavigate()
  if (!activeProfile) return null

  return (
    <div className="sticky top-0 z-10 bg-cream/90 backdrop-blur border-b border-sand">
      <div className="max-w-xl mx-auto flex items-center gap-3 px-4 py-2">
        <button
          onClick={() => navigate('/impostazioni')}
          className="flex items-center gap-3 flex-1 text-left"
          aria-label="Cambia profilo o apri impostazioni"
        >
          <Avatar profile={activeProfile} size={34} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-muted leading-none">
              Stai usando
            </div>
            <div className="font-medium truncate" style={{ color: activeProfile.color }}>
              {activeProfile.display_name}
            </div>
          </div>
          <span className="text-xs text-muted">cambia</span>
        </button>
      </div>
    </div>
  )
}
