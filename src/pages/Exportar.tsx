import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import {
  getMedicamentos,
  getAlteracoesMedicamento,
  getConsultas,
  getExames,
  getMedicos,
  getDocumentos,
} from '@/services/healthService'
import { logAccessAudit } from '@/services/healthProfileService'
import {
  exportarResumoGeralPDF,
  exportarMedicamentosPDF,
  exportarHistoricoMedicamentosPDF,
  exportarConsultasPDF,
  exportarExamesPDF,
  exportarMedicosPDF,
  exportarDocumentosPDF,
  exportarDossieCompletoPDF,
  exportarMedicamentosCSV,
  exportarHistoricoMedicamentosCSV,
  exportarConsultasCSV,
  exportarExamesCSV,
  exportarMedicosCSV,
  type ExportDataPayload,
} from '@/services/exportService'
import type {
  Medicamento,
  AlteracaoMedicamento,
  Consulta,
  Exame,
  Medico,
  Documento,
} from '@/types/health'
import { toast } from '@/hooks/use-toast'
import {
  FileDown,
  FileText,
  FileSpreadsheet,
  Pill,
  History,
  CalendarCheck,
  FileSearch,
  UserCheck,
  FolderOpen,
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
  Download,
  AlertCircle,
  Clock,
  Printer,
  Layers,
} from 'lucide-react'
import { SeviSaudeIcon } from '@/components/SeviSaudeLogo'

