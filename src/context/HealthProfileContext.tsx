import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { HealthProfile, ProfilePermissions, ProfileAccessGrant } from '@/types/health'
import {
  getHealthProfiles,
  createHealthProfile,
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

const STORAGE_ACTIVE_PROFILE_KEY = 'sevisaude_active_profile_id'

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
      let list = await getHealthProfiles()

      // Identificar titular próprio da conta
      let ownProfile = list.find((p) => p.user === user.id && p.is_proprio)

      // Se o usuário não tem perfil próprio cadastrado, cria automaticamente
      if (!ownProfile) {
        try {
          const newOwn = await createHealthProfile({
            nome: user.name || 'Titular',
            parentesco: 'titular',
            is_proprio: true,
            data_nascimento: user.meta?.dataNascimento || '',
            tipo_sanguineo: undefined,
            alergias: user.alergias || '',
            condicoes_saude: user.condicoes_saude || '',
            contato_emergencia_nome:
              user.contato_emergencia_nome || user.meta?.contatoEmergenciaNome || '',
            contato_emergencia_telefone:
              user.contato_emergencia_telefone || user.meta?.contatoEmergenciaTelefone || '',
            contato_emergencia_parentesco:
              user.contato_emergencia_parentesco || user.meta?.contatoEmergenciaParentesco || '',
            plano_saude: user.plano_saude || user.meta?.planoSaude || '',
            numero_carteirinha: user.numero_carteirinha || user.meta?.numeroCarteirinha || '',
          })
          list = [newOwn, ...list]
          ownProfile = newOwn
        } catch (createErr) {
          console.warn('Não foi possível auto-criar health_profile do titular:', createErr)
        }
      }

      setProfiles(list)

      // Checar se precisa de onboarding (usuário novo sem flag onboardingCompleted)
      const hasCompleted = user.meta?.onboardingCompleted
      if (!hasCompleted) {
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
