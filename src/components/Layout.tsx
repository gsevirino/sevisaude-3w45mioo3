import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import ProfileSelector from '@/components/ProfileSelector'
import OnboardingModal from '@/components/OnboardingModal'
import {
  LayoutDashboard,
  Pill,
  UserCheck,
  CalendarCheck,
  FileSearch,
  CalendarDays,
  FolderOpen,
  CreditCard,
  UserCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import SeviSaudeLogo, { SeviSaudeIcon } from '@/components/SeviSaudeLogo'
import { toast } from '@/hooks/use-toast'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Painel inicial', path: '/', icon: LayoutDashboard },
  { label: 'Meus medicamentos', path: '/medicamentos', icon: Pill },
  { label: 'Médicos e profissionais', path: '/medicos', icon: UserCheck },
  { label: 'Consultas', path: '/consultas', icon: CalendarCheck },
  { label: 'Exames', path: '/exames', icon: FileSearch },
  { label: 'Calendário', path: '/calendario', icon: CalendarDays },
  { label: 'Documentos de saúde', path: '/documentos', icon: FolderOpen },
  { label: 'Meu cartão de saúde', path: '/cartao', icon: CreditCard },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { needsOnboarding, completeOnboarding, activeProfile, isOwner } = useHealthProfile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast({
      title: 'Sessão encerrada',
      description: 'Até logo! Seus dados de saúde continuam salvos com segurança.',
    })
    navigate('/entrar')
  }

  const userInitials = (user?.name || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')

  const renderNavLinks = (closeDrawer = false) => (
    <div className="flex flex-col gap-1 flex-1 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={() => closeDrawer && setDrawerOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-[#E7F0E3] text-[#26362B] shadow-sm font-semibold'
                  : 'text-[#E7F0E3]/90 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive ? 'bg-[#4C7A5A] scale-100' : 'bg-transparent scale-0'
                  }`}
                />
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[#4C7A5A]' : 'text-[#DCE9D4]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col text-[#26362B] antialiased">
      {/* Mobile Sticky Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#4C7A5A] text-white px-4 py-3 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <SeviSaudeIcon size={26} variant="light" />
            <div className="flex items-baseline gap-0.5">
              <span className="font-serif italic font-semibold text-lg tracking-tight text-white">
                Sevi
              </span>
              <span className="font-serif italic font-bold text-lg tracking-tight text-[#74C69D]">
                Saúde
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36">
            <ProfileSelector compact />
          </div>
          <button
            onClick={() => navigate('/perfil')}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-xs"
          >
            <div className="w-7 h-7 rounded-full bg-[#E7F0E3] text-[#26362B] font-bold flex items-center justify-center text-xs">
              {userInitials}
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 no-print"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer Content */}
      <aside
        className={`lg:hidden fixed top-0 bottom-0 left-0 z-50 w-72 bg-gradient-to-b from-[#4C7A5A] to-[#385942] text-white p-5 flex flex-col transform transition-transform duration-200 ease-in-out no-print ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center shadow">
              <SeviSaudeIcon size={24} variant="light" />
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="font-serif italic font-bold text-xl text-white">Sevi</span>
                <span className="font-serif italic font-bold text-xl text-[#74C69D]">Saúde</span>
              </div>
              <span className="text-[11px] text-[#DCE9D4]">Sua jornada conectada</span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar menu"
            className="p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderNavLinks(true)}

        <div className="pt-3 border-t border-white/15 space-y-1">
          <NavLink
            to="/perfil"
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition ${
                isActive
                  ? 'bg-[#E7F0E3] text-[#26362B] font-semibold'
                  : 'text-[#E7F0E3] hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <UserCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Meu perfil e configurações</span>
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium text-red-200 hover:bg-red-500/20 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Main Container with Desktop Sidebar */}
      <div className="flex flex-1 relative">
        {/* Desktop Fixed Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-[#4C7A5A] to-[#385942] text-white p-5 fixed top-0 bottom-0 left-0 z-30 shadow-xl no-print">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/15">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner ring-2 ring-white/10 shrink-0">
              <SeviSaudeIcon size={26} variant="light" />
            </div>
            <div>
              <div className="flex items-baseline gap-0.5 leading-none">
                <span className="font-serif italic font-bold text-2xl tracking-tight text-white">
                  Sevi
                </span>
                <span className="font-serif italic font-bold text-2xl tracking-tight text-[#74C69D]">
                  Saúde
                </span>
              </div>
              <span className="text-[11px] text-[#DCE9D4] font-light block mt-1">
                Prontuário particular
              </span>
            </div>
          </div>

          {/* Seletor de Titular de Saúde Ativo */}
          <div className="pt-3 pb-2">
            <ProfileSelector />
          </div>

          {/* Navigation Links */}
          {renderNavLinks(false)}

          {/* User info & Footer Profile / Logout */}
          <div className="pt-4 border-t border-white/15 space-y-1.5">
            <NavLink
              to="/perfil"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-medium transition group ${
                  isActive
                    ? 'bg-[#E7F0E3] text-[#26362B] font-semibold shadow'
                    : 'text-[#E7F0E3] hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <UserCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">Meu perfil e configurações</span>
            </NavLink>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-full text-sm font-medium text-[#E7F0E3]/80 hover:bg-white/10 hover:text-red-200 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </aside>

        {/* Page Content */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
          <main className="flex-1 p-4 md:p-8 max-w-[1200px] w-full mx-auto">
            <Outlet />
          </main>

          {/* Discreet Footer */}
          <footer className="py-6 px-4 text-center border-t border-[#D9E2D4]/60 text-xs text-[#6B7A6F] flex flex-col sm:flex-row items-center justify-center gap-2 no-print">
            <div className="flex items-center gap-1.5">
              <SeviSaudeIcon size={16} variant="brand" />
              <span>
                <strong>SeviSaúde</strong> — Sua jornada de saúde, conectada.
              </span>
            </div>
            <span className="hidden sm:inline text-[#D9E2D4]">•</span>
            <span className="text-[11px] text-[#6B7A6F]/80">sevisaude.com.br</span>
          </footer>
        </div>
      </div>

      {/* Modal de Onboarding se for primeiro acesso */}
      {needsOnboarding && <OnboardingModal onClose={completeOnboarding} />}
    </div>
  )
}
