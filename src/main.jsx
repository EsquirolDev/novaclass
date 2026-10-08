import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './state/auth.jsx'
import { ClaseProvider } from './state/clase.jsx'
import { StoreProvider } from './state/store.jsx'
import './styles/tokens.css'
import './styles/components.css'
import './styles/app.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ClaseProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </ClaseProvider>
    </AuthProvider>
  </StrictMode>,
)