export default function Exportar() {
  const { user } = useAuth()
  const { activeProfile, isOwner, permissions } = useHealthProfile()
  const { currentPlanKey, isCortesia, isExpired } = useSubscription()

  // Estados de dados carregados do titular ativo
  const [loading, setLoading] = useState(true)
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [alteracoesMedicamentos, setAlteracoesMedicamentos] = useState<AlteracaoMedicamento[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [exames, setExames] = useState<Exame[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])

  // Estado de exportação em andamento
  const [exportingKey, setExportingKey] = useState<string | null>(null)

  // Gate de plano:
  // Sevi Completo e Sevi Família têm PDF liberado. Cortesia também.
  // Sevi Essencial NÃO tem exportação em PDF.
  // Se a conta expirou, a exportação CONTINUA funcionando (regra de degradação graciosa do prompt).
  const hasPdfExportAccess =
    isCortesia || currentPlanKey === 'completo' || currentPlanKey === 'familia'

  // Carrega todos os dados do titular ativo conforme permissões
  useEffect(() => {
    async function loadData() {
      if (!activeProfile) return
      setLoading(true)
      try {
        const profId = activeProfile.id

        // Carregar medicamentos se tiver permissão
        let meds: Medicamento[] = []
        if (permissions.medicamentos_ver) {
          meds = await getMedicamentos(profId)
          setMedicamentos(meds)

          // Carregar alterações para todos os medicamentos
          const altPromises = meds.map((m) => getAlteracoesMedicamento(m.id))
          const altResults = await Promise.all(altPromises)
          const flatAlts = altResults.flat()
          setAlteracoesMedicamentos(flatAlts)
        } else {
          setMedicamentos([])
          setAlteracoesMedicamentos([])
        }

        // Consultas
        if (permissions.consultas_ver) {
          const cons = await getConsultas(profId)
          setConsultas(cons)
        } else {
          setConsultas([])
        }

        // Exames
        if (permissions.exames_ver) {
          const exs = await getExames(profId)
          setExames(exs)
        } else {
          setExames([])
        }

        // Médicos
        if (permissions.medicos_ver) {
          const medsList = await getMedicos(profId)
          setMedicos(medsList)
        } else {
          setMedicos([])
        }

        // Documentos
        if (permissions.documentos_ver) {
          const docs = await getDocumentos(profId)
          setDocumentos(docs)
        } else {
          setDocumentos([])
        }
      } catch (err) {
        console.error('Erro ao carregar dados para exportação:', err)
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os registros deste titular para exportação.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeProfile?.id, permissions])

  const buildPayload = (): ExportDataPayload => {
    return {
      profile: activeProfile!,
      medicamentos,
      alteracoesMedicamentos,
      consultas,
      exames,
      medicos,
      documentos,
      geradoPorNome: user?.name || user?.email || 'Usuário',
      alergias: activeProfile?.alergias || (activeProfile?.is_proprio ? user?.alergias : ''),
      condicoesSaude:
        activeProfile?.condicoes_saude || (activeProfile?.is_proprio ? user?.condicoes_saude : ''),
    }
  }

  // Wrapper unificado para executar exportação com registro em trilha de auditoria
  const handleExport = async (
    key: string,
    formato: 'PDF' | 'CSV',
    nomeRecurso: string,
    executorFn: () => void,
  ) => {
    if (!activeProfile) return
    setExportingKey(key)

    try {
      // Executa a geração do arquivo
      executorFn()

      // Registra na trilha de auditoria imutável (ação sensível)
      await logAccessAudit({
        target_profile: activeProfile.id,
        action: 'exportacao_dados',
        details: `Exportação de "${nomeRecurso}" em formato ${formato} realizada por ${user?.name || user?.email}.`,
        grantee_email: user?.email || '',
        metadata: {
          tipo: nomeRecurso,
          formato,
          titular_id: activeProfile.id,
          titular_nome: activeProfile.nome,
          data_hora: new Date().toISOString(),
        },
      })

      toast({
        title: 'Arquivo gerado com sucesso!',
        description: `O arquivo ${formato} de "${nomeRecurso}" foi baixado.`,
      })
    } catch (err: any) {
      console.error('Erro ao exportar:', err)
      const isTechnicalError =
        typeof err?.message === 'string' &&
        (err.message.includes('is not a function') ||
          err.message.includes('Cannot read property') ||
          err.message.includes('Cannot read properties') ||
          err.message.includes('undefined is not an object'))

      const userMessage = isTechnicalError
        ? 'Não foi possível gerar o PDF. Tente novamente.'
        : err?.message || 'Não foi possível gerar o PDF. Tente novamente.'

      toast({
        title: 'Falha na exportação',
        description: userMessage,
        variant: 'destructive',
      })
    } finally {
      setExportingKey(null)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header com Context Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4C7A5A] mb-1">
            <FileDown className="w-3.5 h-3.5" />
            <span>Exportação e Prontuário Pessoal</span>
          </div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Exportar histórico de saúde
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Gere relatórios completos em PDF para consultas médicas ou planilhas CSV para seu
            controle
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProfileContextBadge />
        </div>
      </div>

      {/* Banner de Gate de Plano (Sevi Essencial) */}
      {!hasPdfExportAccess && (
        <div className="bg-gradient-to-r from-amber-500/15 via-[#E7F0E3] to-[#DCE9D4] border-2 border-amber-500/40 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-6 h-6 text-amber-700" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white px-2 py-0.5 rounded-full">
                  Recurso Sevi Completo e Família
                </span>
                <span className="text-xs text-[#6B7A6F]">Plano atual: Sevi Essencial</span>
              </div>
              <h3 className="font-serif italic text-xl font-bold text-[#26362B]">
                A exportação em PDF está incluída a partir do Sevi Completo
              </h3>
              <p className="text-xs text-[#26362B]/80 max-w-2xl leading-relaxed">
                No plano <strong>Sevi Essencial</strong>, você pode exportar seus dados em formato{' '}
                <strong>CSV</strong> (planilhas). Para gerar relatórios diagramados em{' '}
                <strong>PDF</strong> com a identidade do SeviSaúde, histórico de medicamentos e
                registros pós-consulta estruturados, faça upgrade para o Sevi Completo.
              </p>
            </div>
          </div>

          <Link
            to="/planos"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#385942] text-white text-xs font-bold shadow-md hover:shadow-lg transition shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#DCE9D4]" />
            <span>Fazer Upgrade para Completo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Banner informativo de degradação graciosa */}
      {isExpired && (
        <div className="bg-[#E7F0E3] border border-[#D9E2D4] rounded-2xl p-4 flex items-center gap-3 text-xs text-[#26362B]">
          <ShieldCheck className="w-5 h-5 text-[#4C7A5A] shrink-0" />
          <span>
            <strong>Seus dados continuam 100% acessíveis e exportáveis:</strong> Mesmo com a
            assinatura expirada, você pode baixar todas as suas informações clínicas a qualquer
            momento sem restrições.
          </span>
        </div>
      )}

      {/* Bloco de Destaque: Dossiê Completo de Saúde */}
      <div className="bg-gradient-to-br from-[#26362B] via-[#2F4435] to-[#1B4332] text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <SeviSaudeIcon size={240} variant="light" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#DCE9D4] text-[11px] font-semibold border border-white/15">
              <Layers className="w-3.5 h-3.5" />
              <span>Dossiê Unificado de Saúde</span>
            </div>
            <h2 className="font-serif italic text-2xl md:text-3xl font-bold tracking-tight text-white">
              Dossiê Geral de Saúde ({activeProfile?.nome})
            </h2>
            <p className="text-xs md:text-sm text-[#DCE9D4] leading-relaxed">
              Documento completo reunindo visão clínica, lista de medicamentos em uso, próximas
              consultas, exames pendentes, contatos de emergência e alergias em um único PDF
              diagramado para levar a consultas ou guardar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {hasPdfExportAccess ? (
              <button
                type="button"
                disabled={loading || exportingKey === 'dossie-pdf'}
                onClick={() =>
                  handleExport('dossie-pdf', 'PDF', 'Dossiê Completo de Saúde', () =>
                    exportarDossieCompletoPDF(buildPayload()),
                  )
                }
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#40916C] hover:bg-[#52B788] text-white text-xs font-bold shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {exportingKey === 'dossie-pdf' ? 'Gerando Dossiê...' : 'Baixar Dossiê em PDF'}
                </span>
              </button>
            ) : (
              <Link
                to="/planos"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition border border-white/30"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Liberado no Plano Completo</span>
              </Link>
            )}

            <button
              type="button"
              disabled={loading || exportingKey === 'resumo-pdf'}
              onClick={() =>
                handleExport('resumo-pdf', 'PDF', 'Resumo Geral de Saúde', () => {
                  if (hasPdfExportAccess) {
                    exportarResumoGeralPDF(buildPayload())
                  } else {
                    toast({
                      title: 'Recurso exclusivo do Sevi Completo',
                      description: 'Faça upgrade do plano para exportar o Resumo Geral em PDF.',
                      variant: 'destructive',
                    })
                  }
                })
              }
              className={`inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-xs font-bold transition border ${
                hasPdfExportAccess
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 cursor-pointer'
                  : 'bg-white/5 text-white/50 border-white/10 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Resumo Executivo (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Seções de Exportação Específicas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
              Exportações por Módulo do Prontuário
            </h2>
            <p className="text-xs text-[#6B7A6F]">
              Selecione o módulo desejado e escolha entre PDF (leitura) ou CSV (dados tabulares)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Medicamentos Atuais */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#4C7A5A]/50 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F6F4EF] text-[#26362B]">
                  {medicamentos.length} cadastrados
                </span>
              </div>
              <h3 className="font-serif italic text-lg font-bold text-[#26362B]">
                Medicamentos em Uso
              </h3>
              <p className="text-xs text-[#6B7A6F] leading-relaxed">
                Lista completa com princípios ativos, dosagens, horários de tomada, via de
                administração, períodos e médico prescritor.
              </p>
            </div>

            <div className="pt-3 border-t border-[#D9E2D4] space-y-2">
              {/* Botão PDF */}
              <button
                type="button"
                disabled={loading || !permissions.medicamentos_ver || exportingKey === 'meds-pdf'}
                onClick={() => {
                  if (!hasPdfExportAccess) {
                    toast({
                      title: 'Disponível no Sevi Completo',
                      description: 'O download em PDF está liberado a partir do plano Completo.',
                    })
                    return
                  }
                  handleExport('meds-pdf', 'PDF', 'Medicamentos', () =>
                    exportarMedicamentosPDF(buildPayload()),
                  )
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition border ${
                  hasPdfExportAccess
                    ? 'bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] border-[#D9E2D4] cursor-pointer'
                    : 'bg-gray-100 text-[#6B7A6F] border-gray-200 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4C7A5A]" />
                  <span>Exportar em PDF</span>
                </div>
                {!hasPdfExportAccess ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#4C7A5A]" />
                )}
              </button>

              {/* Botão CSV */}
              <button
                type="button"
                disabled={loading || !permissions.medicamentos_ver || exportingKey === 'meds-csv'}
                onClick={() =>
                  handleExport('meds-csv', 'CSV', 'Medicamentos', () =>
                    exportarMedicamentosCSV(buildPayload()),
                  )
                }
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-medium text-[#26362B] hover:bg-[#F6F4EF] border border-[#D9E2D4] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Planilha CSV</span>
                </div>
                <Download className="w-3.5 h-3.5 text-[#6B7A6F]" />
              </button>
            </div>
          </div>

          {/* Card 2: Histórico de Alterações de Medicamentos */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#4C7A5A]/50 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F6F4EF] text-[#26362B]">
                  {alteracoesMedicamentos.length} alterações
                </span>
              </div>
              <h3 className="font-serif italic text-lg font-bold text-[#26362B]">
                Histórico de Alterações
              </h3>
              <p className="text-xs text-[#6B7A6F] leading-relaxed">
                Trilha imutável de ajustes: campo alterado, valor anterior, novo valor,
                justificativa clínica, data/hora e responsável.
              </p>
            </div>

            <div className="pt-3 border-t border-[#D9E2D4] space-y-2">
              <button
                type="button"
                disabled={
                  loading || !permissions.medicamentos_ver || exportingKey === 'hist-meds-pdf'
                }
                onClick={() => {
                  if (!hasPdfExportAccess) {
                    toast({
                      title: 'Disponível no Sevi Completo',
                      description: 'A exportação em PDF está incluída a partir do Sevi Completo.',
                    })
                    return
                  }
                  handleExport('hist-meds-pdf', 'PDF', 'Histórico de Medicamentos', () =>
                    exportarHistoricoMedicamentosPDF(buildPayload()),
                  )
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition border ${
                  hasPdfExportAccess
                    ? 'bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] border-[#D9E2D4] cursor-pointer'
                    : 'bg-gray-100 text-[#6B7A6F] border-gray-200 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4C7A5A]" />
                  <span>Exportar em PDF</span>
                </div>
                {!hasPdfExportAccess ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#4C7A5A]" />
                )}
              </button>

              <button
                type="button"
                disabled={
                  loading || !permissions.medicamentos_ver || exportingKey === 'hist-meds-csv'
                }
                onClick={() =>
                  handleExport('hist-meds-csv', 'CSV', 'Histórico de Medicamentos', () =>
                    exportarHistoricoMedicamentosCSV(buildPayload()),
                  )
                }
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-medium text-[#26362B] hover:bg-[#F6F4EF] border border-[#D9E2D4] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Planilha CSV</span>
                </div>
                <Download className="w-3.5 h-3.5 text-[#6B7A6F]" />
              </button>
            </div>
          </div>

          {/* Card 3: Consultas e Pós-Consulta */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#4C7A5A]/50 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F6F4EF] text-[#26362B]">
                  {consultas.length} consultas
                </span>
              </div>
              <h3 className="font-serif italic text-lg font-bold text-[#26362B]">
                Consultas e Pós-Consulta
              </h3>
              <p className="text-xs text-[#6B7A6F] leading-relaxed">
                Histórico de atendimentos com motivo, sintomas, resumo de orientações, exames
                solicitados, conduta e retorno previsto.
              </p>
            </div>

            <div className="pt-3 border-t border-[#D9E2D4] space-y-2">
              <button
                type="button"
                disabled={loading || !permissions.consultas_ver || exportingKey === 'cons-pdf'}
                onClick={() => {
                  if (!hasPdfExportAccess) {
                    toast({
                      title: 'Disponível no Sevi Completo',
                      description: 'A exportação em PDF está incluída a partir do Sevi Completo.',
                    })
                    return
                  }
                  handleExport('cons-pdf', 'PDF', 'Consultas Médicas', () =>
                    exportarConsultasPDF(buildPayload()),
                  )
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition border ${
                  hasPdfExportAccess
                    ? 'bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] border-[#D9E2D4] cursor-pointer'
                    : 'bg-gray-100 text-[#6B7A6F] border-gray-200 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4C7A5A]" />
                  <span>Exportar em PDF</span>
                </div>
                {!hasPdfExportAccess ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#4C7A5A]" />
                )}
              </button>

              <button
                type="button"
                disabled={loading || !permissions.consultas_ver || exportingKey === 'cons-csv'}
                onClick={() =>
                  handleExport('cons-csv', 'CSV', 'Consultas Médicas', () =>
                    exportarConsultasCSV(buildPayload()),
                  )
                }
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-medium text-[#26362B] hover:bg-[#F6F4EF] border border-[#D9E2D4] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Planilha CSV</span>
                </div>
                <Download className="w-3.5 h-3.5 text-[#6B7A6F]" />
              </button>
            </div>
          </div>

          {/* Card 4: Exames (5 Estados) */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#4C7A5A]/50 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
                  <FileSearch className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F6F4EF] text-[#26362B]">
                  {exames.length} exames
                </span>
              </div>
              <h3 className="font-serif italic text-lg font-bold text-[#26362B]">
                Exames e 5 Estados
              </h3>
              <p className="text-xs text-[#6B7A6F] leading-relaxed">
                Acompanhamento nos 5 estados: Pendente, Agendado, Realizado, Finalizado e Cancelado,
                com preparo e laboratórios.
              </p>
            </div>

            <div className="pt-3 border-t border-[#D9E2D4] space-y-2">
              <button
                type="button"
                disabled={loading || !permissions.exames_ver || exportingKey === 'exames-pdf'}
                onClick={() => {
                  if (!hasPdfExportAccess) {
                    toast({
                      title: 'Disponível no Sevi Completo',
                      description: 'A exportação em PDF está incluída a partir do Sevi Completo.',
                    })
                    return
                  }
                  handleExport('exames-pdf', 'PDF', 'Exames de Saúde', () =>
                    exportarExamesPDF(buildPayload()),
                  )
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition border ${
                  hasPdfExportAccess
                    ? 'bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] border-[#D9E2D4] cursor-pointer'
                    : 'bg-gray-100 text-[#6B7A6F] border-gray-200 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4C7A5A]" />
                  <span>Exportar em PDF</span>
                </div>
                {!hasPdfExportAccess ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#4C7A5A]" />
                )}
              </button>

              <button
                type="button"
                disabled={loading || !permissions.exames_ver || exportingKey === 'exames-csv'}
                onClick={() =>
                  handleExport('exames-csv', 'CSV', 'Exames de Saúde', () =>
                    exportarExamesCSV(buildPayload()),
                  )
                }
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-medium text-[#26362B] hover:bg-[#F6F4EF] border border-[#D9E2D4] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Planilha CSV</span>
                </div>
                <Download className="w-3.5 h-3.5 text-[#6B7A6F]" />
              </button>
            </div>
          </div>

          {/* Card 5: Médicos e Profissionais */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#4C7A5A]/50 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F6F4EF] text-[#26362B]">
                  {medicos.length} profissionais
                </span>
              </div>
              <h3 className="font-serif italic text-lg font-bold text-[#26362B]">
                Médicos e Profissionais
              </h3>
              <p className="text-xs text-[#6B7A6F] leading-relaxed">
                Agenda de contatos da equipe de saúde: especialidades, CRM/CRN, telefones, e-mails e
                locais de atendimento.
              </p>
            </div>

            <div className="pt-3 border-t border-[#D9E2D4] space-y-2">
              <button
                type="button"
                disabled={loading || !permissions.medicos_ver || exportingKey === 'medicos-pdf'}
                onClick={() => {
                  if (!hasPdfExportAccess) {
                    toast({
                      title: 'Disponível no Sevi Completo',
                      description: 'A exportação em PDF está incluída a partir do Sevi Completo.',
                    })
                    return
                  }
                  handleExport('medicos-pdf', 'PDF', 'Profissionais de Saúde', () =>
                    exportarMedicosPDF(buildPayload()),
                  )
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition border ${
                  hasPdfExportAccess
                    ? 'bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] border-[#D9E2D4] cursor-pointer'
                    : 'bg-gray-100 text-[#6B7A6F] border-gray-200 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4C7A5A]" />
                  <span>Exportar em PDF</span>
                </div>
                {!hasPdfExportAccess ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#4C7A5A]" />
                )}
              </button>

              <button
                type="button"
                disabled={loading || !permissions.medicos_ver || exportingKey === 'medicos-csv'}
                onClick={() =>
                  handleExport('medicos-csv', 'CSV', 'Profissionais de Saúde', () =>
                    exportarMedicosCSV(buildPayload()),
                  )
                }
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs font-medium text-[#26362B] hover:bg-[#F6F4EF] border border-[#D9E2D4] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Planilha CSV</span>
                </div>
                <Download className="w-3.5 h-3.5 text-[#6B7A6F]" />
              </button>
            </div>
          </div>

          {/* Card 6: Documentos de Saúde (Inventário de Metadados) */}
          <div className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#4C7A5A]/50 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F6F4EF] text-[#26362B]">
                  {documentos.length} arquivos
                </span>
              </div>
              <h3 className="font-serif italic text-lg font-bold text-[#26362B]">
                Documentos de Saúde
              </h3>
              <p className="text-xs text-[#6B7A6F] leading-relaxed">
                Índice estruturado de receitas, pedidos, resultados de exames e laudos arquivados na
                sua pasta médica.
              </p>
            </div>

            <div className="pt-3 border-t border-[#D9E2D4] space-y-2">
              <button
                type="button"
                disabled={loading || !permissions.documentos_ver || exportingKey === 'docs-pdf'}
                onClick={() => {
                  if (!hasPdfExportAccess) {
                    toast({
                      title: 'Disponível no Sevi Completo',
                      description: 'A exportação em PDF está incluída a partir do Sevi Completo.',
                    })
                    return
                  }
                  handleExport('docs-pdf', 'PDF', 'Inventário de Documentos', () =>
                    exportarDocumentosPDF(buildPayload()),
                  )
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition border ${
                  hasPdfExportAccess
                    ? 'bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] border-[#D9E2D4] cursor-pointer'
                    : 'bg-gray-100 text-[#6B7A6F] border-gray-200 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4C7A5A]" />
                  <span>Exportar em PDF</span>
                </div>
                {!hasPdfExportAccess ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#4C7A5A]" />
                )}
              </button>

              <span className="block text-center text-[10px] text-[#6B7A6F] py-1">
                Gera o índice completo com metadados e vínculos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nota de Segurança, LGPD e Privacidade */}
      <div className="bg-[#F6F4EF] border border-[#D9E2D4] rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white text-[#4C7A5A] flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif italic text-base font-bold text-[#26362B]">
              Privacidade e Trilha de Auditoria
            </h4>
            <p className="text-xs text-[#6B7A6F]">
              Cada ação de exportação de dados clínicos é registrada com carimbo de data, hora e
              identificação do usuário responsável na trilha de auditoria do SeviSaúde.
            </p>
          </div>
        </div>

        <Link
          to="/perfil?tab=titulares"
          className="text-xs text-[#4C7A5A] hover:underline font-semibold shrink-0"
        >
          Ver histórico de auditoria &gt;
        </Link>
      </div>
    </div>
  )
}
