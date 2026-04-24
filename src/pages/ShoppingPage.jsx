import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useProfiles } from '../context/ProfileContext.jsx'

/**
 * Lista della spesa.
 * - Aggiungi articolo: riga in shopping_items con `added_by = profilo attivo`
 * - Spunta singolo: toggle `done`
 * - "Fatto tutto": set `done = true` per tutti gli open
 * - Gli items spuntati restano visibili (barrati) — utile per trasparenza
 * - "Svuota" elimina tutto dopo conferma
 * - Realtime: qualsiasi cambio fatto da altri dispositivi appare subito
 */
export default function ShoppingPage() {
  const { activeProfile, profiles } = useProfiles()
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const profileById = useMemo(() => {
    const m = new Map()
    profiles.forEach((p) => m.set(p.id, p))
    return m
  }, [profiles])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase
        .from('shopping_items')
        .select('*')
        .order('created_at', { ascending: true })
      if (!mounted) return
      setItems(data ?? [])
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  // realtime
  useEffect(() => {
    const channel = supabase
      .channel('shopping_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items' },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === 'INSERT') {
              // evita duplicati se l'ho appena inserito io
              if (prev.some((i) => i.id === payload.new.id)) return prev
              return [...prev, payload.new]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((i) => (i.id === payload.new.id ? payload.new : i))
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((i) => i.id !== payload.old.id)
            }
            return prev
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function addItem(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    try {
      const { error } = await supabase.from('shopping_items').insert({
        name,
        added_by: activeProfile?.id ?? null,
      })
      if (error) throw error
      setNewName('')
    } finally {
      setBusy(false)
    }
  }

  async function toggleItem(item) {
    // update ottimistico
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
    const { error } = await supabase
      .from('shopping_items')
      .update({ done: !item.done })
      .eq('id', item.id)
    if (error) {
      // rollback
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)))
    }
  }

  async function markAllDone() {
    const openIds = items.filter((i) => !i.done).map((i) => i.id)
    if (openIds.length === 0) return
    setBusy(true)
    try {
      setItems((prev) => prev.map((i) => (openIds.includes(i.id) ? { ...i, done: true } : i)))
      await supabase.from('shopping_items').update({ done: true }).in('id', openIds)
    } finally {
      setBusy(false)
    }
  }

  async function clearAll() {
    if (!confirm('Sicuro di voler svuotare tutta la lista?')) return
    setBusy(true)
    try {
      const ids = items.map((i) => i.id)
      if (ids.length === 0) return
      setItems([])
      await supabase.from('shopping_items').delete().in('id', ids)
    } finally {
      setBusy(false)
    }
  }

  const openItems = items.filter((i) => !i.done)
  const doneItems = items.filter((i) => i.done)

  return (
    <div className="pt-3 space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Lista della spesa</h1>
        <span className="text-xs text-muted">
          {openItems.length} da comprare · {doneItems.length} presi
        </span>
      </div>

      {/* Aggiungi */}
      <form onSubmit={addItem} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Aggiungi articolo (es. latte)"
          className="flex-1 rounded-xl border border-sand bg-white px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="rounded-xl bg-ink text-cream px-4 font-medium disabled:opacity-60"
        >
          Aggiungi
        </button>
      </form>

      {/* Azioni globali */}
      <div className="flex gap-2">
        <button
          onClick={markAllDone}
          disabled={openItems.length === 0 || busy}
          className="flex-1 rounded-xl border border-sand bg-white py-2 text-sm disabled:opacity-50"
        >
          Fatto tutto ✓
        </button>
        <button
          onClick={clearAll}
          disabled={items.length === 0 || busy}
          className="flex-1 rounded-xl border border-sand bg-white py-2 text-sm disabled:opacity-50"
        >
          Svuota lista
        </button>
      </div>

      {/* Lista aperta */}
      {loading ? (
        <div className="text-muted text-sm py-6 text-center">Caricamento…</div>
      ) : (
        <>
          <ul className="space-y-2">
            {openItems.map((item) => {
              const p = profileById.get(item.added_by)
              return (
                <li
                  key={item.id}
                  className="bg-white rounded-2xl p-3 border border-sand flex items-center gap-3"
                >
                  <button
                    onClick={() => toggleItem(item)}
                    className="w-6 h-6 rounded-full border-2 border-ink/30 shrink-0"
                    aria-label={`Segna ${item.name} come preso`}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    {p && (
                      <div className="text-xs text-muted">
                        aggiunto da{' '}
                        <span style={{ color: p.color }}>{p.display_name}</span>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Lista presa (barrati) */}
          {doneItems.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted mt-6 mb-2">
                Già presi
              </div>
              <ul className="space-y-2">
                {doneItems.map((item) => {
                  const p = profileById.get(item.added_by)
                  return (
                    <li
                      key={item.id}
                      className="bg-sand/60 rounded-2xl p-3 border border-sand flex items-center gap-3"
                    >
                      <button
                        onClick={() => toggleItem(item)}
                        className="w-6 h-6 rounded-full bg-ink/70 text-white flex items-center justify-center text-xs shrink-0"
                        aria-label={`Rimetti ${item.name} tra quelli da comprare`}
                      >
                        ✓
                      </button>
                      <div className="flex-1">
                        <div className="line-through text-muted">{item.name}</div>
                        {p && <div className="text-xs text-muted">da {p.display_name}</div>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-muted text-sm py-10 text-center bg-white rounded-2xl border border-sand">
              La lista è vuota.
            </div>
          )}
        </>
      )}
    </div>
  )
}
