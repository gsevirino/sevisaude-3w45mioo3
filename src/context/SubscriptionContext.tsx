import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMySubscriptionSummary, PLANS_CONFIG, ADMIN_EMAIL } from '@/services/billingService'
import type { SubscriptionSummary, PlanoKey, PlanDefinition } from '@/types/health'

interface SubscriptionContextType {
  summary: SubscriptionSummary | null
  isLoading: boolean
  isReadOnly: boolean
  isExpired: boolean
  isTrial: boolean
  isCortesia: boolean
  currentPlanKey: PlanoKey
  currentPlanDef: PlanDefinition
  isAdmin: boolean
  refreshSubscription: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setSummary(null)
      setIsLoading(false)
      return
    }

    try {
      const data = await getMySubscriptionSummary()
      setSummary(data)
    } catch (err) {
      console.warn('Erro ao carregar resumo de assinatura:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    refreshSubscription()
  }, [refreshSubscription])

  const isAdmin = (user?.email || '').toLowerCase().trim() === ADMIN_EMAIL

  const currentPlanKey: PlanoKey =
    summary?.subState?.planKey || summary?.subscription?.plano || 'essencial'
  const currentPlanDef = PLANS_CONFIG[currentPlanKey] || PLANS_CONFIG.essencial

  const status = summary?.subState?.status || summary?.subscription?.status || 'trial'
  const isCortesia = summary?.subState?.isCortesia ?? summary?.subscription?.is_cortesia ?? false
  const isExpired = status === 'expirada'
  const isTrial = status === 'trial'

  // O sistema degrada graciosamente para modo leitura quando a assinatura expirar
  // Contas cortesia nunca entram em modo leitura enquanto válidas
  const isReadOnly = isExpired && !isCortesia

  return (
    <SubscriptionContext.Provider
      value={{
        summary,
        isLoading,
        isReadOnly,
        isExpired,
        isTrial,
        isCortesia,
        currentPlanKey,
        currentPlanDef,
        isAdmin,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscription deve ser utilizado dentro de SubscriptionProvider')
  }
  return ctx
}
