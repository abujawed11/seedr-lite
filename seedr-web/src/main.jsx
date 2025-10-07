import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Disclaimer from './components/Disclaimer.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import AuthWrapper from './components/AuthWrapper.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthWrapper>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="*" element={<App />} />
          </Routes>
        </AuthWrapper>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
