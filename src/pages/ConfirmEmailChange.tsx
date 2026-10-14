import React, { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Leaf, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ConfirmEmailChange() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')
  const calledRef = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de alteração de e-mail não informado.')
      return
    }

    if (calledRef.current) return
    calledRef.current = true

    pb.collection('users')
      .confirmEmailChange(token, '')
      .then(() => {
        pb.authStore.clear()
        setStatus('success')
      })
      .catch((err: any) => {
        setStatus('error')
        setMessage(err?.message || 'Link inválido ou expirado.')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-md border border-[#D9E2D4] text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#4C7A5A] text-white shadow mb-4">
          <Leaf className="w-7 h-7" />
        </div>
        <h1 className="font-serif italic text-2xl text-[#26362B] mb-2 font-semibold">
          Alteração de E-mail
        </h1>

        {status === 'verifying' && (
          <div className="py-6 space-y-3">
            <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
            <p className="text-sm text-[#6B7A6F]">Confirmando a troca do endereço de e-mail...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-[#4C7A5A] mx-auto" />
            <p className="text-sm text-[#26362B] font-medium">E-mail atualizado com sucesso!</p>
            <p className="text-xs text-[#6B7A6F]">
              Por segurança, faça login novamente utilizando seu novo e-mail.
            </p>
            <div className="pt-2">
              <Link
                to="/entrar"
                className="inline-block py-3 px-6 rounded-full bg-[#4C7A5A] text-white text-sm font-medium hover:bg-[#3F664C]"
              >
                Fazer login
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-sm text-red-600 font-medium">Falha na alteração</p>
            <p className="text-xs text-[#6B7A6F]">{message}</p>
            <div className="pt-2">
              <Link
                to="/entrar"
                className="inline-block py-3 px-6 rounded-full bg-[#4C7A5A] text-white text-sm font-medium hover:bg-[#3F664C]"
              >
                Voltar ao login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
