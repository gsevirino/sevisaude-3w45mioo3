import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import { SubscriptionProvider } from '@/context/SubscriptionContext'
import { HealthProfileProvider } from '@/context/HealthProfileContext'
import { HealthRefreshProvider } from '@/context/HealthRefreshContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

// Public Pages
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import ConfirmEmailChange from '@/pages/ConfirmEmailChange'
import Marca from '@/pages/Marca'
import Planos from '@/pages/Planos'

// Protected App Pages
import Index from '@/pages/Index'
import Medicamentos from '@/pages/Medicamentos'
import Consultas from '@/pages/Consultas'
import Exames from '@/pages/Exames'
import Medicos from '@/pages/Medicos'
import Documentos from '@/pages/Documentos'
import CartaoSaude from '@/pages/CartaoSaude'
import Calendario from '@/pages/Calendario'
import Perfil from '@/pages/Perfil'
import AdminPage from '@/pages/AdminPage'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SubscriptionProvider>
          <HealthProfileProvider>
            <HealthRefreshProvider>
              <Routes>
                {/* Public Plans & Info */}
                <Route path="/planos" element={<Planos />} />

                {/* Public Auth Routes */}
                <Route path="/entrar" element={<Login />} />
                <Route path="/criar-conta" element={<Signup />} />
                <Route path="/esqueci-senha" element={<ForgotPassword />} />
                <Route path="/redefinir-senha" element={<ResetPassword />} />
                <Route path="/verificar-email" element={<VerifyEmail />} />
                <Route path="/confirmar-email" element={<ConfirmEmailChange />} />

                {/* Public Brand Routes (sem autenticação) */}
                <Route path="/marca" element={<Marca />} />
                <Route path="/brand" element={<Navigate to="/marca" replace />} />

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
                  <Route path="/admin" element={<AdminPage />} />
                </Route>

                {/* 404 Catch-All */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </HealthRefreshProvider>
          </HealthProfileProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
