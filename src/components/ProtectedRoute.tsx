import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mb-3" />
        <p className="text-sm font-serif italic text-[#26362B]">Carregando seu prontuário...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/entrar" state={{ from: location }} replace />
  }

  return <>{children}</>
}
