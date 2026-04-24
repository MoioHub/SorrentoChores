import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { PRESET_COLORS } from '../lib/utils.js'

/**
 * Modale per la creazione di un nuovo profilo.
 * Campi: nome, colore (palette + campo libero), foto opzionale.
 * La foto, se fornita, viene caricata sul bucket pubblico `avatars`.
 */
export default function CreateProfileModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      // 1) crea la riga profilo (senza avatar per ora, ci serve l'id)
      const { data: inserted, error: insErr } = await supabase
        .from('profiles')
        .insert({ display_name: name.trim(), color })
        .select()
        .single()
      if (insErr) throw insErr

      let avatarUrl = null

      // 2) se c'è un file, caricalo e poi aggiorna la riga
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${inserted.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (upErr) throw upErr

        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = pub.publicUrl

        const { error: updErr } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', inserted.id)
        if (updErr) throw updErr
      }

      onCreated({ ...inserted, avatar_url: avatarUrl })
    } catch (err) {
      setError(err.message || 'Errore durante la creazione del profilo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-cream w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuovo profilo</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        <label className="block">
          <span className="text-sm text-muted">Nome</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Maria"
            className="mt-1 w-full rounded-xl border border-sand bg-white px-3 py-2"
            required
          />
        </label>

        <div>
          <span className="text-sm text-muted">Colore</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full border-2"
                style={{
                  background: c,
                  borderColor: color === c ? '#2B2522' : 'transparent',
                }}
                aria-label={`Colore ${c}`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-full border-0 bg-transparent"
              aria-label="Colore personalizzato"
            />
          </div>
        </div>

        <label className="block">
          <span className="text-sm text-muted">Foto (opzionale)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </label>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-sand py-2"
            disabled={saving}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-ink text-cream py-2 font-medium disabled:opacity-60"
            disabled={saving || !name.trim()}
          >
            {saving ? 'Creo…' : 'Crea profilo'}
          </button>
        </div>
      </form>
    </div>
  )
}
