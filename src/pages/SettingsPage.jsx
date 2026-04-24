import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useProfiles } from '../context/ProfileContext.jsx'
import Avatar from '../components/Avatar.jsx'
import { PRESET_COLORS } from '../lib/utils.js'

/**
 * Impostazioni — tre sezioni:
 *   1) Profilo personale (nome, colore, foto)
 *   2) Tipi di faccenda (lista, aggiungi, rimuovi)
 *   3) Cambia profilo attivo su questo dispositivo
 */
export default function SettingsPage() {
  const { activeProfile, profiles, setActiveProfileId, refresh } = useProfiles()

  if (!activeProfile) return null

  return (
    <div className="pt-3 space-y-8">
      <h1 className="text-xl font-semibold">Impostazioni</h1>

      <ProfileSection
        profile={activeProfile}
        onSaved={refresh}
      />

      <ChoreTypesSection />

      <SwitchProfileSection
        profiles={profiles}
        activeId={activeProfile.id}
        onSwitch={(id) => setActiveProfileId(id)}
      />
    </div>
  )
}

/* ------------------------------ 1) PROFILO ---------------------------------- */

function ProfileSection({ profile, onSaved }) {
  const [name, setName] = useState(profile.display_name)
  const [color, setColor] = useState(profile.color)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  // aggiorna i campi quando cambia il profilo (es. dopo uno switch)
  useEffect(() => {
    setName(profile.display_name)
    setColor(profile.color)
    setFile(null)
    setMsg(null); setErr(null)
  }, [profile.id])

  async function save(e) {
    e.preventDefault()
    setSaving(true); setMsg(null); setErr(null)
    try {
      let avatarUrl = profile.avatar_url

      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${profile.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = pub.publicUrl
      }

      const { error: updErr } = await supabase
        .from('profiles')
        .update({
          display_name: name.trim(),
          color,
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id)
      if (updErr) throw updErr

      await onSaved?.()
      setMsg('Salvato ✓')
      setFile(null)
      setTimeout(() => setMsg(null), 1500)
    } catch (e) {
      setErr(e.message || 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-sand p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar profile={{ ...profile, color }} size={52} />
        <div>
          <h2 className="font-semibold">Il tuo profilo</h2>
          <p className="text-xs text-muted">
            Questi dati sono condivisi con tutti i coinquilini.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-3">
        <label className="block">
          <span className="text-sm text-muted">Nome</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <span className="text-sm text-muted">Cambia foto</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </label>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-700">{msg}</div>}

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full rounded-xl bg-ink text-cream py-2 font-medium disabled:opacity-60"
        >
          {saving ? 'Salvo…' : 'Salva modifiche'}
        </button>
      </form>
    </section>
  )
}

/* ---------------------------- 2) TIPI DI FACCENDA --------------------------- */

function ChoreTypesSection() {
  const [types, setTypes] = useState([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function load() {
    const { data } = await supabase.from('chore_types').select('*').order('name')
    setTypes(data ?? [])
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  async function addType(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setBusy(true); setErr(null)
    try {
      const { error } = await supabase.from('chore_types').insert({ name })
      if (error) throw error
      setNewName('')
      await load()
    } catch (e) {
      setErr(e.message || 'Errore nella creazione')
    } finally {
      setBusy(false)
    }
  }

  async function removeType(t) {
    if (!confirm(`Rimuovere il tipo "${t.name}"?\nLo storico passato rimane visibile.`)) return
    setBusy(true); setErr(null)
    try {
      const { error } = await supabase.from('chore_types').delete().eq('id', t.id)
      if (error) throw error
      await load()
    } catch (e) {
      setErr(e.message || 'Errore nella rimozione')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-sand p-4 space-y-3">
      <div>
        <h2 className="font-semibold">Tipi di faccenda</h2>
        <p className="text-xs text-muted">
          La rimozione di un tipo non cancella lo storico: i log conservano il nome originale.
        </p>
      </div>

      <form onSubmit={addType} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nuovo tipo (es. Bucato)"
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

      {err && <div className="text-sm text-red-600">{err}</div>}

      {loading ? (
        <div className="text-sm text-muted">Caricamento…</div>
      ) : types.length === 0 ? (
        <div className="text-sm text-muted">Nessun tipo definito.</div>
      ) : (
        <ul className="divide-y divide-sand">
          {types.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <span>{t.name}</span>
              <button
                onClick={() => removeType(t)}
                disabled={busy}
                className="text-sm text-red-600 hover:underline"
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ----------------------- 3) CAMBIA PROFILO SUL DISPOSITIVO ------------------ */

function SwitchProfileSection({ profiles, activeId, onSwitch }) {
  return (
    <section className="bg-white rounded-2xl border border-sand p-4 space-y-3">
      <div>
        <h2 className="font-semibold">Cambia profilo attivo</h2>
        <p className="text-xs text-muted">
          Usa questa opzione solo se stai usando il dispositivo di un altro coinquilino.
          La preferenza viene salvata su questo dispositivo.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => onSwitch(p.id)}
            className={`rounded-xl border p-3 flex items-center gap-3 text-left transition ${
              p.id === activeId ? 'border-ink bg-sand/40' : 'border-sand bg-white'
            }`}
          >
            <Avatar profile={p} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate" style={{ color: p.color }}>
                {p.display_name}
              </div>
              {p.id === activeId && <div className="text-xs text-muted">attivo</div>}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
