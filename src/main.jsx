import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'

// TODO: Replace with your actual Google OAuth Client ID
const GOOGLE_CLIENT_ID = "373508071148-0vvaiv7dovfb4r0f4ti9fnakf0ct17lq.apps.googleusercontent.com"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppProvider>
        <App />
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
