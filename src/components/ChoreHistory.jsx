import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useProfiles } from '../context/ProfileContext.jsx'
import Avatar from './Avatar.jsx'
import { timeAgo } from '../lib/utils.js'

/**
 * Storico delle faccende con filtri e aggiornamento realtime.
 * - carico i log (join lato client sui profili noti per evitare una vista dedicata)
 * - mi sottoscrivo ai cambiamenti della tabella chore_logs
 * - filtri: per coinquilino e/o tipo
 */
export default function ChoreHistory() {
  const { profiles } = useProfiles()
  const [logs, setLogs] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProfile, setFilterProfile] = useState('all')
  const [filterType, setFilterType] = useState('all')

  // Quale riga è "espansa" (con il mini-pannello azioni visibile).
  // null = nessuna riga aperta.
  const [expandedId, setExpandedId] = useState(null)
  // Id del log attualmente in fase di cancellazione (per disabilitare il bottone)
  const [deletingId, setDeletingId] = useState(null)

  // Stato della modalità "modifica nota":
  // - editingId:    id del log che si sta modificando (null = nessuno in editing)
  // - editingNotes: testo corrente nella textarea di modifica
  // - savingNoteId: id del log per cui è in corso il salvataggio (disabilita "Salva")
  const [editingId, setEditingId] = useState(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [savingNoteId, setSavingNoteId] = useState(null)

  // mappa id → profilo per mostrare foto/nome/colore sulle righe
  const profileById = useMemo(() => {
    const m = new Map()
    profiles.forEach((p) => m.set(p.id, p))
    return m
  }, [profiles])

  // caricamento iniziale (logs + types)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [{ data: logsData }, { data: typesData }] = await Promise.all([
        supabase
          .from('chore_logs')
          .select('*')
          .order('done_at', { ascending: false })
          .limit(200),
        supabase.from('chore_types').select('*').order('name'),
      ])
      if (!mounted) return
      setLogs(logsData ?? [])
      setTypes(typesData ?? [])
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  // realtime
  useEffect(() => {
    const channel = supabase
      .channel('chore_logs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chore_logs' },
        (payload) => {
          setLogs((prev) => {
            if (payload.eventType === 'INSERT') {
              // Aggiungo il nuovo log e riordino per done_at decrescente.
              // Necessario perché un log con data passata (es. registrato a
              // posteriori) deve apparire nella sua posizione cronologica,
              // non sempre in cima.
              const next = [payload.new, ...prev]
              next.sort((a, b) => new Date(b.done_at) - new Date(a.done_at))
              return next
            }
            if (payload.eventType === 'UPDATE') {
              const next = prev.map((l) => (l.id === payload.new.id ? payload.new : l))
              next.sort((a, b) => new Date(b.done_at) - new Date(a.done_at))
              return next
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((l) => l.id !== payload.old.id)
            }
            return prev
          })
          // se il log eliminato era quello aperto/in editing, chiudo i pannelli
          if (payload.eventType === 'DELETE') {
            setExpandedId((curr) => (curr === payload.old.id ? null : curr))
            setEditingId((curr) => (curr === payload.old.id ? null : curr))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function toggleExpanded(id) {
    setExpandedId((curr) => (curr === id ? null : id))
    // Cambiando riga (o chiudendola) abbandono qualsiasi modifica in corso:
    // tenere aperta una textarea "orfana" sarebbe confuso.
    setEditingId(null)
    setEditingNotes('')
  }

  async function handleDelete(log) {
    const p = profileById.get(log.profile_id)
    const who = p?.display_name ?? 'Qualcuno'
    const ok = confirm(
      `Eliminare la faccenda "${log.chore_name}" registrata da ${who}?\n\n` +
      `Questa azione non si può annullare.`
    )
    if (!ok) return

    setDeletingId(log.id)
    // update ottimistico: la riga sparisce subito dalla UI
    setLogs((prev) => prev.filter((l) => l.id !== log.id))
    setExpandedId(null)

    const { error } = await supabase.from('chore_logs').delete().eq('id', log.id)
    if (error) {
      // rollback: ripristino il log nella lista al posto giusto
      setLogs((prev) => {
        const next = [...prev, log]
        next.sort((a, b) => new Date(b.done_at) - new Date(a.done_at))
        return next
      })
      alert('Errore nella cancellazione: ' + error.message)
    }
    setDeletingId(null)
  }

  function startEditing(log) {
    // Apro la textarea precompilata con la nota attuale (vuota se non c'era).
    setEditingId(log.id)
    setEditingNotes(log.notes ?? '')
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingNotes('')
  }

  async function handleSaveNote(log) {
    // Normalizzo: trim degli spazi; se vuoto salvo null così la nota sparisce.
    const trimmed = editingNotes.trim()
    const newNotes = trimmed === '' ? null : trimmed
    const prevNotes = log.notes ?? null

    // Niente è cambiato → chiudo l'editing senza fare richieste inutili.
    if (newNotes === prevNotes) {
      cancelEditing()
      return
    }

    setSavingNoteId(log.id)
    // update ottimistico: aggiorno la nota nella UI prima della risposta server
    setLogs((prev) =>
      prev.map((l) => (l.id === log.id ? { ...l, notes: newNotes } : l))
    )
    setEditingId(null)
    setEditingNotes('')

    const { error } = await supabase
      .from('chore_logs')
      .update({ notes: newNotes })
      .eq('id', log.id)

    if (error) {
      // rollback: rimetto la nota com'era prima della modifica
      setLogs((prev) =>
        prev.map((l) => (l.id === log.id ? { ...l, notes: prevNotes } : l))
      )
      alert('Errore nel salvataggio della nota: ' + error.message)
    }
    setSavingNoteId(null)
  }

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterProfile !== 'all' && l.profile_id !== filterProfile) return false
      if (filterType !== 'all' && l.chore_type_id !== filterType) return false
      return true
    })
  }, [logs, filterProfile, filterType])

  return (
    <section className="mt-6">
      <div className="flex items-end justify-between mb-2">
        <h2 className="text-lg font-semibold">Storico</h2>
        <span className="text-xs text-muted">{filtered.length} voci</span>
      </div>

      {/* Barra filtri */}
      <div className="flex gap-2 mb-3">
        <select
          value={filterProfile}
          onChange={(e) => setFilterProfile(e.target.value)}
          className="flex-1 rounded-xl border border-sand bg-white px-3 py-2 text-sm"
        >
          <option value="all">Tutti i coinquilini</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="flex-1 rounded-xl border border-sand bg-white px-3 py-2 text-sm"
        >
          <option value="all">Tutti i tipi</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-muted text-sm py-6 text-center">Caricamento…</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted text-sm py-10 text-center bg-white rounded-2xl border border-sand">
          Nessuna faccenda registrata ancora.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((log) => {
            const p = profileById.get(log.profile_id)
            const isOpen = expandedId === log.id
            const isDeleting = deletingId === log.id
            const isEditing = editingId === log.id
            const isSavingNote = savingNoteId === log.id
            return (
              <li
                key={log.id}
                className={`bg-white rounded-2xl border border-sand transition ${
                  isOpen ? 'ring-1 ring-ink/10' : ''
                }`}
              >
                {/* Riga cliccabile: tap su un punto qualsiasi apre/chiude il pannello.
                    Uso <button> per accessibilità (tastiera/screen reader). */}
                <button
                  type="button"
                  onClick={() => { if (!isEditing) toggleExpanded(log.id) }}
                  className="w-full p-3 flex items-start gap-3 text-left"
                  aria-expanded={isOpen}
                >
                  <Avatar profile={p} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="truncate">
                        <span className="font-medium" style={{ color: p?.color }}>
                          {p?.display_name ?? 'Qualcuno'}
                        </span>
                        <span className="text-muted"> ha fatto </span>
                        <span className="font-medium">{log.chore_name}</span>
                      </div>
                      <div className="text-xs text-muted shrink-0">
                        {timeAgo(log.done_at)}
                      </div>
                    </div>
                    {log.notes && !isEditing && (
                      <div className="text-sm text-muted mt-1 break-words">{log.notes}</div>
                    )}
                  </div>
                </button>

                {/* Mini-pannello: ha due "modi"
                    1) elenco azioni  (Annulla / Modifica nota / Elimina)
                    2) form di modifica nota (textarea + Annulla / Salva)    */}
                {isOpen && (
                  isEditing ? (
                    <div className="border-t border-sand px-3 py-2 space-y-2">
                      <textarea
                        value={editingNotes}
                        onChange={(e) => setEditingNotes(e.target.value)}
                        rows={3}
                        autoFocus
                        placeholder="Aggiungi una nota…"
                        className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-xl px-3 py-1.5 text-sm text-muted hover:text-ink"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNote(log)}
                          disabled={isSavingNote}
                          className="rounded-xl px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                          style={{ background: '#2B2522' }}
                        >
                          {isSavingNote ? 'Salvo…' : 'Salva'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-sand px-3 py-2 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="rounded-xl px-3 py-1.5 text-sm text-muted hover:text-ink"
                      >
                        Annulla
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditing(log)}
                        className="rounded-xl px-3 py-1.5 text-sm text-ink hover:bg-sand/40"
                      >
                        {log.notes ? 'Modifica nota' : 'Aggiungi nota'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(log)}
                        disabled={isDeleting}
                        className="rounded-xl px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {isDeleting ? 'Elimino…' : 'Elimina'}
                      </button>
                    </div>
                  )
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
