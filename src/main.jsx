import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { ProfileProvider } from './context/ProfileContext.jsx'
import './index.css'

// NB: usiamo HashRouter (non BrowserRouter) perché l'app è ospitata su
// GitHub Pages sotto un path tipo /REPO_NAME/. HashRouter evita il problema
// dei 404 al refresh delle route annidate senza bisogno di un 404.html custom.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </HashRouter>
  </React.StrictMode>,
)
