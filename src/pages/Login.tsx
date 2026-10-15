import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { HeartPulse, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import SeviSaudeLogo from '@/components/SeviSaudeLogo'
import { toast } from '@/hooks/use-toast'

export default function Login() {
  const [email, setEmail] = useState('gislaine.sevirino@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as any)?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe seu e-mail e senha para entrar.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      toast({
        title: 'Bem-vindo(a) de volta!',
        description: 'Seu prontuário pessoal está pronto.',
      })
      navigate(from, { replace: true })
    } catch (err: any) {
      toast({
        title: 'Não foi possível entrar',
        description: err?.message || 'Verifique seu e-mail e senha e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail('gislaine.sevirino@gmail.com')
    setPassword('Skip@Pass')
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative organic blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#DCE9D4]/60 blob-organic blur-2xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#A8C3A0]/40 blob-organic-alt blur-2xl pointer-events-none" />
      <div className="absolute top-1/2 -right-16 w-64 h-64 bg-[#5B9A8B]/10 blob-organic blur-xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <SeviSaudeLogo
            layout="vertical"
            size={52}
            showSlogan
            sloganText="Sua jornada de saúde, conectada."
          />
          <p className="text-[#6B7A6F] mt-2 text-xs font-sans">
            Seu prontuário particular • Cuide da sua saúde com carinho e clareza
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-[0_12px_32px_rgba(38,54,43,0.08)] border border-[#D9E2D4]">
          <h2 className="font-serif italic text-2xl text-[#26362B] mb-2 font-medium">
            Acessar minha conta
          </h2>
          <p className="text-xs text-[#6B7A6F] mb-6">
            Entre com suas credenciais para visualizar seus medicamentos, consultas e exames.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-4 py-3 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7A5A] transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#26362B] uppercase tracking-wider">
                  Senha <span className="text-red-500">*</span>
                </label>
                <Link
                  to="/esqueci-senha"
                  className="text-xs text-[#4C7A5A] hover:underline font-medium"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7A5A] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no prontuário</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-3.5 rounded-2xl bg-[#E7F0E3]/70 border border-[#DCE9D4] flex items-center justify-between text-xs text-[#26362B]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4C7A5A] shrink-0" />
              <span>
                Conta de demonstração pronta: <strong>gislaine.sevirino@gmail.com</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="text-[#4C7A5A] font-semibold underline hover:text-[#3F664C] shrink-0 ml-2 cursor-pointer"
            >
              Preencher
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-[#D9E2D4] text-center text-xs text-[#6B7A6F]">
            Não tem uma conta ainda?{' '}
            <Link to="/criar-conta" className="text-[#4C7A5A] font-semibold hover:underline">
              Criar conta gratuita
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-[#6B7A6F] mt-8 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-[#4C7A5A]" />
            <span>Privacidade total: seus dados de saúde pertencem apenas a você.</span>
          </p>
          <p className="text-[11px] text-[#6B7A6F]/70">sevisaude.com.br</p>
        </div>
      </div>
    </div>
  )
}
