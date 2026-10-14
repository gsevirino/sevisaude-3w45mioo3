import React, { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Leaf, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')
  const { confirmVerification } = useAuth()
  const calledRef = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de verificação não informado.')
      return
    }

    if (calledRef.current) return
    calledRef.current = true

    confirmVerification(token)
      .then(() => {
        setStatus('success')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.message || 'Token inválido ou expirado.')
      })
  }, [token, confirmVerification])

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-md border border-[#D9E2D4] text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#4C7A5A] text-white shadow mb-4">
          <Leaf className="w-7 h-7" />
        </div>
        <h1 className="font-serif italic text-2xl text-[#26362B] mb-2 font-semibold">
          Verificação de E-mail
        </h1>

        {status === 'verifying' && (
          <div className="py-6 space-y-3">
            <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
            <p className="text-sm text-[#6B7A6F]">Confirmando seu endereço de e-mail...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-[#4C7A5A] mx-auto" />
            <p className="text-sm text-[#26362B] font-medium">E-mail confirmado com sucesso!</p>
            <p className="text-xs text-[#6B7A6F]">
              Agora você pode aproveitar todos os recursos do seu prontuário VerdeVida.
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-block py-3 px-6 rounded-full bg-[#4C7A5A] text-white text-sm font-medium hover:bg-[#3F664C]"
              >
                Acessar meu painel
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-sm text-red-600 font-medium">Falha na verificação</p>
            <p className="text-xs text-[#6B7A6F]">{message}</p>
            <div className="pt-2">
              <Link
                to="/entrar"
                className="inline-block py-3 px-6 rounded-full bg-[#4C7A5A] text-white text-sm font-medium hover:bg-[#3F664C]"
              >
                Ir para o login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
