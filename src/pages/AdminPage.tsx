import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import {
  getAdminPayments,
  getAdminSubscriptions,
  adminConfirmPayment,
  adminSetCortesia,
  adminUpdatePixSettings,
  getPixSettings,
  ADMIN_EMAIL,
  PLANS_CONFIG,
} from '@/services/billingService'
import { getFileUrl } from '@/services/healthService'
import type { Payment, Subscription, PlanoKey } from '@/types/health'
import { formatarDataHora, formatarData } from '@/lib/dateUtils'
import { toast } from '@/hooks/use-toast'
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  Gift,
  Users,
  Search,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react'

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'pagamentos' | 'cortesias' | 'pix_config'>(
    'pagamentos',
  )
  const [loading, setLoading] = useState(true)

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([])
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [recusaModalOpen, setRecusaModalOpen] = useState(false)
  const [paymentToRecuse, setPaymentToRecuse] = useState<Payment | null>(null)
  const [motivoRecusa, setMotivoRecusa] = useState('')

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [searchUser, setSearchUser] = useState('')
  const [cortesiaModalOpen, setCortesiaModalOpen] = useState(false)
  const [selectedSubForCortesia, setSelectedSubForCortesia] = useState<Subscription | null>(null)
  const [cortesiaPlano, setCortesiaPlano] = useState<PlanoKey>('completo')
  const [cortesiaDataAte, setCortesiaDataAte] = useState('2099-12-31')
  const [cortesiaNotas, setCortesiaNotas] = useState('Cortesia concedida pela administração')
  const [savingCortesia, setSavingCortesia] = useState(false)

  // PIX Settings state
  const [pixKey, setPixKey] = useState('')
  const [pixBeneficiary, setPixBeneficiary] = useState('')
  const [savingPix, setSavingPix] = useState(false)

  const isDona = (user?.email || '').toLowerCase().trim() === ADMIN_EMAIL

  const loadData = useCallback(async () => {
    if (!isDona) return
    setLoading(true)
    try {
      const [pmts, subs, pix] = await Promise.all([
        getAdminPayments(),
        getAdminSubscriptions(),
        getPixSettings(),
      ])
      setPayments(pmts)
      setSubscriptions(subs)
      setPixKey(pix.key)
      setPixBeneficiary(pix.beneficiary)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar painel',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [isDona])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (!isDona) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="font-serif italic text-2xl font-bold text-[#26362B]">
          Acesso Restrito à Administração
        </h1>
        <p className="text-xs text-[#6B7A6F] max-w-md">
          Esta área é reservada exclusivamente para a proprietária ({ADMIN_EMAIL}) para conferência
          manual de pagamentos PIX e gestão de cortesias.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-full bg-[#4C7A5A] text-white text-xs font-semibold hover:bg-[#3F664C]"
        >
          Voltar para o início
        </button>
      </div>
    )
  }

  // Confirmar pagamento
  const handleConfirmPayment = async (p: Payment) => {
    setActionLoadingId(p.id)
    try {
      await adminConfirmPayment(p.id, 'confirm')
      toast({
        title: 'Pagamento confirmado!',
        description: `Plano ${p.plano.toUpperCase()} ativado por 1 mês para o usuário.`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao confirmar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Abrir recusa
  const handlePromptRecusar = (p: Payment) => {
    setPaymentToRecuse(p)
    setMotivoRecusa('')
    setRecusaModalOpen(true)
  }

  const handleConfirmRecusa = async () => {
    if (!paymentToRecuse) return
    setActionLoadingId(paymentToRecuse.id)
    try {
      await adminConfirmPayment(paymentToRecuse.id, 'refuse', motivoRecusa)
      toast({
        title: 'Pagamento marcado como recusado',
        description: 'O status foi atualizado e ficará visível ao usuário.',
      })
      setRecusaModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao recusar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Helpers para identificar usuário com segurança e clareza
  const getUserDisplayName = (u?: { name?: string; email?: string } | null) => {
    const rawName = (u?.name || '').trim()
    const rawEmail = (u?.email || '').trim()
    if (rawName) return rawName
    if (rawEmail) return rawEmail
    return 'Conta sem nome'
  }

  const getUserDisplayEmail = (u?: { name?: string; email?: string } | null) => {
    const rawEmail = (u?.email || '').trim()
    if (rawEmail) return rawEmail
    return 'E-mail não informado'
  }

  // Helper para sugerir prazos de cortesia
  const aplicarPrazoSugerido = (meses: number) => {
    const d = new Date()
    d.setMonth(d.getMonth() + meses)
    setCortesiaDataAte(d.toISOString().split('T')[0])
  }

  const abrirModalCortesia = (sub: Subscription) => {
    setSelectedSubForCortesia(sub)
    // Se a conta já tiver um plano específico, sugerir ele; se for nova cortesia, sugerir "completo" ou o plano atual
    const planoInicial: PlanoKey =
      sub.plano === 'familia' || sub.plano === 'completo' || sub.plano === 'essencial'
        ? sub.plano
        : 'completo'
    setCortesiaPlano(planoInicial)

    // Se já tem data de cortesia futura válida, manter; se não, sugerir 1 ano (12 meses)
    if (sub.is_cortesia && sub.data_cortesia_ate) {
      setCortesiaDataAte(sub.data_cortesia_ate.split('T')[0])
    } else {
      const umAno = new Date()
      umAno.setFullYear(umAno.getFullYear() + 1)
      setCortesiaDataAte(umAno.toISOString().split('T')[0])
    }

    setCortesiaNotas(
      sub.notas_admin ||
        (sub.is_cortesia ? 'Cortesia ativa' : 'Cortesia concedida pela administração'),
    )
    setCortesiaModalOpen(true)
  }

  // Salvar Cortesia
  const handleSaveCortesia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubForCortesia) return
    setSavingCortesia(true)
    const nomePlano = PLANS_CONFIG[cortesiaPlano]?.nome || cortesiaPlano.toUpperCase()
    const isEdicao = selectedSubForCortesia.is_cortesia

    try {
      await adminSetCortesia({
        userId: selectedSubForCortesia.user,
        plano: cortesiaPlano,
        isCortesia: true,
        dataCortesiaAte: cortesiaDataAte,
        notas: cortesiaNotas,
      })
      toast({
        title: isEdicao ? 'Cortesia atualizada!' : 'Cortesia concedida com sucesso!',
        description: `Plano ${nomePlano} ativo com validade até ${formatarData(cortesiaDataAte)}.`,
      })
      setCortesiaModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar cortesia',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingCortesia(false)
    }
  }

  // Remover Cortesia
  const handleRevokeCortesia = async (sub: Subscription) => {
    const nomeUsuario = getUserDisplayName(sub.expand?.user)
    if (
      !confirm(
        `Deseja realmente revogar a cortesia da conta de "${nomeUsuario}"? A conta voltará ao fluxo padrão.`,
      )
    ) {
      return
    }
    try {
      await adminSetCortesia({
        userId: sub.user,
        plano: sub.plano || 'essencial',
        isCortesia: false,
        dataCortesiaAte: new Date().toISOString().split('T')[0],
        notas: 'Cortesia revogada pela administração em ' + new Date().toISOString().split('T')[0],
      })
      toast({
        title: 'Cortesia revogada com sucesso',
        description: 'A conta voltará ao fluxo normal de assinatura.',
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao revogar cortesia',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // Salvar Chave PIX
  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPix(true)
    try {
      await adminUpdatePixSettings(pixKey, pixBeneficiary)
      toast({
        title: 'Chave PIX atualizada!',
        description: 'Os dados já estão visíveis para os clientes nas telas de pagamento.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar chave',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingPix(false)
    }
  }

  const pendingPayments = payments.filter((p) => p.status === 'aguardando')
  const historyPayments = payments.filter((p) => p.status !== 'aguardando')

  const filteredSubs = subscriptions.filter((s) => {
    const userEmail = s.expand?.user?.email || ''
    const userName = s.expand?.user?.name || ''
    const term = searchUser.toLowerCase().trim()
    if (!term) return true
    return userEmail.toLowerCase().includes(term) || userName.toLowerCase().includes(term)
  })

  return (
    <div className="space-y-8 max-w-5xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4C7A5A] mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Área Administrativa SeviSaúde</span>
          </div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Gestão de Cobrança e Cortesias
          </h1>
          <p className="text-[#6B7A6F] text-xs md:text-sm mt-1">
            Confirmação manual de PIX, concessão de cortesias e configuração da chave bancária
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#D9E2D4] hover:bg-[#F6F4EF] text-xs font-semibold text-[#26362B] transition self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar dados</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D9E2D4] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pagamentos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'pagamentos'
              ? 'bg-[#4C7A5A] text-white shadow'
              : 'text-[#6B7A6F] hover:bg-[#E7F0E3]/70 hover:text-[#26362B]'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Pagamentos PIX ({pendingPayments.length} pendentes)</span>
        </button>

        <button
          onClick={() => setActiveTab('cortesias')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'cortesias'
              ? 'bg-[#4C7A5A] text-white shadow'
              : 'text-[#6B7A6F] hover:bg-[#E7F0E3]/70 hover:text-[#26362B]'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Assinaturas e Cortesias ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pix_config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'pix_config'
              ? 'bg-[#4C7A5A] text-white shadow'
              : 'text-[#6B7A6F] hover:bg-[#E7F0E3]/70 hover:text-[#26362B]'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          <span>Configuração da Chave PIX</span>
        </button>
      </div>

      {/* Tab 1: Pagamentos PIX */}
      {activeTab === 'pagamentos' && (
        <div className="space-y-6">
          {/* Pendentes */}
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9E2D4]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h2 className="font-serif italic text-xl font-semibold text-[#26362B]">
                  Pagamentos aguardando confirmação ({pendingPayments.length})
                </h2>
              </div>
              <span className="text-[11px] text-[#6B7A6F]">
                Confirme no seu banco antes de aprovar
              </span>
            </div>

            {pendingPayments.length === 0 ? (
              <p className="text-xs text-[#6B7A6F] py-8 text-center italic">
                Nenhum pagamento aguardando confirmação no momento. Bom trabalho!
              </p>
            ) : (
              <div className="space-y-4">
                {pendingPayments.map((pmt) => {
                  const comprovanteUrl = pmt.comprovante
                    ? getFileUrl('payments', pmt.id, pmt.comprovante)
                    : null
                  const planDef = PLANS_CONFIG[pmt.plano] || PLANS_CONFIG.essencial

                  return (
                    <div
                      key={pmt.id}
                      className="p-5 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4] flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[#26362B]">
                            {getUserDisplayName(pmt.expand?.user)}
                          </span>
                          <span className="text-xs text-[#6B7A6F]">
                            ({getUserDisplayEmail(pmt.expand?.user)})
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7F0E3] text-[#4C7A5A]">
                            {planDef.nome}
                          </span>
                        </div>

                        <div className="text-xs text-[#26362B] flex items-center gap-3">
                          <span className="font-bold text-emerald-800">
                            Valor: R$ {pmt.valor.toFixed(2).replace('.', ',')}
                          </span>
                          <span>•</span>
                          <span className="text-[#6B7A6F]">
                            Data informada: {formatarData(pmt.data_pagamento || pmt.created)}
                          </span>
                        </div>

                        {pmt.referencia && (
                          <p className="text-xs text-[#26362B] bg-white px-3 py-1.5 rounded-xl border border-[#D9E2D4] inline-block">
                            <strong>Referência / Transação:</strong> {pmt.referencia}
                          </p>
                        )}

                        {comprovanteUrl && (
                          <div className="pt-1">
                            <a
                              href={comprovanteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-[#4C7A5A] hover:underline font-semibold"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ver comprovante anexado</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleConfirmPayment(pmt)}
                          disabled={actionLoadingId === pmt.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmar PIX</span>
                        </button>

                        <button
                          onClick={() => handlePromptRecusar(pmt)}
                          disabled={actionLoadingId === pmt.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Recusar</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Histórico Recente */}
          <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-xs space-y-4">
            <h2 className="font-serif italic text-lg font-semibold text-[#26362B] pb-2 border-b border-[#D9E2D4]">
              Histórico de pagamentos processados ({historyPayments.length})
            </h2>

            {historyPayments.length === 0 ? (
              <p className="text-xs text-[#6B7A6F] py-4 text-center italic">
                Nenhum pagamento processado anteriormente.
              </p>
            ) : (
              <div className="space-y-2.5">
                {historyPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-[#F6F4EF]/50 border border-[#D9E2D4]/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#26362B]">
                          {getUserDisplayName(p.expand?.user)}
                        </span>
                        <span className="text-[11px] text-[#6B7A6F]">
                          ({getUserDisplayEmail(p.expand?.user)})
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            p.status === 'confirmado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {p.status}
                        </span>
                        <span className="text-[#6B7A6F]">•</span>
                        <span className="capitalize">{p.plano}</span>
                      </div>
                      <p className="text-[11px] text-[#6B7A6F] mt-0.5">
                        R$ {p.valor.toFixed(2).replace('.', ',')} • Confirmado em:{' '}
                        {formatarData(p.data_confirmacao || p.updated)}
                        {p.confirmado_por ? ` por ${p.confirmado_por}` : ''}
                      </p>
                    </div>

                    {p.comprovante && (
                      <a
                        href={getFileUrl('payments', p.id, p.comprovante)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-[#4C7A5A] hover:bg-white rounded-lg transition"
                        title="Ver comprovante"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Assinaturas e Gestão de Cortesias */}
      {activeTab === 'cortesias' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D9E2D4]">
            <div>
              <h2 className="font-serif italic text-xl font-semibold text-[#26362B]">
                Assinaturas e Concessão de Cortesia
              </h2>
              <p className="text-xs text-[#6B7A6F]">
                Defina contas como cortesia por períodos longos para testes, familiares ou parceiros
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#6B7A6F]" />
              <input
                type="text"
                placeholder="Filtrar por e-mail..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-full border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#D9E2D4] text-[#26362B]">
                  <th className="py-3 px-3 font-bold">Usuário</th>
                  <th className="py-3 px-3 font-bold">Plano</th>
                  <th className="py-3 px-3 font-bold">Status</th>
                  <th className="py-3 px-3 font-bold">Cortesia?</th>
                  <th className="py-3 px-3 font-bold">Validade</th>
                  <th className="py-3 px-3 text-right font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E2D4]/60 text-[#26362B]">
                {filteredSubs.map((sub) => {
                  const rawEmail = sub.expand?.user?.email || ''
                  const rawName = sub.expand?.user?.name || ''
                  const displayName = getUserDisplayName(sub.expand?.user)
                  const displayEmail = getUserDisplayEmail(sub.expand?.user)
                  const isGislaine = (rawEmail || '').toLowerCase().trim() === ADMIN_EMAIL
                  const planCfg = PLANS_CONFIG[sub.plano] || PLANS_CONFIG.essencial

                  return (
                    <tr key={sub.id} className="hover:bg-[#F6F4EF]/40 transition">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#26362B]">{displayName}</div>
                        <div className="text-[11px] text-[#6B7A6F]">
                          {rawName
                            ? displayEmail
                            : rawEmail
                              ? 'Nome não cadastrado'
                              : 'Sem e-mail cadastrado'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-[#4C7A5A] uppercase tracking-wide">
                          {sub.plano}
                        </span>
                        <div className="text-[10px] text-[#6B7A6F]">
                          {planCfg.nome.replace('Sevi ', '')}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            sub.status === 'ativa'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'trial'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {sub.is_cortesia ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 inline-flex items-center gap-1 w-max">
                            <Sparkles className="w-3 h-3" />
                            Cortesia
                          </span>
                        ) : (
                          <span className="text-[#6B7A6F]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#6B7A6F]">
                        {sub.is_cortesia
                          ? sub.data_cortesia_ate
                            ? formatarData(sub.data_cortesia_ate)
                            : 'Indeterminada'
                          : sub.status === 'trial'
                            ? sub.trial_ends_at
                              ? formatarData(sub.trial_ends_at)
                              : '30 dias'
                            : sub.data_fim
                              ? formatarData(sub.data_fim)
                              : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isGislaine ? (
                          <span className="text-[11px] text-[#6B7A6F] italic">Admin principal</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => abrirModalCortesia(sub)}
                              title={
                                sub.is_cortesia
                                  ? `Editar plano e validade da cortesia de ${displayName}`
                                  : `Conceder cortesia para ${displayName} (${displayEmail})`
                              }
                              className={`px-3 py-1.5 rounded-full font-semibold text-[11px] transition cursor-pointer ${
                                sub.is_cortesia
                                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200'
                                  : 'bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B]'
                              }`}
                            >
                              {sub.is_cortesia ? 'Editar cortesia' : 'Dar cortesia'}
                            </button>

                            {sub.is_cortesia && (
                              <button
                                onClick={() => handleRevokeCortesia(sub)}
                                title={`Revogar cortesia de ${displayName}`}
                                className="px-2.5 py-1.5 rounded-full text-red-600 hover:bg-red-50 text-[11px] font-medium transition cursor-pointer"
                              >
                                Revogar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Configuração da Chave PIX */}
      {activeTab === 'pix_config' && (
        <form
          onSubmit={handleSavePix}
          className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-xs space-y-6 max-w-2xl"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-[#D9E2D4]">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl font-semibold text-[#26362B]">
                Dados do PIX da Proprietária
              </h2>
              <p className="text-xs text-[#6B7A6F]">
                Estes dados são exibidos aos usuários ao realizarem a assinatura
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] text-xs text-[#6B7A6F] space-y-1">
            <p>
              ℹ <strong>Sem gateway automático:</strong> O SeviSaúde opera com cobrança PIX manual
              confirmada por você. Os clientes realizam a transferência diretamente para a chave
              cadastrada abaixo e anexam o comprovante ou código no app.
            </p>
            <p>
              Se a chave estiver vazia, o aplicativo orienta o cliente a entrar em contato
              diretamente com você para combinar o pagamento.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Chave PIX (E-mail, CPF/CNPJ, Celular ou Chave Aleatória)
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Ex.: gislaine.sevirino@gmail.com ou 11987654321"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Nome do Beneficiário (para conferência do cliente no banco)
              </label>
              <input
                type="text"
                value={pixBeneficiary}
                onChange={(e) => setPixBeneficiary(e.target.value)}
                placeholder="Ex.: Gislaine Sevirino"
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPix}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingPix ? 'Salvando...' : 'Salvar chave PIX'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal de Concessão / Edição de Cortesia */}
      {cortesiaModalOpen && selectedSubForCortesia && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCortesia}
            className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#D9E2D4] space-y-5 animate-scale-in"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-[#D9E2D4]">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif italic text-xl font-semibold text-[#26362B]">
                  {selectedSubForCortesia.is_cortesia
                    ? 'Editar Cortesia Ativa'
                    : 'Conceder Cortesia'}
                </h3>
                <p className="text-xs text-[#26362B] font-medium truncate">
                  {getUserDisplayName(selectedSubForCortesia.expand?.user)}
                </p>
                <p className="text-[11px] text-[#6B7A6F] truncate">
                  {getUserDisplayEmail(selectedSubForCortesia.expand?.user)}
                </p>
              </div>
            </div>

            {/* Seleção do Plano */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#26362B] uppercase tracking-wider">
                Escolha o Plano da Cortesia
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['essencial', 'completo', 'familia'] as PlanoKey[]).map((pkey) => {
                  const cfg = PLANS_CONFIG[pkey]
                  const isSelected = cortesiaPlano === pkey
                  return (
                    <button
                      type="button"
                      key={pkey}
                      onClick={() => setCortesiaPlano(pkey)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#4C7A5A] bg-[#E7F0E3]/70 ring-2 ring-[#4C7A5A]/30'
                          : 'border-[#D9E2D4] hover:bg-[#F6F4EF]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#26362B]">
                            {cfg.nome.replace('Sevi ', '')}
                          </span>
                          {pkey === 'completo' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#4C7A5A] text-white">
                              Rec.
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-[#4C7A5A]">{cfg.preco}</div>
                      </div>
                      <p className="text-[10px] text-[#6B7A6F] mt-2 line-clamp-2">
                        {cfg.maxProfiles} {cfg.maxProfiles === 1 ? 'perfil' : 'perfis'} •{' '}
                        {cfg.monthlyOcrDocs > 0 ? `${cfg.monthlyOcrDocs} OCR/mês` : 'Sem OCR'}
                      </p>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-[#6B7A6F]">
                Plano selecionado: <strong>{PLANS_CONFIG[cortesiaPlano]?.nome}</strong> (
                {PLANS_CONFIG[cortesiaPlano]?.preco}) — {PLANS_CONFIG[cortesiaPlano]?.tagline}
              </p>
            </div>

            {/* Validade e Atalhos de Prazo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#26362B] uppercase tracking-wider">
                  Prazo / Data de Validade da Cortesia
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#6B7A6F]">Sugerir:</span>
                  <button
                    type="button"
                    onClick={() => aplicarPrazoSugerido(6)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#D9E2D4] hover:bg-[#F6F4EF] text-[#26362B] transition cursor-pointer"
                  >
                    6 meses
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPrazoSugerido(12)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#D9E2D4] hover:bg-[#F6F4EF] text-[#26362B] transition cursor-pointer"
                  >
                    1 ano
                  </button>
                  <button
                    type="button"
                    onClick={() => setCortesiaDataAte('2099-12-31')}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#D9E2D4] hover:bg-[#F6F4EF] text-[#26362B] transition cursor-pointer"
                  >
                    Livre / 2099
                  </button>
                </div>
              </div>

              <input
                type="date"
                required
                value={cortesiaDataAte}
                onChange={(e) => setCortesiaDataAte(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
              <span className="text-[10px] text-[#6B7A6F] block">
                Cortesias têm prazo livre: a data é editável a qualquer momento. Use 2099-12-31 para
                cortesias sem prazo de expiração (vitalícia).
              </span>
            </div>

            {/* Motivo e Notas */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#26362B] uppercase tracking-wider">
                Motivo / Notas Internas da Administração
              </label>
              <input
                type="text"
                value={cortesiaNotas}
                onChange={(e) => setCortesiaNotas(e.target.value)}
                placeholder="Ex.: Conta de parceiro médico, parente, testador VIP"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#D9E2D4]">
              {selectedSubForCortesia.is_cortesia ? (
                <button
                  type="button"
                  onClick={() => {
                    const sub = selectedSubForCortesia
                    setCortesiaModalOpen(false)
                    handleRevokeCortesia(sub)
                  }}
                  className="px-3 py-2 rounded-full text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                >
                  Revogar cortesia
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCortesiaModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F] hover:bg-[#F6F4EF] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCortesia}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {savingCortesia
                      ? 'Salvando...'
                      : selectedSubForCortesia.is_cortesia
                        ? 'Salvar alterações'
                        : 'Ativar cortesia'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Recusa de Pagamento */}
      {recusaModalOpen && paymentToRecuse && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D9E2D4] space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif italic text-lg font-semibold text-[#26362B]">
                  Recusar Pagamento PIX
                </h3>
                <p className="text-xs text-[#26362B] font-medium">
                  {getUserDisplayName(paymentToRecuse.expand?.user)}
                </p>
                <p className="text-[11px] text-[#6B7A6F]">
                  {getUserDisplayEmail(paymentToRecuse.expand?.user)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1">
                Motivo da recusa (visível para o usuário)
              </label>
              <textarea
                rows={3}
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Ex.: Comprovante ilegível, valor divergente ou não identificado no extrato."
                className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecusaModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRecusa}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition"
              >
                Confirmar recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
