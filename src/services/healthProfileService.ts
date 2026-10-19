import pb from '@/lib/pocketbase/client'
import type {
  HealthProfile,
  ProfileAccessGrant,
  AccessAuditLog,
  ProfilePermissions,
} from '@/types/health'

export const DEFAULT_PERMISSIONS_FULL: ProfilePermissions = {
  medicamentos_ver: true,
  medicamentos_editar: true,
  medicos_ver: true,
  medicos_editar: true,
  consultas_ver: true,
  consultas_editar: true,
  exames_ver: true,
  exames_editar: true,
  clinicas_ver: true,
  clinicas_editar: true,
  documentos_ver: true,
  documentos_editar: true,
  calendario_ver: true,
  cartao_ver: true,
  notificacoes_ver: true,
}

export const DEFAULT_PERMISSIONS_READONLY: ProfilePermissions = {
  medicamentos_ver: true,
  medicamentos_editar: false,
  medicos_ver: true,
  medicos_editar: false,
  consultas_ver: true,
  consultas_editar: false,
  exames_ver: true,
  exames_editar: false,
  clinicas_ver: true,
  clinicas_editar: false,
  documentos_ver: true,
  documentos_editar: false,
  calendario_ver: true,
  cartao_ver: true,
  notificacoes_ver: false,
}

// ==================== TITULARES (HEALTH PROFILES) ====================

export async function getHealthProfiles(): Promise<HealthProfile[]> {
  const user = pb.authStore.model
  if (!user) return []

  // Titulares criados pela própria conta
  const ownProfiles = await pb.collection('health_profiles').getFullList<HealthProfile>({
    filter: `user = "${user.id}"`,
    sort: '-is_proprio,nome',
  })

  // Titulares concedidos via ProfileAccessGrant aceitos
  let grantedProfiles: HealthProfile[] = []
  try {
    const grants = await pb.collection('profile_access_grants').getFullList<ProfileAccessGrant>({
      filter: `(grantee_user = "${user.id}" || grantee_email = "${user.email}") && status = "accepted"`,
      expand: 'profile',
    })

    grantedProfiles = grants
      .map((g) => g.expand?.profile)
      .filter((p): p is HealthProfile => !!p && !ownProfiles.some((op) => op.id === p.id))
  } catch (err) {
    console.warn('Erro ao carregar vínculos aceitos:', err)
  }

  return [...ownProfiles, ...grantedProfiles]
}

export async function getHealthProfileById(id: string): Promise<HealthProfile | null> {
  try {
    return await pb.collection('health_profiles').getOne<HealthProfile>(id)
  } catch {
    return null
  }
}

export async function createHealthProfile(
  data: Omit<HealthProfile, 'id' | 'created' | 'updated' | 'user'>,
): Promise<HealthProfile> {
  const userId = pb.authStore.model?.id
  if (!userId) throw new Error('Usuário não autenticado')

  return pb.collection('health_profiles').create<HealthProfile>({
    ...data,
    user: userId,
  })
}

export async function updateHealthProfile(
  id: string,
  data: Partial<HealthProfile>,
): Promise<HealthProfile> {
  return pb.collection('health_profiles').update<HealthProfile>(id, data)
}

export async function deleteHealthProfile(id: string): Promise<boolean> {
  return pb.collection('health_profiles').delete(id)
}

// ==================== VÍNCULOS DE ACESSO (GRANTS) ====================

export async function getSentGrants(profileId?: string): Promise<ProfileAccessGrant[]> {
  const userId = pb.authStore.model?.id
  if (!userId) return []

  const filter = profileId
    ? `grantor = "${userId}" && profile = "${profileId}"`
    : `grantor = "${userId}"`

  return pb.collection('profile_access_grants').getFullList<ProfileAccessGrant>({
    filter,
    sort: '-created',
    expand: 'profile,grantee_user',
  })
}

export async function getReceivedGrants(): Promise<ProfileAccessGrant[]> {
  const user = pb.authStore.model
  if (!user) return []

  return pb.collection('profile_access_grants').getFullList<ProfileAccessGrant>({
    filter: `(grantee_user = "${user.id}" || grantee_email = "${user.email}") && status != "revoked"`,
    sort: '-created',
    expand: 'profile,grantor',
  })
}

export async function getGrantForProfile(profileId: string): Promise<ProfileAccessGrant | null> {
  const user = pb.authStore.model
  if (!user) return null

  try {
    const list = await pb.collection('profile_access_grants').getList<ProfileAccessGrant>(1, 1, {
      filter: `profile = "${profileId}" && (grantee_user = "${user.id}" || grantee_email = "${user.email}") && status = "accepted"`,
    })
    return list.items[0] || null
  } catch {
    return null
  }
}

