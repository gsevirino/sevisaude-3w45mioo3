import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Leaf, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast({
        title: 'Preencha os campos',
        description: 'Nome, e-mail e senha são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve conter pelo menos 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'Certifique-se de digitar a mesma senha nos dois campos.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await signup(name, email, password)
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Seja bem-vindo(a) ao seu novo prontuário pessoal.',
      })
      navigate('/', { replace: true })
    } catch (err: any) {
      toast({
        title: 'Erro ao criar conta',
        description: err?.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative organic blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#DCE9D4]/60 blob-organic blur-2xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#A8C3A0]/40 blob-organic-alt blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#4C7A5A] text-white shadow-lg mb-4 ring-8 ring-[#DCE9D4]/60">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Criar meu prontuário
          </h1>
          <p className="text-[#6B7A6F] mt-2 text-sm font-sans">
            Comece a organizar remédios, consultas e exames em um só lugar seguro
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_12px_32px_rgba(38,54,43,0.08)] border border-[#D9E2D4]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                Seu nome completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Maria Silva Santos"
                className="w-full px-4 py-3 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7A5A] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@exemplo.com"
                className="w-full px-4 py-3 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7A5A] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                Senha (mínimo 8 caracteres) <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7A5A] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                Confirmar senha <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:outline-none focus:ring-2 focus:ring-[#4C7A5A] transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Criando sua conta...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir cadastro</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-[#D9E2D4] text-center text-xs text-[#6B7A6F]">
            Já tem uma conta?{' '}
            <Link to="/entrar" className="text-[#4C7A5A] font-semibold hover:underline">
              Fazer login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
