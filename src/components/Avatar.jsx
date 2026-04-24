import { initialsOf, textOn } from '../lib/utils.js'

/**
 * Avatar — cerchio con foto o iniziali del profilo, bordato del colore del
 * coinquilino. Formato coerente in tutta l'app.
 *
 * Props:
 *  - profile: { display_name, avatar_url, color }
 *  - size:    numero in pixel (default 40)
 *  - ring:    boolean (default true) — bordo colorato
 */
export default function Avatar({ profile, size = 40, ring = true }) {
  const color = profile?.color || '#CBB9A6'
  const name = profile?.display_name || '?'
  const avatarUrl = profile?.avatar_url

  const style = {
    width: size,
    height: size,
    background: avatarUrl ? undefined : color,
    color: textOn(color),
    fontSize: Math.max(11, Math.round(size * 0.38)),
    boxShadow: ring ? `0 0 0 2px ${color}` : 'none',
  }

  return (
    <div
      className="inline-flex items-center justify-center rounded-full overflow-hidden font-semibold select-none shrink-0"
      style={style}
      aria-label={name}
      title={name}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </div>
  )
}
