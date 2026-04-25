import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useProfiles } from '../context/ProfileContext.jsx'

/**
 * Format della data in modo che <input type="datetime-local"> lo accetti:
 * "YYYY-MM-DDTHH:mm" in fuso orario locale (l'input non vuole il suffisso Z).
 */
function toLocalInputValue(date) {
  const d = date instanceof Date ? date : new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

/**
 * Form per registrare una faccenda.
 * - coinquilino: preselezionato (profilo attivo), non modificabile
 * - tipo: select con i chore_types caricati da Supabase
 * - nota: testo opzionale
 * - quando: di default "Adesso" (lascia che sia il DB a mettere now()).
 *           Se l'utente apre il picker, può scegliere una data/ora custom.
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

  // Stato del selettore "Quando":
  // - useCustomDate=false  → di default usiamo "Adesso" (niente done_at nell'insert)
  // - useCustomDate=true   → mostriamo il datetime-local con valore in customDate
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [customDate, setCustomDate] = useState(() => toLocalInputValue(new Date()))

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

  function openCustomDate() {
    // ogni volta che apri il picker, parti dall'ora corrente
    setCustomDate(toLocalInputValue(new Date()))
    setUseCustomDate(true)
  }

  function resetToNow() {
    setUseCustomDate(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!activeProfile || !typeId) return
    setSaving(true)
    setError(null)
    try {
      const type = types.find((t) => t.id === typeId)

      // Costruisco l'oggetto da inserire. Includo `done_at` SOLO se l'utente
      // ha scelto una data custom; altrimenti lascio che il default del DB
      // (now()) faccia il suo lavoro — comportamento originale invariato.
      const payload = {
        profile_id: activeProfile.id,
        chore_type_id: typeId,
        chore_name: type?.name ?? 'Faccenda',
        notes: notes.trim() || null,
      }
      if (useCustomDate && customDate) {
        // new Date('YYYY-MM-DDTHH:mm') interpreta come ora locale; toISOString
        // la converte in UTC, formato che PostgreSQL accetta benissimo.
        payload.done_at = new Date(customDate).toISOString()
      }

      const { error: insErr } = await supabase.from('chore_logs').insert(payload)
      if (insErr) throw insErr

      // reset + conferma
      setNotes('')
      setUseCustomDate(false)
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

      {/* Selettore data/ora — di default mostra il chip "Adesso", se cliccato
          espande un input datetime-local con valore precompilato a ora corrente.
          Se l'utente vuole tornare al default basta che prema "× Adesso". */}
      <div>
        <span className="text-sm text-muted">Quando</span>
        {!useCustomDate ? (
          <div className="mt-1">
            <button
              type="button"
              onClick={openCustomDate}
              className="inline-flex items-center gap-1 rounded-xl border border-sand bg-white px-3 py-2 text-sm hover:border-ink/30"
            >
              <span>Adesso</span>
              <span className="text-muted text-xs">▾</span>
            </button>
          </div>
        ) : (
          <div className="mt-1 flex gap-2">
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="flex-1 rounded-xl border border-sand bg-white px-3 py-2"
            />
            <button
              type="button"
              onClick={resetToNow}
              className="rounded-xl border border-sand bg-white px-3 text-sm text-muted hover:text-ink"
              title="Torna ad Adesso"
            >
              × Adesso
            </button>
          </div>
        )}
      </div>

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
