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
              return [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((l) => (l.id === payload.new.id ? payload.new : l))
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((l) => l.id !== payload.old.id)
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

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
            return (
              <li
                key={log.id}
                className="bg-white rounded-2xl p-3 border border-sand flex items-start gap-3"
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
                  {log.notes && (
                    <div className="text-sm text-muted mt-1 break-words">{log.notes}</div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
