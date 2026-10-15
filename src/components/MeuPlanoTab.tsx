import React, { useState, useEffect } from 'react'
import { useSubscription } from '@/context/SubscriptionContext'
import { PLANS_CONFIG, createPaymentRequest, getMyPayments } from '@/services/billingService'
import type { PlanoKey, Payment } from '@/types/health'
import { formatarData } from '@/lib/dateUtils'
import { toast } from '@/hooks/use-toast'
import {
  Check,
  Sparkles,
  QrCode,
  Copy,
  UploadCloud,
  FileCheck,
  Clock,
  ShieldCheck,
  AlertCircle,
  HardDrive,
  Users,
  FileText,
  RotateCcw,
} from 'lucide-react'

interface MeuPlanoTabProps {
  initialChosenPlan?: PlanoKey
}

export function MeuPlanoTab({ initialChosenPlan }: MeuPlanoTabProps) {
  const {
    summary,
    isLoading,
    isReadOnly,
    isExpired,
    isTrial,
    isCortesia,
    currentPlanKey,
    currentPlanDef,
    refreshSubscription,
  } = useSubscription()

  // Selected plan to upgrade/renew
  const [selectedPlan, setSelectedPlan] = useState<PlanoKey>(
    initialChosenPlan || (currentPlanKey === 'essencial' ? 'completo' : currentPlanKey),
  )

  // Payment form state
  const [referencia, setReferencia] = useState('')
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
  const [submittingPayment, setSubmittingPayment] = useState(false)

  // Payments history
  const [paymentsHistory, setPaymentsHistory] = useState<Payment[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const chosenPlanDef = PLANS_CONFIG[selectedPlan] || PLANS_CONFIG.completo
  const pixConfig = summary?.pixConfig || { key: '', beneficiary: '', configured: false }

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const pmts = await getMyPayments()
      setPaymentsHistory(pmts)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleCopyPix = () => {
    if (!pixConfig.key) return
    navigator.clipboard.writeText(pixConfig.key)
    toast({
      title: 'Chave PIX copiada!',
      description: 'Cole no aplicativo do seu banco para transferir.',
    })
  }

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingPayment(true)
    try {
      await createPaymentRequest({
        plano: selectedPlan,
        valor: chosenPlanDef.valorMensal,
        referencia: referencia.trim() || undefined,
        comprovanteFile: comprovanteFile,
      })

      toast({
        title: 'Pagamento informado com sucesso!',
        description:
          'Aguarde a conferência manual da dona. Sua assinatura será ativada assim que o PIX for verificado.',
      })

      setReferencia('')
      setComprovanteFile(null)
      await Promise.all([refreshSubscription(), loadHistory()])
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingPayment(false)
    }
  }

  // Calculate storage usage
  const usedStorageMb = summary?.usage
    ? Math.round((summary.usage.estimatedStorageUsedBytes || 0) / (1024 * 1024))
    : 0
  const maxStorageMb = currentPlanDef.maxStorageMb
  const storagePercent = Math.min(100, Math.round((usedStorageMb / maxStorageMb) * 100))

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Status da Assinatura Atual */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9E2D4]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4C7A5A]">
                Assinatura Atual
              </span>
              {isCortesia && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  <Sparkles className="w-3 h-3" />
                  Cortesia Especial
                </span>
              )}
            </div>
            <h2 className="font-serif italic text-2xl md:text-3xl font-bold text-[#26362B]">
              {currentPlanDef.nome}
            </h2>
            <p className="text-xs text-[#6B7A6F] mt-0.5">{currentPlanDef.tagline}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs uppercase font-bold px-3 py-1.5 rounded-full ${
                isCortesia
                  ? 'bg-purple-100 text-purple-800'
                  : isExpired
                    ? 'bg-red-100 text-red-800'
                    : isTrial
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isCortesia
                ? 'Cortesia Ativa'
                : isExpired
                  ? 'Plano Expirado'
                  : isTrial
                    ? `Período de Teste (${summary?.usage?.daysRemaining ?? 30} dias restantes)`
                    : 'Assinatura Ativa'}
            </span>
          </div>
        </div>

        {/* Indicadores de Consumo de Cotas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Perfis */}
          <div className="p-4 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B7A6F]">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#4C7A5A]" />
                Perfis de saúde
              </span>
              <span className="font-bold text-[#26362B]">
                {summary?.usage?.profileCount ?? 1} / {currentPlanDef.maxProfiles}
              </span>
            </div>
            <div className="w-full bg-[#D9E2D4] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#4C7A5A] h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((summary?.usage?.profileCount ?? 1) / currentPlanDef.maxProfiles) * 100,
                  )}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-[#6B7A6F]">
              {isCortesia
                ? 'Sem restrições de perfis'
                : `Limite do plano: ${currentPlanDef.maxProfiles} ${currentPlanDef.maxProfiles > 1 ? 'perfis' : 'perfil'}`}
            </p>
          </div>

          {/* Armazenamento */}
          <div className="p-4 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B7A6F]">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#4C7A5A]" />
                Armazenamento
              </span>
              <span className="font-bold text-[#26362B]">
                ~{usedStorageMb} MB / {maxStorageMb} MB
              </span>
            </div>
            <div className="w-full bg-[#D9E2D4] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  storagePercent > 90 ? 'bg-red-500' : 'bg-[#4C7A5A]'
                }`}
                style={{ width: `${Math.max(5, storagePercent)}%` }}
              />
            </div>
            <p className="text-[10px] text-[#6B7A6F]">
              {summary?.usage?.docCount ?? 0} documento(s) anexado(s)
            </p>
          </div>

          {/* OCR Reservado */}
          <div className="p-4 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B7A6F]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4C7A5A]" />
                OCR de Receitas
              </span>
              <span className="font-bold text-[#26362B]">
                0 / {currentPlanDef.monthlyOcrDocs} docs/mês
              </span>
            </div>
            <div className="w-full bg-[#D9E2D4] h-2 rounded-full overflow-hidden">
              <div className="bg-[#4C7A5A] h-full rounded-full" style={{ width: '0%' }} />
            </div>
            <p className="text-[10px] text-[#6B7A6F]">
              {currentPlanDef.monthlyOcrDocs > 0
                ? 'Cota mensal reservada'
                : 'Disponível no Completo e Família'}
            </p>
          </div>
        </div>

        {isExpired && !isCortesia && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Seu plano ou período de teste expirou.</p>
              <p>
                O prontuário está atualmente em <strong>modo somente leitura</strong>. Você pode
                consultar todos os seus dados e exportá-los em PDF, mas não poderá salvar novas
                informações ou fazer uploads até renovar sua assinatura via PIX abaixo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Escolha do Plano e Pagamento PIX */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-xs space-y-8">
        <div>
          <h3 className="font-serif italic text-2xl font-bold text-[#26362B]">
            {isExpired ? 'Renovar Assinatura' : 'Fazer Upgrade ou Renovar'}
          </h3>
          <p className="text-xs text-[#6B7A6F] mt-1">
            Selecione o plano desejado e realize o pagamento via PIX manual com confirmação direta
            da proprietária
          </p>
        </div>

        {/* Seleção dos 3 planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['essencial', 'completo', 'familia'] as PlanoKey[]).map((key) => {
            const p = PLANS_CONFIG[key]
            const isSelected = selectedPlan === key

            return (
              <div
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#4C7A5A] bg-[#F6F4EF]'
                    : 'border-[#D9E2D4] bg-white hover:border-[#4C7A5A]/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif italic text-lg font-bold text-[#26362B]">
                      {p.nome}
                    </span>
                    {p.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4C7A5A] text-white">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="font-serif italic text-xl font-bold text-[#26362B]">
                    {p.preco}
                  </div>
                  <p className="text-[11px] text-[#6B7A6F]">{p.tagline}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#D9E2D4]/60 text-xs">
                  <span
                    className={`font-semibold ${isSelected ? 'text-[#4C7A5A]' : 'text-[#6B7A6F]'}`}
                  >
                    {isSelected ? '✓ Plano selecionado' : 'Clique para selecionar'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Instruções de Pagamento PIX e Formulário */}
        <div className="p-6 rounded-3xl bg-[#FAF8F5] border border-[#D9E2D4] space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-[#D9E2D4]">
            <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif italic text-xl font-bold text-[#26362B]">
                Instruções para Pagamento PIX
              </h4>
              <p className="text-xs text-[#6B7A6F]">
                Valor a pagar:{' '}
                <strong>R$ {chosenPlanDef.valorMensal.toFixed(2).replace('.', ',')}</strong>{' '}
                referente a 1 mês do plano <strong>{chosenPlanDef.nome}</strong>
              </p>
            </div>
          </div>

          {/* Dados da chave PIX */}
          {pixConfig.configured ? (
            <div className="space-y-3">
              <p className="text-xs text-[#26362B]">
                Faça o PIX através do aplicativo do seu banco utilizando a chave oficial abaixo:
              </p>

              <div className="p-4 rounded-2xl bg-white border border-[#D9E2D4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-[#6B7A6F] font-medium uppercase tracking-wider">
                    Chave PIX Oficial
                  </div>
                  <div className="font-mono text-sm font-bold text-[#26362B] select-all">
                    {pixConfig.key}
                  </div>
                  {pixConfig.beneficiary && (
                    <div className="text-xs text-[#4C7A5A] mt-0.5">
                      Beneficiário: <strong>{pixConfig.beneficiary}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar chave</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">Chave PIX em configuração</p>
              <p>
                A proprietária ainda não cadastrou a chave PIX automática nas configurações do
                sistema. Entre em contato diretamente pelo e-mail{' '}
                <a href="mailto:gislaine.sevirino@gmail.com" className="underline font-semibold">
                  gislaine.sevirino@gmail.com
                </a>{' '}
                para combinar a transferência ou tirar dúvidas.
              </p>
            </div>
          )}

          {/* Formulário de Notificação de Pagamento */}
          <form onSubmit={handleSendPayment} className="space-y-4 pt-2">
            <h5 className="font-serif italic text-base font-bold text-[#26362B]">
              Já fez o PIX? Avise-nos para liberar seu plano
            </h5>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Identificação ou Código da Transação (opcional mas recomendado)
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ex.: ID do PIX E000000..., seu nome no comprovante ou número final"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Anexar Comprovante (opcional — imagem ou PDF até 10MB)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setComprovanteFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#6B7A6F] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#E7F0E3] file:text-[#4C7A5A] hover:file:bg-[#DCE9D4]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingPayment}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {submittingPayment ? 'Enviando aviso...' : 'Informar Pagamento Realizado'}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* Histórico dos meus pagamentos */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#D9E2D4] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#D9E2D4]">
          <h3 className="font-serif italic text-xl font-bold text-[#26362B]">
            Histórico de Pagamentos Informados
          </h3>
          <button
            onClick={loadHistory}
            className="text-xs text-[#4C7A5A] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Atualizar</span>
          </button>
        </div>

        {paymentsHistory.length === 0 ? (
          <p className="text-xs text-[#6B7A6F] py-4 text-center italic">
            Nenhum pagamento registrado anteriormente.
          </p>
        ) : (
          <div className="space-y-3">
            {paymentsHistory.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-[#F6F4EF]/60 border border-[#D9E2D4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#26362B]">
                      {PLANS_CONFIG[p.plano]?.nome || p.plano}
                    </span>
                    <span className="text-[#6B7A6F]">
                      • R$ {p.valor.toFixed(2).replace('.', ',')}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'confirmado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'aguardando'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {p.status === 'aguardando' ? 'Aguardando verificação' : p.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#6B7A6F]">
                    Informado em: {formatarData(p.data_pagamento || p.created)}
                    {p.data_confirmacao
                      ? ` • Confirmado em: ${formatarData(p.data_confirmacao)}`
                      : ''}
                  </p>

                  {p.status === 'recusado' && p.notas_recusa && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl mt-1">
                      <strong>Motivo da recusa:</strong> {p.notas_recusa}
                    </p>
                  )}
                </div>

                {p.status === 'aguardando' && (
                  <span className="text-[11px] text-amber-700 font-medium">Em análise manual</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
