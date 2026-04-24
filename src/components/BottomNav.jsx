import { NavLink } from 'react-router-dom'

/**
 * Barra di navigazione fissa in basso — perfetta per il pollice su mobile.
 * 3 voci: Faccende (home), Spesa, Impostazioni.
 */
export default function BottomNav() {
  const item =
    'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs'
  const active = 'text-ink'
  const inactive = 'text-muted'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-cream/95 backdrop-blur border-t border-sand z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-xl mx-auto flex">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${item} ${isActive ? active : inactive}`}
        >
          <IconBroom className="w-6 h-6" />
          <span>Faccende</span>
        </NavLink>
        <NavLink
          to="/spesa"
          className={({ isActive }) => `${item} ${isActive ? active : inactive}`}
        >
          <IconCart className="w-6 h-6" />
          <span>Spesa</span>
        </NavLink>
        <NavLink
          to="/impostazioni"
          className={({ isActive }) => `${item} ${isActive ? active : inactive}`}
        >
          <IconGear className="w-6 h-6" />
          <span>Impostazioni</span>
        </NavLink>
      </div>
    </nav>
  )
}

/* --- Icone inline (SVG) — niente librerie esterne per tenere leggero --- */

function IconBroom(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 3l7 7" />
      <path d="M5 21l6-6 3 3-6 6H5v-3z" />
      <path d="M14 10l-3 3" />
      <path d="M3 21l4-1 2-2-3-3-2 2-1 4z" />
    </svg>
  )
}
function IconCart(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3h2l.6 3M7 13h11l2-8H5.4" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  )
}
function IconGear(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
