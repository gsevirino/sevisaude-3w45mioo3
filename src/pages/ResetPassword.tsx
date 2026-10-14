import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Leaf, KeyRound, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { confirmPasswordReset } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast({
        title: 'Token ausente',
        description: 'O link de recuperação parece inválido ou expirado.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas divergentes',
        description: 'As senhas informadas não conferem.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await confirmPasswordReset(token, password)
      setSuccess(true)
      toast({
        title: 'Senha alterada!',
        description: 'Você já pode acessar o VerdeVida com a nova senha.',
      })
      setTimeout(() => navigate('/entrar'), 2000)
    } catch (err: any) {
      toast({
        title: 'Erro ao redefinir',
        description: err?.message || 'Link inválido ou expirado. Solicite outro envio.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4C7A5A] text-white shadow-lg mb-4 ring-8 ring-[#DCE9D4]/60">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="font-serif italic text-3xl text-[#26362B] font-semibold tracking-tight">
            Nova senha
          </h1>
          <p className="text-[#6B7A6F] mt-2 text-sm font-sans">
            Defina uma nova senha segura para sua conta
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_12px_32px_rgba(38,54,43,0.08)] border border-[#D9E2D4]">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="font-serif italic text-xl text-[#26362B]">
                Senha atualizada com sucesso!
              </h2>
              <p className="text-xs text-[#6B7A6F]">Redirecionando você para o login...</p>
            </div>
          ) : !token ? (
            <div className="text-center py-4 space-y-3 text-xs text-[#6B7A6F]">
              <p>O token de redefinição não foi detectado no endereço.</p>
              <Link to="/esqueci-senha" className="text-[#4C7A5A] font-semibold underline block">
                Solicitar novo link de redefinição
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                  Nova senha (mínimo 8 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                  Confirme a nova senha
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando nova senha...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Salvar nova senha</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
