import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { HealthRefreshProvider } from '@/context/HealthRefreshContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

// Public Auth Pages
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import ConfirmEmailChange from '@/pages/ConfirmEmailChange'

// Protected Health Pages
import Index from '@/pages/Index'
import Medicamentos from '@/pages/Medicamentos'
import Medicos from '@/pages/Medicos'
import Consultas from '@/pages/Consultas'
import Exames from '@/pages/Exames'
import Calendario from '@/pages/Calendario'
import Documentos from '@/pages/Documentos'
import CartaoSaude from '@/pages/CartaoSaude'
import Perfil from '@/pages/Perfil'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <HealthRefreshProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/entrar" element={<Login />} />
            <Route path="/criar-conta" element={<Signup />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/verificar-email" element={<VerifyEmail />} />
            <Route path="/confirmar-email" element={<ConfirmEmailChange />} />

            {/* Protected Routes inside Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/medicamentos" element={<Medicamentos />} />
              <Route path="/medicos" element={<Medicos />} />
              <Route path="/consultas" element={<Consultas />} />
              <Route path="/exames" element={<Exames />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/cartao" element={<CartaoSaude />} />
              <Route path="/perfil" element={<Perfil />} />
            </Route>

            {/* 404 Catch-All */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HealthRefreshProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