export interface CreateInvitePayload {
  profileId: string
  granteeEmail: string
  granteeNome?: string
  parentesco?: string
  permissions: ProfilePermissions
}

export async function createAccessInvite(
  payload: CreateInvitePayload,
): Promise<ProfileAccessGrant> {
  const user = pb.authStore.model
  if (!user) throw new Error('Usuário não autenticado')

  const token = 'inv_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)

  // Checar se já existe um usuário com esse email para vincular grantee_user
  let granteeUserId: string | undefined
  try {
    const users = await pb.collection('users').getList(1, 1, {
      filter: `email = "${payload.granteeEmail.trim()}"`,
    })
    if (users.items[0]) {
      granteeUserId = users.items[0].id
    }
  } catch {
    // ignora se não encontrar
  }

  const grant = await pb.collection('profile_access_grants').create<ProfileAccessGrant>({
    profile: payload.profileId,
    grantor: user.id,
    grantee_user: granteeUserId,
    grantee_email: payload.granteeEmail.trim().toLowerCase(),
    grantee_nome: payload.granteeNome || '',
    parentesco: payload.parentesco || '',
    status: 'pending',
    invite_token: token,
    permissions: payload.permissions,
  })

  // Registrar auditoria
  await logAccessAudit({
    target_profile: payload.profileId,
    action: 'invite_created',
    details: `Convite enviado para ${payload.granteeEmail} com perfil de permissões personalizado.`,
    grantee_email: payload.granteeEmail,
    metadata: payload.permissions,
  })

  return grant
}

export async function updateGrantPermissions(
  grantId: string,
  permissions: ProfilePermissions,
): Promise<ProfileAccessGrant> {
  const grant = await pb.collection('profile_access_grants').update<ProfileAccessGrant>(grantId, {
    permissions,
  })

  await logAccessAudit({
    target_profile: grant.profile,
    action: 'permissions_updated',
    details: `Permissões de acesso atualizadas para ${grant.grantee_email}.`,
    grantee_email: grant.grantee_email,
    metadata: permissions,
  })

  return grant
}

export async function revokeAccessGrant(grantId: string): Promise<ProfileAccessGrant> {
  const grant = await pb.collection('profile_access_grants').update<ProfileAccessGrant>(grantId, {
    status: 'revoked',
  })

  await logAccessAudit({
    target_profile: grant.profile,
    action: 'grant_revoked',
    details: `Vínculo de acesso revogado para ${grant.grantee_email}. Acesso suspenso imediatamente.`,
    grantee_email: grant.grantee_email,
  })

  return grant
}

export async function acceptAccessGrant(grantId: string): Promise<ProfileAccessGrant> {
  const user = pb.authStore.model
  const grant = await pb.collection('profile_access_grants').update<ProfileAccessGrant>(grantId, {
    status: 'accepted',
    grantee_user: user?.id,
  })

  await logAccessAudit({
    target_profile: grant.profile,
    action: 'invite_accepted',
    details: `Convite de acesso aceito por ${user?.name || user?.email || grant.grantee_email}.`,
    grantee_email: grant.grantee_email,
  })

  return grant
}

export async function declineAccessGrant(grantId: string): Promise<ProfileAccessGrant> {
  const grant = await pb.collection('profile_access_grants').update<ProfileAccessGrant>(grantId, {
    status: 'declined',
  })

  await logAccessAudit({
    target_profile: grant.profile,
    action: 'invite_declined',
    details: `Convite recusado por ${grant.grantee_email}.`,
    grantee_email: grant.grantee_email,
  })

  return grant
}

// ==================== AUDITORIA DE ACESSO ====================

export interface AccessAuditPayload {
  target_profile: string
  action: AccessAuditLog['action']
  details?: string
  grantee_email?: string
  metadata?: any
}

export async function logAccessAudit(payload: AccessAuditPayload): Promise<void> {
  try {
    const user = pb.authStore.model
    if (!user) return

    await pb.collection('access_audit_logs').create({
      target_profile: payload.target_profile,
      executor_user: user.id,
      executor_name: user.name || user.email || 'Usuário',
      action: payload.action,
      details: payload.details || '',
      grantee_email: payload.grantee_email || '',
      metadata: payload.metadata || null,
      data_hora: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Erro ao registrar auditoria de acesso:', err)
  }
}

export async function getAccessAuditLogs(profileId: string): Promise<AccessAuditLog[]> {
  try {
    return await pb.collection('access_audit_logs').getFullList<AccessAuditLog>({
      filter: `target_profile = "${profileId}"`,
      sort: '-created',
    })
  } catch {
    return []
  }
}
