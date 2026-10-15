import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ArrowLeft, Send, Loader2, CheckCircle2 } from 'lucide-react'
import SeviSaudeLogo from '@/components/SeviSaudeLogo'
import { toast } from '@/hooks/use-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { requestPasswordReset } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
      toast({
        title: 'E-mail enviado',
        description: 'Se o endereço estiver cadastrado, você receberá o link para redefinição.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar',
        description: err?.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#DCE9D4]/60 blob-organic blur-2xl pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <SeviSaudeLogo
            layout="vertical"
            size={48}
            showSlogan
            sloganText="Sua jornada de saúde, conectada."
          />
          <h1 className="font-serif italic text-2xl md:text-3xl text-[#26362B] font-semibold tracking-tight mt-3">
            Recuperar senha
          </h1>
          <p className="text-[#6B7A6F] mt-1.5 text-xs font-sans">
            Enviaremos as instruções de redefinição para sua caixa de entrada
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-[0_12px_32px_rgba(38,54,43,0.08)] border border-[#D9E2D4]">
          {sent ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="font-serif italic text-xl text-[#26362B]">E-mail enviado!</h2>
              <p className="text-xs text-[#6B7A6F] leading-relaxed">
                Verifique a caixa de entrada de <strong>{email}</strong> (e a pasta de spam) e
                clique no link recebido para cadastrar uma nova senha.
              </p>
              <div className="pt-4">
                <Link
                  to="/entrar"
                  className="inline-flex items-center gap-2 text-sm text-[#4C7A5A] font-semibold hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar ao login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                  Seu e-mail cadastrado
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar instruções</span>
                  </>
                )}
              </button>

              <div className="pt-4 text-center">
                <Link
                  to="/entrar"
                  className="inline-flex items-center gap-1.5 text-xs text-[#6B7A6F] hover:text-[#26362B]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
