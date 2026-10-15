import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { HealthProfile, ProfilePermissions, ProfileAccessGrant } from '@/types/health'
import {
  getHealthProfiles,
  getGrantForProfile,
  DEFAULT_PERMISSIONS_FULL,
  DEFAULT_PERMISSIONS_READONLY,
} from '@/services/healthProfileService'
import pb from '@/lib/pocketbase/client'

interface HealthProfileContextType {
  profiles: HealthProfile[]
  activeProfile: HealthProfile | null
  isLoadingProfiles: boolean
  isOwner: boolean
  activeGrant: ProfileAccessGrant | null
  permissions: ProfilePermissions
  setActiveProfileId: (id: string) => void
  refreshProfiles: () => Promise<void>
  needsOnboarding: boolean
  completeOnboarding: () => Promise<void>
}

const HealthProfileContext = createContext<HealthProfileContextType | undefined>(undefined)

const STORAGE_ACTIVE_PROFILE_KEY = 'verdevida_active_profile_id'

export const HealthProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const [profiles, setProfiles] = useState<HealthProfile[]>([])
  const [activeProfile, setActiveProfile] = useState<HealthProfile | null>(null)
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(true)
  const [activeGrant, setActiveGrant] = useState<ProfileAccessGrant | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false)

  const refreshProfiles = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setProfiles([])
      setActiveProfile(null)
      setActiveGrant(null)
      setIsLoadingProfiles(false)
      setNeedsOnboarding(false)
      return
    }

    setIsLoadingProfiles(true)
    try {
      const list = await getHealthProfiles()
      setProfiles(list)

      // Identificar titular próprio da conta
      const ownProfile = list.find((p) => p.user === user.id && p.is_proprio)

      // Checar se precisa de onboarding (usuário novo sem titular próprio ou flag onboardingCompleted ausente)
      const hasCompleted = user.meta?.onboardingCompleted
      if (
        !hasCompleted &&
        (!ownProfile ||
          (list.length === 1 && ownProfile && !user.alergias && !user.condicoes_saude))
      ) {
        setNeedsOnboarding(true)
      } else {
        setNeedsOnboarding(false)
      }

      // Definir titular ativo preferido
      const savedProfileId = localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY)
      let selected: HealthProfile | null = null

      if (savedProfileId) {
        selected = list.find((p) => p.id === savedProfileId) || null
      }

      if (!selected) {
        // Fallback: titular próprio ou o primeiro da lista
        selected = ownProfile || list[0] || null
      }

      setActiveProfile(selected)

      // Carregar vínculo e permissões se não for titular próprio
      if (selected && selected.user !== user.id) {
        const grant = await getGrantForProfile(selected.id)
        setActiveGrant(grant)
      } else {
        setActiveGrant(null)
      }
    } catch (err) {
      console.error('Erro ao carregar perfis de saúde:', err)
    } finally {
      setIsLoadingProfiles(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    refreshProfiles()
  }, [refreshProfiles])

  const setActiveProfileId = async (id: string) => {
    const found = profiles.find((p) => p.id === id)
    if (found) {
      setActiveProfile(found)
      localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, id)

      if (user && found.user !== user.id) {
        const grant = await getGrantForProfile(found.id)
        setActiveGrant(grant)
      } else {
        setActiveGrant(null)
      }
    }
  }

  const completeOnboarding = async () => {
    if (!user) return
    try {
      const updatedMeta = {
        ...(user.meta || {}),
        onboardingCompleted: true,
      }
      await pb.collection('users').update(user.id, {
        meta: updatedMeta,
      })
      await pb.collection('users').authRefresh()
      setNeedsOnboarding(false)
    } catch (err) {
      console.error('Erro ao marcar onboarding como concluído:', err)
      setNeedsOnboarding(false)
    }
  }

  // É dono do perfil ativo?
  const isOwner = !!(user && activeProfile && activeProfile.user === user.id)

  // Permissões ativas: se for dono, acesso total; se for convidado, as permissões do vínculo aceito
  const permissions: ProfilePermissions = isOwner
    ? DEFAULT_PERMISSIONS_FULL
    : activeGrant?.permissions || DEFAULT_PERMISSIONS_READONLY

  return (
    <HealthProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        isLoadingProfiles,
        isOwner,
        activeGrant,
        permissions,
        setActiveProfileId,
        refreshProfiles,
        needsOnboarding,
        completeOnboarding,
      }}
    >
      {children}
    </HealthProfileContext.Provider>
  )
}

export function useHealthProfile() {
  const ctx = useContext(HealthProfileContext)
  if (!ctx) throw new Error('useHealthProfile deve ser usado dentro de HealthProfileProvider')
  return ctx
}
