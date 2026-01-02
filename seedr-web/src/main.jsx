// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import './index.css'
// import App from './App.jsx'
// import Disclaimer from './components/Disclaimer.jsx'
// import { AuthProvider } from './context/AuthContext.jsx'
// import AuthWrapper from './components/AuthWrapper.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <BrowserRouter>
//       <AuthProvider>
//         <AuthWrapper>
//           <Routes>
//             <Route path="/" element={<App />} />
//             <Route path="/disclaimer" element={<Disclaimer />} />
//             <Route path="*" element={<App />} />
//           </Routes>
//         </AuthWrapper>
//       </AuthProvider>
//     </BrowserRouter>
//   </StrictMode>,
// )





import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

import App from './App.jsx'
import Disclaimer from './components/Disclaimer.jsx'

import ContactPage from './pages/ContactPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import RefundPage from './pages/RefundPage.jsx'
import ShippingDeliveryPage from './pages/ShippingDeliveryPage.jsx'
import DMCAPage from './pages/DMCAPage.jsx'
import NotFound from './pages/NotFound.jsx'

import { AuthProvider } from './context/AuthContext.jsx'
import AuthWrapper from './components/AuthWrapper.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ✅ PUBLIC – Razorpay verification pages */}
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/contact-us" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPage />} />
          <Route path="/terms-and-conditions" element={<TermsPage />} />
          <Route path="/cancellation-refund" element={<RefundPage />} />
          <Route path="/shipping-policy" element={<ShippingDeliveryPage />} />
          <Route path="/dmca" element={<DMCAPage />} />

          {/* 🔒 Main application */}
          <Route
            path="/"
            element={
              <AuthWrapper>
                <App />
              </AuthWrapper>
            }
          />

          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
