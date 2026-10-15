import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import type {
  HealthProfile,
  ProfileAccessGrant,
  ProfilePermissions,
  AccessAuditLog,
} from '@/types/health'
import {
  getSentGrants,
  getReceivedGrants,
  createAccessInvite,
  updateGrantPermissions,
  revokeAccessGrant,
  acceptAccessGrant,
  declineAccessGrant,
  getAccessAuditLogs,
  createHealthProfile,
  updateHealthProfile,
  deleteHealthProfile,
  DEFAULT_PERMISSIONS_FULL,
  DEFAULT_PERMISSIONS_READONLY,
} from '@/services/healthProfileService'
import { formatarDataHora, formatarData } from '@/lib/dateUtils'
import { toast } from '@/hooks/use-toast'
import {
  Users,
  UserPlus,
  Send,
  Shield,
  KeyRound,
  Trash2,
  Check,
  X,
  History,
  Lock,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  HeartHandshake,
  Mail,
  ShieldAlert,
} from 'lucide-react'

export default function TitularesManager() {
  const { user } = useAuth()
  const { profiles, activeProfile, refreshProfiles, setActiveProfileId } = useHealthProfile()

  const [sentGrants, setSentGrants] = useState<ProfileAccessGrant[]>([])
  const [receivedGrants, setReceivedGrants] = useState<ProfileAccessGrant[]>([])
  const [auditLogs, setAuditLogs] = useState<AccessAuditLog[]>([])
  const [loading, setLoading] = useState(false)

  // Modal Novo Titular (dependente / familiar)
  const [showAddProfileModal, setShowAddProfileModal] = useState(false)
  const [newProfileNome, setNewProfileNome] = useState('')
  const [newProfileParentesco, setNewProfileParentesco] = useState('Filho(a)')
  const [newProfileDataNasc, setNewProfileDataNasc] = useState('')
  const [newProfileTipoSanguineo, setNewProfileTipoSanguineo] = useState('')
  const [newProfileAlergias, setNewProfileAlergias] = useState('')
  const [newProfileCondicoes, setNewProfileCondicoes] = useState('')

  // Modal Convidar Familiar / Cuidador
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteProfileId, setInviteProfileId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNome, setInviteNome] = useState('')
  const [inviteParentesco, setInviteParentesco] = useState('Familiar')
  const [invitePermissions, setInvitePermissions] = useState<ProfilePermissions>({
    ...DEFAULT_PERMISSIONS_READONLY,
    consultas_editar: true, // padrão amigável para cuidadores
  })

  // Modal Editar Permissões
  const [editingGrant, setEditingGrant] = useState<ProfileAccessGrant | null>(null)
  const [editingPermissions, setEditingPermissions] = useState<ProfilePermissions>(
    DEFAULT_PERMISSIONS_READONLY,
  )

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [sent, rec] = await Promise.all([getSentGrants(), getReceivedGrants()])
      setSentGrants(sent)
      setReceivedGrants(rec)

      if (activeProfile) {
        const logs = await getAccessAuditLogs(activeProfile.id)
        setAuditLogs(logs)
      }
    } catch (err) {
      console.error('Erro ao carregar vínculos e logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, activeProfile?.id])

  // Criar novo titular sob tutela / dependente
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProfileNome.trim()) return

    setLoading(true)
    try {
      const created = await createHealthProfile({
        nome: newProfileNome.trim(),
        parentesco: newProfileParentesco,
        data_nascimento: newProfileDataNasc,
        tipo_sanguineo: newProfileTipoSanguineo,
        alergias: newProfileAlergias,
        condicoes_saude: newProfileCondicoes,
        is_proprio: false,
      })
      await refreshProfiles()
      setActiveProfileId(created.id)
      setShowAddProfileModal(false)
      setNewProfileNome('')
      toast({
        title: 'Titular adicionado!',
        description: `O prontuário de ${created.nome} foi criado com sucesso.`,
      })
    } catch (err: any) {
      toast({
        title: 'Limite do plano atingido ou erro',
        description:
          err?.message || 'Verifique o limite de perfis de saúde do seu plano na aba Meu Plano.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Enviar convite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetProfId = inviteProfileId || activeProfile?.id
    if (!targetProfId || !inviteEmail.trim()) return

    setLoading(true)
    try {
      await createAccessInvite({
        profileId: targetProfId,
        granteeEmail: inviteEmail.trim(),
        granteeNome: inviteNome.trim(),
        parentesco: inviteParentesco.trim(),
        permissions: invitePermissions,
      })
      await loadData()
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteNome('')
      toast({
        title: 'Convite enviado!',
        description: `Convite de acesso registrado para ${inviteEmail}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar convite',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Revogar acesso
  const handleRevokeGrant = async (grant: ProfileAccessGrant) => {
    const confirm = window.confirm(
      `Tem certeza de que deseja REVOGAR o acesso de ${grant.grantee_email}? O acesso será suspenso na hora.`,
    )
    if (!confirm) return

    setLoading(true)
    try {
      await revokeAccessGrant(grant.id)
      await loadData()
      await refreshProfiles()
      toast({
        title: 'Vínculo revogado',
        description: `O acesso de ${grant.grantee_email} foi cancelado imediatamente.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao revogar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Salvar permissões alteradas
  const handleSavePermissions = async () => {
    if (!editingGrant) return
    setLoading(true)
    try {
      await updateGrantPermissions(editingGrant.id, editingPermissions)
      await loadData()
      setEditingGrant(null)
      toast({
        title: 'Permissões atualizadas',
        description: `As permissões de ${editingGrant.grantee_email} foram salvas.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar permissões',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Aceitar / Recusar convite recebido
  const handleAcceptGrant = async (grantId: string) => {
    setLoading(true)
    try {
      await acceptAccessGrant(grantId)
      await loadData()
      await refreshProfiles()
      toast({
        title: 'Convite aceito!',
        description: 'Agora você pode acessar este titular no seletor de saúde.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao aceitar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeclineGrant = async (grantId: string) => {
    setLoading(true)
    try {
      await declineAccessGrant(grantId)
      await loadData()
      toast({
        title: 'Convite recusado',
        description: 'O convite foi declinado.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao recusar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Seção 1: Titulares de Saúde Gerenciados */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9E2D4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Titulares de Saúde Acessíveis
              </h2>
              <p className="text-xs text-[#6B7A6F]">
                Alterne entre seus titulares ou adicione dependentes sob sua tutela
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddProfileModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Adicionar titular / dependente</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {profiles.map((p) => {
            const isSelected = activeProfile?.id === p.id
            const isSelf = p.is_proprio

            return (
              <div
                key={p.id}
                onClick={() => setActiveProfileId(p.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#4C7A5A] bg-[#E7F0E3]/70 ring-2 ring-[#4C7A5A]/30 shadow-sm'
                    : 'border-[#D9E2D4] bg-[#FDFCFB] hover:bg-[#F6F4EF]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isSelf ? 'bg-[#4C7A5A] text-white' : 'bg-[#DCE9D4] text-[#26362B]'
                      }`}
                    >
                      {isSelf ? 'Titular Principal' : p.parentesco || 'Dependente'}
                    </span>
                    {isSelected && (
                      <span className="text-[11px] font-bold text-[#4C7A5A] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Ativo
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif italic font-semibold text-base text-[#26362B] truncate">
                    {p.nome}
                  </h3>
                  {p.alergias && (
                    <p className="text-[11px] text-amber-800 line-clamp-1 mt-1">
                      Alergias: {p.alergias}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-[#D9E2D4]/60 flex items-center justify-between text-xs text-[#6B7A6F]">
                  <span>
                    {p.data_nascimento
                      ? `Nasc.: ${formatarData(p.data_nascimento)}`
                      : 'Sem data informada'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#4C7A5A]" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Informação sobre representação legal / menores */}
        <div className="p-4 rounded-2xl bg-[#F6F4EF]/80 border border-[#D9E2D4] text-xs text-[#4C7A5A] flex items-start gap-2.5">
          <Shield className="w-4 h-4 shrink-0 mt-0.5 text-[#4C7A5A]" />
          <div>
            <strong>Representação de menores e tutela:</strong> o SeviSaúde suporta o cadastro de
            dependentes sob cuidado do titular principal. As permissões de acesso respeitam o
            isolamento dos dados de cada pessoa.
          </div>
        </div>
      </div>

      {/* Seção 2: Convites e Vínculos com Familiares / Cuidadores */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9E2D4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Familiares e Cuidadores Autorizados
              </h2>
              <p className="text-xs text-[#6B7A6F]">
                Conceda acesso controlado a parentes ou cuidadores com permissões granulares
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setInviteProfileId(activeProfile?.id || '')
              setShowInviteModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition cursor-pointer self-start sm:self-auto"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Convidar familiar / cuidador</span>
          </button>
        </div>

        {/* Convites Recebidos (se houver pendentes ou aceitos) */}
        {receivedGrants.length > 0 && (
          <div className="space-y-3 pb-6 border-b border-[#D9E2D4]">
            <h3 className="text-xs font-bold text-[#26362B] uppercase tracking-wider">
              Convites Recebidos por Você
            </h3>
            <div className="space-y-2">
              {receivedGrants.map((rg) => (
                <div
                  key={rg.id}
                  className="p-4 rounded-2xl border border-[#D9E2D4] bg-[#F6F4EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#26362B]">
                      Acesso ao prontuário de: {rg.expand?.profile?.nome || 'Titular'}
                    </div>
                    <div className="text-[11px] text-[#6B7A6F]">
                      Convidado por:{' '}
                      {rg.expand?.grantor?.name || rg.expand?.grantor?.email || 'Titular'} • Status:{' '}
                      <strong className="uppercase">{rg.status}</strong>
                    </div>
                  </div>

                  {rg.status === 'pending' && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => handleAcceptGrant(rg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4C7A5A] text-white font-semibold text-xs shadow hover:bg-[#3F664C]"
                      >
                        <Check className="w-3 h-3" /> Aceitar
                      </button>
                      <button
                        onClick={() => handleDeclineGrant(rg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-red-300 text-red-700 font-semibold text-xs hover:bg-red-50"
                      >
                        <X className="w-3 h-3" /> Recusar
                      </button>
                    </div>
                  )}

                  {rg.status === 'accepted' && (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      Vínculo Ativo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vínculos Concedidos por Você */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#26362B] uppercase tracking-wider">
            Convites e Acessos Concedidos por Você
          </h3>

          {sentGrants.length === 0 ? (
            <p className="text-xs text-[#6B7A6F] italic py-4">
              Nenhum familiar ou cuidador convidado ainda. Clique em "Convidar familiar / cuidador"
              para compartilhar o prontuário com segurança.
            </p>
          ) : (
            <div className="space-y-3">
              {sentGrants.map((grant) => {
                const isRevoked = grant.status === 'revoked'
                const p = grant.permissions || DEFAULT_PERMISSIONS_READONLY

                return (
                  <div
                    key={grant.id}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      isRevoked
                        ? 'border-red-200 bg-red-50/40 opacity-70'
                        : 'border-[#D9E2D4] bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#26362B]">
                            {grant.grantee_nome || grant.grantee_email}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              grant.status === 'accepted'
                                ? 'bg-[#DCE9D4] text-[#26362B]'
                                : grant.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {grant.status === 'accepted'
                              ? 'Ativo'
                              : grant.status === 'pending'
                                ? 'Pendente'
                                : 'Revogado'}
                          </span>
                        </div>
                        <div className="text-xs text-[#6B7A6F] mt-0.5">
                          E-mail: <strong>{grant.grantee_email}</strong> • Titular vinculado:{' '}
                          <strong>{grant.expand?.profile?.nome || 'Titular'}</strong>
                          {grant.parentesco ? ` (${grant.parentesco})` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {!isRevoked && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGrant(grant)
                                setEditingPermissions({ ...p })
                              }}
                              className="px-3 py-1.5 rounded-full border border-[#D9E2D4] hover:bg-[#F6F4EF] text-xs font-semibold text-[#26362B]"
                            >
                              Editar permissões
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeGrant(grant)}
                              className="px-3 py-1.5 rounded-full border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold"
                            >
                              Revogar acesso
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Resumo visual das permissões */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.medicamentos_editar
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.medicamentos_ver
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        Medicamentos:{' '}
                        {p.medicamentos_editar
                          ? 'Editar'
                          : p.medicamentos_ver
                            ? 'Ver'
                            : 'Sem acesso'}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.consultas_editar
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.consultas_ver
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        Consultas:{' '}
                        {p.consultas_editar
                          ? 'Cadastrar/Editar'
                          : p.consultas_ver
                            ? 'Ver'
                            : 'Sem acesso'}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.exames_editar
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.exames_ver
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        Exames:{' '}
                        {p.exames_editar ? 'Gerenciar' : p.exames_ver ? 'Ver' : 'Sem acesso'}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.documentos_editar
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.documentos_ver
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        Documentos:{' '}
                        {p.documentos_editar
                          ? 'Anexar/Editar'
                          : p.documentos_ver
                            ? 'Ver'
                            : 'Sem acesso'}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.notificacoes_ver
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        Lembretes por E-mail: {p.notificacoes_ver ? 'Autorizado' : 'Não autorizado'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Seção 3: Histórico de Auditoria de Acessos */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#D9E2D4]">
          <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif italic text-xl text-[#26362B] font-semibold">
              Histórico de Autorizações e Auditoria
            </h2>
            <p className="text-xs text-[#6B7A6F]">
              Trilha imutável de convites enviados, aceites, mudanças de permissões e revogações
            </p>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-[#6B7A6F] italic py-4 text-center">
            Nenhuma ação de acesso registrada para este titular ainda.
          </p>
        ) : (
          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-[#F6F4EF]/60 border border-[#D9E2D4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#26362B]">{log.executor_name}</span>
                    <span className="text-[10px] uppercase font-bold text-[#4C7A5A] bg-[#E7F0E3] px-2 py-0.5 rounded-full">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7A6F] mt-0.5">{log.details}</p>
                </div>
                <span className="text-[11px] text-[#6B7A6F] shrink-0">
                  {formatarDataHora(
                    log.data_hora?.split('T')[0] || log.created?.split(' ')[0],
                    log.data_hora?.split('T')[1]?.slice(0, 5) || '',
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Adicionar Titular Dependente */}
      {showAddProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProfile}
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-[#D9E2D4] shadow-2xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2D4]">
              <h3 className="font-serif italic text-xl font-semibold text-[#26362B]">
                Novo Titular / Dependente
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProfileModal(false)}
                className="text-[#6B7A6F] hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1">
                Nome completo *
              </label>
              <input
                type="text"
                required
                value={newProfileNome}
                onChange={(e) => setNewProfileNome(e.target.value)}
                placeholder="Ex.: Enzo Sevirino"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Parentesco / Vínculo
                </label>
                <input
                  type="text"
                  value={newProfileParentesco}
                  onChange={(e) => setNewProfileParentesco(e.target.value)}
                  placeholder="Ex.: Filho(a), Pai, Mãe"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Data de nascimento
                </label>
                <input
                  type="date"
                  value={newProfileDataNasc}
                  onChange={(e) => setNewProfileDataNasc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1">
                Alergias conhecidas (opcional)
              </label>
              <input
                type="text"
                value={newProfileAlergias}
                onChange={(e) => setNewProfileAlergias(e.target.value)}
                placeholder="Ex.: Nenhuma ou Penicilina"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1">
                Condições de saúde (opcional)
              </label>
              <input
                type="text"
                value={newProfileCondicoes}
                onChange={(e) => setNewProfileCondicoes(e.target.value)}
                placeholder="Ex.: Asma, acompanhamento pediátrico"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9E2D4]">
              <button
                type="button"
                onClick={() => setShowAddProfileModal(false)}
                className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-semibold text-[#6B7A6F] hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow"
              >
                Cadastrar titular
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Convidar Familiar / Cuidador com Permissões Granulares */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSendInvite}
            className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 border border-[#D9E2D4] shadow-2xl space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2D4]">
              <div>
                <h3 className="font-serif italic text-xl font-semibold text-[#26362B]">
                  Convidar Familiar ou Cuidador
                </h3>
                <p className="text-xs text-[#6B7A6F]">
                  Defina permissões por categoria de informação médica
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-[#6B7A6F] hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Titular de saúde compartilhado
                </label>
                <select
                  value={inviteProfileId}
                  onChange={(e) => setInviteProfileId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A] bg-white"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.is_proprio ? 'Titular principal' : p.parentesco || 'Dependente'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    E-mail do convidado *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="familiar@exemplo.com.br"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Nome do familiar (opcional)
                  </label>
                  <input
                    type="text"
                    value={inviteNome}
                    onChange={(e) => setInviteNome(e.target.value)}
                    placeholder="Ex.: Maria Sevirino"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Grau de parentesco ou função
                </label>
                <input
                  type="text"
                  value={inviteParentesco}
                  onChange={(e) => setInviteParentesco(e.target.value)}
                  placeholder="Ex.: Filha, Cônjuge, Cuidador(a)"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>
            </div>

            {/* Configuração Granular de Permissões */}
            <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] space-y-3">
              <h4 className="text-xs font-bold text-[#26362B] uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#4C7A5A]" />
                Permissões Granulares por Categoria
              </h4>

              <div className="space-y-2 text-xs">
                {/* Medicamentos */}
                <div className="p-2.5 rounded-xl bg-white border border-[#D9E2D4] space-y-1.5">
                  <span className="font-semibold text-[#26362B] block">Medicamentos</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.medicamentos_ver}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            medicamentos_ver: e.target.checked,
                          })
                        }
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.medicamentos_editar}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            medicamentos_editar: e.target.checked,
                            medicamentos_ver: true,
                          })
                        }
                      />
                      <span>Cadastrar / Alterar posologia</span>
                    </label>
                  </div>
                </div>

                {/* Consultas */}
                <div className="p-2.5 rounded-xl bg-white border border-[#D9E2D4] space-y-1.5">
                  <span className="font-semibold text-[#26362B] block">Consultas Médicas</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.consultas_ver}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            consultas_ver: e.target.checked,
                          })
                        }
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.consultas_editar}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            consultas_editar: e.target.checked,
                            consultas_ver: true,
                          })
                        }
                      />
                      <span>Cadastrar / Atualizar notas</span>
                    </label>
                  </div>
                </div>

                {/* Exames */}
                <div className="p-2.5 rounded-xl bg-white border border-[#D9E2D4] space-y-1.5">
                  <span className="font-semibold text-[#26362B] block">Exames e Laudos</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.exames_ver}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            exames_ver: e.target.checked,
                          })
                        }
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.exames_editar}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            exames_editar: e.target.checked,
                            exames_ver: true,
                          })
                        }
                      />
                      <span>Gerenciar pedidos / resultados</span>
                    </label>
                  </div>
                </div>

                {/* Documentos */}
                <div className="p-2.5 rounded-xl bg-white border border-[#D9E2D4] space-y-1.5">
                  <span className="font-semibold text-[#26362B] block">Documentos de Saúde</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.documentos_ver}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            documentos_ver: e.target.checked,
                          })
                        }
                      />
                      <span>Visualizar</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invitePermissions.documentos_editar}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            documentos_editar: e.target.checked,
                            documentos_ver: true,
                          })
                        }
                      />
                      <span>Anexar / Editar</span>
                    </label>
                  </div>
                </div>

                {/* Notificações e Lembretes por E-mail */}
                <div className="p-2.5 rounded-xl bg-white border border-[#D9E2D4] space-y-1.5">
                  <span className="font-semibold text-[#26362B] block flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#4C7A5A]" />
                    Lembretes por E-mail do Titular
                  </span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!invitePermissions.notificacoes_ver}
                        onChange={(e) =>
                          setInvitePermissions({
                            ...invitePermissions,
                            notificacoes_ver: e.target.checked,
                          })
                        }
                      />
                      <span>Permitir receber lembretes de consultas e exames do titular</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-[#6B7A6F]">
                    O familiar só receberá os lembretes se também tiver o e-mail verificado e optar
                    por recebê-los em suas preferências.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9E2D4]">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-semibold text-[#6B7A6F] hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow"
              >
                Enviar convite de acesso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Editar Permissões do Vínculo Existente */}
      {editingGrant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-[#D9E2D4] shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2D4]">
              <div>
                <h3 className="font-serif italic text-xl font-semibold text-[#26362B]">
                  Editar Permissões de Acesso
                </h3>
                <p className="text-xs text-[#6B7A6F]">
                  Familiar: {editingGrant.grantee_nome || editingGrant.grantee_email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingGrant(null)}
                className="text-[#6B7A6F] hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4] space-y-1.5">
                <span className="font-semibold text-[#26362B] block">Medicamentos</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPermissions.medicamentos_ver}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          medicamentos_ver: e.target.checked,
                        })
                      }
                    />
                    <span>Visualizar</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPermissions.medicamentos_editar}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          medicamentos_editar: e.target.checked,
                          medicamentos_ver: true,
                        })
                      }
                    />
                    <span>Editar posologia / cadastrar</span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4] space-y-1.5">
                <span className="font-semibold text-[#26362B] block">Consultas Médicas</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPermissions.consultas_ver}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          consultas_ver: e.target.checked,
                        })
                      }
                    />
                    <span>Visualizar</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPermissions.consultas_editar}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          consultas_editar: e.target.checked,
                          consultas_ver: true,
                        })
                      }
                    />
                    <span>Cadastrar / Atualizar notas</span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4] space-y-1.5">
                <span className="font-semibold text-[#26362B] block">Exames</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPermissions.exames_ver}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          exames_ver: e.target.checked,
                        })
                      }
                    />
                    <span>Visualizar</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPermissions.exames_editar}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          exames_editar: e.target.checked,
                          exames_ver: true,
                        })
                      }
                    />
                    <span>Gerenciar pedidos / resultados</span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4] space-y-1.5">
                <span className="font-semibold text-[#26362B] block">Documentos de Saúde</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPermissions.documentos_ver}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          documentos_ver: e.target.checked,
                        })
                      }
                    />
                    <span>Visualizar</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPermissions.documentos_editar}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          documentos_editar: e.target.checked,
                          documentos_ver: true,
                        })
                      }
                    />
                    <span>Anexar / Editar</span>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F4EF] border border-[#D9E2D4] space-y-1.5">
                <span className="font-semibold text-[#26362B] block flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#4C7A5A]" />
                  Lembretes por E-mail do Titular
                </span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editingPermissions.notificacoes_ver}
                      onChange={(e) =>
                        setEditingPermissions({
                          ...editingPermissions,
                          notificacoes_ver: e.target.checked,
                        })
                      }
                    />
                    <span>Permitir receber lembretes de consultas e exames do titular</span>
                  </label>
                </div>
                <p className="text-[10px] text-[#6B7A6F]">
                  O familiar precisa ter e-mail verificado e aceitar nas preferências dele.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9E2D4]">
              <button
                type="button"
                onClick={() => setEditingGrant(null)}
                className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-semibold text-[#6B7A6F] hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSavePermissions}
                className="px-5 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow"
              >
                Salvar permissões
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
