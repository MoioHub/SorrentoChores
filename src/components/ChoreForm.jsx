import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useProfiles } from '../context/ProfileContext.jsx'

/**
 * Form per registrare una faccenda.
 * - coinquilino: preselezionato (profilo attivo), non modificabile
 * - tipo: select con i chore_types caricati da Supabase
 * - nota: testo opzionale
 * - al submit: insert su chore_logs con snapshot del nome
 * - dopo l'invio: piccola conferma e reset
 */
export default function ChoreForm({ onLogged }) {
  const { activeProfile } = useProfiles()
  const [types, setTypes] = useState([])
  const [typeId, setTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('chore_types')
        .select('*')
        .order('name', { ascending: true })
      const list = data ?? []
      setTypes(list)
      if (list.length && !typeId) setTypeId(list[0].id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!activeProfile || !typeId) return
    setSaving(true)
    setError(null)
    try {
      const type = types.find((t) => t.id === typeId)
      const { error: insErr } = await supabase.from('chore_logs').insert({
        profile_id: activeProfile.id,
        chore_type_id: typeId,
        chore_name: type?.name ?? 'Faccenda',
        notes: notes.trim() || null,
      })
      if (insErr) throw insErr

      // reset + conferma
      setNotes('')
      setConfirm(true)
      setTimeout(() => setConfirm(false), 1600)
      onLogged?.()
    } catch (err) {
      setError(err.message || 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl p-4 shadow-sm border border-sand space-y-3"
    >
      <div className="text-sm text-muted">Registra una faccenda fatta</div>

      <label className="block">
        <span className="text-sm text-muted">Tipo</span>
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="mt-1 w-full rounded-xl border border-sand bg-white px-3 py-2"
        >
          {types.length === 0 && <option value="">(nessun tipo)</option>}
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-muted">Nota (opzionale)</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Es. solo salotto"
          className="mt-1 w-full rounded-xl border border-sand bg-white px-3 py-2"
        />
      </label>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !typeId}
        className="w-full rounded-2xl py-3 font-semibold text-white disabled:opacity-60 transition active:scale-[0.99]"
        style={{ background: activeProfile?.color || '#2B2522' }}
      >
        {confirm ? 'Registrato ✓' : saving ? 'Salvo…' : 'Fatto ✓'}
      </button>
    </form>
  )
}
