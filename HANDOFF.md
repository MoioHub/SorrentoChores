# Sorrento Chores — Guida al deploy

Questa è la procedura completa da seguire per portare l'app online. Ogni passo è accompagnato da una breve spiegazione del _perché_.

---

## 1. Creare il progetto Supabase ed eseguire lo schema

1. Vai su [supabase.com](https://supabase.com/) e crea un nuovo progetto (piano Free è sufficiente).
2. Dopo qualche minuto, dal menu di sinistra apri **SQL Editor → New query**.
3. Incolla tutto il contenuto del file `supabase/schema.sql` e premi **Run**.
   - Crea le tabelle `profiles`, `chore_types`, `chore_logs`, `shopping_items`.
   - Inserisce i tipi di faccenda di default: Pavimenti, Cucina, Bagno.
   - Abilita Row Level Security con policy permissive per il ruolo `anon` (l'app non usa login).
   - Abilita Realtime su `chore_logs` e `shopping_items`.
   - Crea anche le policy di storage per il bucket `avatars` (che però va ancora creato manualmente, vedi punto 2).

> **Nota sullo schema**: lo spec originale prevedeva `profiles.id` come foreign key verso `auth.users(id)`. Siccome l'app non usa l'autenticazione Supabase, quel vincolo renderebbe impossibile inserire profili (la tabella `auth.users` resterebbe vuota). Ho quindi reso `profiles.id` un UUID generato autonomamente. Se in futuro vorrai reintrodurre l'autenticazione, basterà una migrazione mirata.

## 2. Creare il bucket `avatars`

1. Sempre su Supabase, vai su **Storage → New bucket**.
2. Nome: `avatars`.
3. Spunta **Public bucket** (così le foto profilo sono leggibili da tutti senza token).
4. Crea.

Le policy che permettono al ruolo `anon` di caricare/aggiornare/cancellare file sono già state create dallo schema SQL al punto 1.

## 3. Autenticazione Supabase

L'app **non usa l'autenticazione Supabase**: tutte le operazioni passano dalla `anon key`, quindi non devi abilitare Email/Password né altri provider. Puoi tranquillamente lasciare la sezione Auth intatta o completamente disabilitata.

(La spec originale chiedeva di abilitare "Email + password", ma dato che nel flusso non c'è login, è semplicemente inutilizzato. Se preferisci lasciare il provider email abilitato di default non cambia nulla.)

## 4. Copiare le credenziali Supabase

Dal progetto Supabase, menu **Project Settings → API**:

- **Project URL** → questo è il valore di `SUPABASE_URL`
- **Project API keys → anon / public** → questo è il valore di `SUPABASE_ANON_KEY`

Tienile a portata di mano, ti servono per sviluppo locale e per i secret di GitHub.

## 5. Creare il repository GitHub e fare il push

```bash
# dalla cartella del progetto
git init
git add .
git commit -m "Initial commit — Sorrento Chores"
git branch -M main
git remote add origin https://github.com/TUO_UTENTE/TUO_REPO.git
git push -u origin main
```

## 6. Aggiungere i secret al repository

Sul repo GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

Aggiungi questi due, uno alla volta:

| Nome                  | Valore                                    |
|-----------------------|-------------------------------------------|
| `SUPABASE_URL`        | l'URL del tuo progetto Supabase           |
| `SUPABASE_ANON_KEY`   | la chiave anonima Supabase                |

Il workflow `.github/workflows/deploy.yml` li legge e li inietta come variabili `VITE_*` al momento della build.

## 7. Sostituire `REPO_NAME` in `vite.config.js`

Apri `vite.config.js` e cambia la riga:

```js
base: '/REPO_NAME/',
```

sostituendo `REPO_NAME` con il nome esatto del tuo repository. Esempio: se il repo è `sorrento-chores`, deve diventare:

```js
base: '/sorrento-chores/',
```

Le barre iniziale e finale sono obbligatorie. Senza questa modifica GitHub Pages non trova CSS/JS e l'app appare bianca. Commit e push della modifica.

## 8. Abilitare GitHub Pages sul branch `gh-pages`

Dopo il primo push su `main`, GitHub Actions fa la build e crea automaticamente un branch `gh-pages` con la cartella `dist/` dentro. Poi:

1. Sul repo GitHub → **Settings → Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `gh-pages`, cartella `/ (root)`
4. Salva

Dopo un minuto circa l'app è raggiungibile su `https://TUO_UTENTE.github.io/TUO_REPO/`.

> Suggerimento: il primo run di Actions potrebbe impiegare qualche minuto. Monitoralo su **Actions** nel repo.

## 9. Creare i profili dei coinquilini

Apri l'app dal telefono di uno dei coinquilini:

1. Alla prima apertura vedi la schermata "Sorrento Chores" con l'invito a creare il primo profilo.
2. Premi **+ Sono nuovo — aggiungi il mio profilo**, inserisci nome, scegli un colore, eventualmente una foto.
3. Ripeti per ogni coinquilino (puoi farlo dallo stesso dispositivo, basta tornare alla schermata iniziale aprendo Impostazioni → _Cambia profilo attivo_, oppure creare gli altri profili direttamente dagli altri telefoni).
4. Su ogni telefono, ciascuno tocca la propria card per "loggarsi": la scelta viene memorizzata in `localStorage` e non serve più ripeterla.

## 10. (Opzionale) Dominio personalizzato

Se vuoi un dominio tipo `chores.miodominio.it`:

1. Su GitHub Pages → **Custom domain** → inserisci il dominio.
2. Aggiungi nel tuo DNS un record CNAME che punta a `TUO_UTENTE.github.io`.
3. Aspetta la propagazione e abilita "Enforce HTTPS".
4. **Importante**: se usi un dominio custom, in `vite.config.js` cambia `base: '/REPO_NAME/'` in `base: '/'`, perché il sito sta ora sulla radice del dominio.

---

## Struttura del progetto

```
sorrento-chores/
├── .github/workflows/deploy.yml   # pipeline GH Pages
├── supabase/schema.sql            # schema + RLS + realtime + storage policies
├── src/
│   ├── main.jsx                   # entry point React, HashRouter
│   ├── App.jsx                    # shell: picker vs app completa, routes
│   ├── index.css                  # Tailwind + base
│   ├── lib/
│   │   ├── supabase.js            # client + check env
│   │   └── utils.js               # timeAgo, palette colori, iniziali
│   ├── context/ProfileContext.jsx # profilo attivo su questo dispositivo
│   ├── components/
│   │   ├── Avatar.jsx
│   │   ├── ProfilePicker.jsx
│   │   ├── ProfileIndicator.jsx
│   │   ├── CreateProfileModal.jsx
│   │   ├── BottomNav.jsx
│   │   ├── ChoreForm.jsx
│   │   └── ChoreHistory.jsx
│   └── pages/
│       ├── HomePage.jsx           # form + storico
│       ├── ShoppingPage.jsx       # lista spesa + realtime
│       └── SettingsPage.jsx       # profilo, tipi faccende, cambia profilo
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js                 # ricorda di sostituire REPO_NAME
```

## Come funziona "senza autenticazione"

- Non esiste un login. Tutte le richieste al database usano la `anon key` pubblica.
- Le policy RLS sono configurate per permettere lettura/scrittura al ruolo `anon`: di fatto chiunque abbia l'URL dell'app può leggere e scrivere sul database. Questo è accettabile per un uso domestico privato, ma **non** condividere il link pubblicamente.
- Il "chi sono" su ogni dispositivo è salvato in `localStorage` alla chiave `sorrento_chores.active_profile_id`. Se cancelli i dati del browser, il dispositivo tornerà a mostrare la schermata di selezione profilo.
- Se un domani vorrai limitare l'accesso, le strade più semplici sono: (a) introdurre Supabase Auth con magic link e ristrettire le policy, oppure (b) mettere il sito dietro a un'autenticazione a livello di hosting (es. Cloudflare Access).

## Sviluppo locale

```bash
npm install
cp .env.example .env
# compila VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

L'app si apre su `http://localhost:5173`. In locale `base` resta `/REPO_NAME/`, quindi Vite servirà tutto sotto quel prefisso — se preferisci che in dev sia alla radice puoi mettere `base: process.env.NODE_ENV === 'production' ? '/REPO_NAME/' : '/'`.

## Troubleshooting

- **App bianca su GitHub Pages**: quasi sicuramente `REPO_NAME` non è stato sostituito in `vite.config.js`.
- **"Configurazione mancante" all'apertura**: i secret GitHub non sono impostati o non sono stati riletti dal workflow. Controlla il job Actions e rilancia la build.
- **I profili creati non appaiono**: controlla che il SQL del punto 1 sia stato eseguito per intero e che il bucket `avatars` esista (altrimenti le creazioni con foto falliscono).
- **Gli aggiornamenti non arrivano in realtime**: verifica che nello schema la `publication supabase_realtime` includa `chore_logs` e `shopping_items` (la parte finale dello schema lo fa automaticamente). Puoi anche verificare da Supabase Dashboard → Database → Replication.
- **Upload avatar che fallisce**: il bucket `avatars` deve essere pubblico e le policy del bucket (`anon insert/select/update/delete`) devono esistere. Se l'hai creato prima di eseguire lo schema, rilancia lo schema per (ri)creare le policy.

Buona pulizia! 🧽
