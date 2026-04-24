import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================================
// IMPORTANTE! — LEGGIMI PRIMA DI FARE IL DEPLOY SU GITHUB PAGES
// ----------------------------------------------------------------------------
// Sostituisci "REPO_NAME" qui sotto con il nome REALE del tuo repository GitHub.
// Esempio: se il repo si chiama "sorrento-chores", la riga deve diventare:
//     base: '/sorrento-chores/',
// Le barre iniziale e finale sono obbligatorie.
// Senza questa modifica l'app su GitHub Pages non troverà CSS/JS e apparirà bianca.
// ============================================================================
export default defineConfig({
  plugins: [react()],
  base: '/sorrento-chores/',
})
