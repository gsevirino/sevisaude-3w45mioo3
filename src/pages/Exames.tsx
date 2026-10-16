import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getExames,
  createExame,
  updateExame,
  deleteExame,
  getMedicos,
  getConsultas,
  getFileUrl,
} from '@/services/healthService'
import type {
  Exame,
  Medico,
  Consulta,
  TipoExame,
  StatusExame,
  HistoricoStatusExame,
} from '@/types/health'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import { QuickCreateSelect } from '@/components/QuickCreateSelect'
import { QuickCreateMedicoModal } from '@/components/QuickCreateMedicoModal'
import { QuickCreateConsultaModal } from '@/components/QuickCreateConsultaModal'
import { QuickCreateExameModal } from '@/components/QuickCreateExameModal'
import {
  TestTube,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Loader2,
  CalendarClock,
  Sparkles,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  formatarData,
  formatarHora,
  formatarDataHora,
  formatarTimestampLocal,
  extrairDataIso,
  extrairHora,
  montarDataHoraAgendada,
  desmembrarDataHoraAgendada,
} from '@/lib/dateUtils'

const TIPOS: TipoExame[] = [
  'Sangue',
  'Imagem',
  'Urina',
  'Fezes',
  'Cardíaco',
  'Preventivo',
  'Endoscopia/Biópsia',
  'Genético',
  'Outro',
]

const STATUS_LIST: StatusExame[] = ['Pendente', 'Agendado', 'Realizado', 'Finalizado', 'Cancelado']

export default function Exames() {
  const { user } = useAuth()
  const { activeProfile, permissions, isOwner } = useHealthProfile()
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const { isReadOnly } = useSubscription()
  const [exames, setExames] = useState<Exame[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)

  useRealtime('exames', () => triggerRefresh())

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusExame | 'Todos'>('Todos')
  const [medicoFilter, setMedicoFilter] = useState('Todos')
  const [localFilter, setLocalFilter] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')

  // Expand History of status per exam
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})

  // Form Modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingExame, setEditingExame] = useState<Exame | null>(null)
  const [saving, setSaving] = useState(false)
  const [quickMedicoModalOpen, setQuickMedicoModalOpen] = useState(false)
  const [quickConsultaModalOpen, setQuickConsultaModalOpen] = useState(false)

  // Fields
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoExame>('Sangue')
  const [categoria, setCategoria] = useState('')
  const [medicoId, setMedicoId] = useState('')
  const [consultaRelacionadaId, setConsultaRelacionadaId] = useState('')
  const [dataSolicitado, setDataSolicitado] = useState('')
  const [dataValidade, setDataValidade] = useState('')
  const [localRealizacao, setLocalRealizacao] = useState('')
  const [dataAgendada, setDataAgendada] = useState('')
  const [horarioAgendado, setHorarioAgendado] = useState('')
  const [instrucoesPreparo, setInstrucoesPreparo] = useState('')
  const [dataRealizado, setDataRealizado] = useState('')
  const [dataDisponibilizacaoResultado, setDataDisponibilizacaoResultado] = useState('')
  const [status, setStatus] = useState<StatusExame>('Pendente')
  const [numeroAutorizacao, setNumeroAutorizacao] = useState('')
  const [validadeAutorizacao, setValidadeAutorizacao] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Files
  const [pedidosFiles, setPedidosFiles] = useState<File[]>([])
  const [resultadosFiles, setResultadosFiles] = useState<File[]>([])

  // Status Change / Reagendar Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [selectedExameForStatus, setSelectedExameForStatus] = useState<Exame | null>(null)
  const [targetStatus, setTargetStatus] = useState<StatusExame>('Agendado')
  const [statusObservation, setStatusObservation] = useState('')
  const [newAgendamentoData, setNewAgendamentoData] = useState('')
  const [newAgendamentoHora, setNewAgendamentoHora] = useState('')
  const [newLocal, setNewLocal] = useState('')
  const [newResultFile, setNewResultFile] = useState<File | null>(null)

  // Quick Create Exame Modal
  const [quickExameModalOpen, setQuickExameModalOpen] = useState(false)

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [exameToDelete, setExameToDelete] = useState<Exame | null>(null)

  const loadData = useCallback(async () => {
    const profId = activeProfile?.id
    try {
      const [exs, docs, cons] = await Promise.all([
        getExames(profId),
        getMedicos(profId),
        getConsultas(profId),
      ])
      setExames(exs)
      setMedicos(docs)
      setConsultas(cons)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar exames',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [activeProfile?.id])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const openNewForm = () => {
    setEditingExame(null)
    setNome('')
    setTipo('Sangue')
    setCategoria('')
    setMedicoId(medicos[0]?.id || '')
    setConsultaRelacionadaId('')
    const today = extrairDataIso(new Date().toISOString())
    setDataSolicitado(today)
    setDataValidade('')
    setLocalRealizacao('')
    setDataAgendada('')
    setHorarioAgendado('')
    setInstrucoesPreparo('')
    setDataRealizado('')
    setDataDisponibilizacaoResultado('')
    setStatus('Pendente')
    setNumeroAutorizacao('')
    setValidadeAutorizacao('')
    setObservacoes('')
    setPedidosFiles([])
    setResultadosFiles([])
    setFormOpen(true)
  }

  const openEditForm = (ex: Exame) => {
    setEditingExame(ex)
    setNome(ex.nome)
    setTipo(ex.tipo)
    setCategoria(ex.categoria || '')
    setMedicoId(ex.medico || '')
    setConsultaRelacionadaId(ex.consulta_relacionada || '')
    setDataSolicitado(extrairDataIso(ex.data_solicitado))
    setDataValidade(extrairDataIso(ex.data_validade))
    setLocalRealizacao(ex.local_realizacao || '')

    const parsedAgendamento = desmembrarDataHoraAgendada(ex.data_hora_agendada)
    setDataAgendada(parsedAgendamento.data)
    setHorarioAgendado(parsedAgendamento.hora)

    setInstrucoesPreparo(ex.instrucoes_preparo || '')
    setDataRealizado(extrairDataIso(ex.data_realizado))
    setDataDisponibilizacaoResultado(extrairDataIso(ex.data_disponibilizacao_resultado))
    setStatus(ex.status)
    setNumeroAutorizacao(ex.numero_autorizacao || '')
    setValidadeAutorizacao(extrairDataIso(ex.validade_autorizacao))
    setObservacoes(ex.observacoes || '')
    setPedidosFiles([])
    setResultadosFiles([])
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !medicoId || !dataSolicitado) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome do exame, médico e data de solicitação são necessários.',
        variant: 'destructive',
      })
      return
    }

    if (isReadOnly) {
      toast({
        title: 'Assinatura expirada',
        description: 'Renove seu plano no menu Meu Plano para cadastrar novos exames.',
        variant: 'destructive',
      })
      return
    }

    // Regra: NÃO marcar como Finalizado sem resultado anexado
    const existingResults = editingExame?.resultados_arquivos || []
    if (status === 'Finalizado' && existingResults.length === 0 && resultadosFiles.length === 0) {
      toast({
        title: 'Resultado obrigatório para finalizar',
        description:
          'Um exame só pode ser Finalizado quando o laudo/resultado for recebido e anexado. Se aguarda laudo, marque como "Realizado".',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('nome', nome.trim())
      formData.append('tipo', tipo)
      if (categoria.trim()) formData.append('categoria', categoria.trim())
      formData.append('medico', medicoId)
      if (consultaRelacionadaId) formData.append('consulta_relacionada', consultaRelacionadaId)
      formData.append('data_solicitado', dataSolicitado)
      if (dataValidade) formData.append('data_validade', dataValidade)
      if (localRealizacao.trim()) formData.append('local_realizacao', localRealizacao.trim())

      const agendamentoFinal = montarDataHoraAgendada(dataAgendada, horarioAgendado)
      formData.append('data_hora_agendada', agendamentoFinal)

      if (instrucoesPreparo.trim()) formData.append('instrucoes_preparo', instrucoesPreparo.trim())
      if (dataRealizado) formData.append('data_realizado', dataRealizado)
      if (dataDisponibilizacaoResultado) {
        formData.append('data_disponibilizacao_resultado', dataDisponibilizacaoResultado)
      }
      if (numeroAutorizacao.trim()) formData.append('numero_autorizacao', numeroAutorizacao.trim())
      if (validadeAutorizacao) formData.append('validade_autorizacao', validadeAutorizacao)
      formData.append('status', status)
      if (observacoes.trim()) formData.append('observacoes', observacoes.trim())

      // Append multi files
      pedidosFiles.forEach((file) => formData.append('pedidos_arquivos', file))
      resultadosFiles.forEach((file) => formData.append('resultados_arquivos', file))

      if (editingExame) {
        // Atualiza histórico se mudou de status
        let historico: HistoricoStatusExame[] = Array.isArray(editingExame.historico_status)
          ? [...editingExame.historico_status]
          : []
        if (editingExame.status !== status) {
          historico.push({
            status,
            data: new Date().toISOString(),
            observacao: 'Atualização cadastral do exame',
          })
          formData.append('historico_status', JSON.stringify(historico))
        }

        await updateExame(editingExame.id, formData)
        toast({
          title: 'Exame atualizado!',
          description: 'Todas as informações e arquivos foram salvos.',
        })
      } else {
        const historicoInicial: HistoricoStatusExame[] = [
          {
            status,
            data: new Date().toISOString(),
            observacao: 'Exame cadastrado no prontuário',
          },
        ]
        formData.append('historico_status', JSON.stringify(historicoInicial))

        await createExame(formData, activeProfile?.id)
        toast({
          title: 'Exame registrado!',
          description: `${nome} foi adicionado ao prontuário de ${activeProfile?.nome || 'Titular'}.`,
        })
      }
      setFormOpen(false)
      triggerRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Quick Action Modal: Alterar status / Reagendar / Anexar Resultado
  const openStatusModal = (ex: Exame, nextSt?: StatusExame) => {
    setSelectedExameForStatus(ex)
    setTargetStatus(nextSt || ex.status)
    setStatusObservation('')
    const parsedAgendamento = desmembrarDataHoraAgendada(ex.data_hora_agendada)
    setNewAgendamentoData(parsedAgendamento.data)
    setNewAgendamentoHora(parsedAgendamento.hora)
    setNewLocal(ex.local_realizacao || '')
    setNewResultFile(null)
    setStatusModalOpen(true)
  }

  const handleConfirmStatusChange = async () => {
    if (!selectedExameForStatus) return

    // Validação estrita: Não marcar como Finalizado sem resultado anexado
    const hasExistingResult = (selectedExameForStatus.resultados_arquivos || []).length > 0
    if (targetStatus === 'Finalizado' && !hasExistingResult && !newResultFile) {
      toast({
        title: 'Resultado obrigatório',
        description:
          'Para finalizar o exame, anexe o laudo/resultado recebido. Apenas realizar o exame sem laudo corresponde ao estado "Realizado".',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('status', targetStatus)

      const agendamentoAtualizado = montarDataHoraAgendada(newAgendamentoData, newAgendamentoHora)
      if (agendamentoAtualizado) {
        formData.append('data_hora_agendada', agendamentoAtualizado)
      } else if (newAgendamentoData === '' && targetStatus === 'Agendado') {
        // Se usuário limpou os campos ao reagendar
        formData.append('data_hora_agendada', '')
      }
      if (newLocal.trim()) {
        formData.append('local_realizacao', newLocal.trim())
      }

      if (targetStatus === 'Realizado' && !selectedExameForStatus.data_realizado) {
        formData.append('data_realizado', extrairDataIso(new Date().toISOString()))
      }

      if (newResultFile) {
        formData.append('resultados_arquivos', newResultFile)
      }

      // Preserva histórico
      const currentHist: HistoricoStatusExame[] = Array.isArray(
        selectedExameForStatus.historico_status,
      )
        ? [...selectedExameForStatus.historico_status]
        : []

      currentHist.push({
        status: targetStatus,
        data: new Date().toISOString(),
        observacao: statusObservation.trim() || `Transição para ${targetStatus}`,
      })

      formData.append('historico_status', JSON.stringify(currentHist))

      await updateExame(selectedExameForStatus.id, formData)
      toast({
        title: 'Status atualizado!',
        description: `${selectedExameForStatus.nome} agora está ${targetStatus}.`,
      })
      setStatusModalOpen(false)
      triggerRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const promptDelete = (ex: Exame) => {
    setExameToDelete(ex)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!exameToDelete) return
    setSaving(true)
    try {
      await deleteExame(exameToDelete.id)
      toast({
        title: 'Exame excluído',
        description: 'Exame removido com sucesso.',
      })
      setDeleteModalOpen(false)
      triggerRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleHistory = (id: string) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (iso?: string) => formatarData(iso)
  const formatDateTime = (iso?: string) => formatarTimestampLocal(iso)

  // Obter listas únicas para os filtros
  const locaisUnicos = Array.from(
    new Set(exames.map((e) => e.local_realizacao).filter(Boolean)),
  ) as string[]
  const medicosUnicos = Array.from(
    new Set(exames.map((e) => e.expand?.medico?.nome).filter(Boolean)),
  ) as string[]

  // Filtros aplicados
  const filteredExames = exames.filter((ex) => {
    const matchesStatus = statusFilter === 'Todos' || ex.status === statusFilter
    const matchesMed = medicoFilter === 'Todos' || ex.expand?.medico?.nome === medicoFilter
    const matchesLoc = localFilter === 'Todos' || ex.local_realizacao === localFilter

    const q = searchQuery.toLowerCase().trim()
    if (!q) return matchesStatus && matchesMed && matchesLoc

    const matchNome = ex.nome?.toLowerCase().includes(q)
    const matchTipo = ex.tipo?.toLowerCase().includes(q)
    const matchCat = ex.categoria?.toLowerCase().includes(q)
    const matchDoc = ex.expand?.medico?.nome?.toLowerCase().includes(q)
    const matchLocal = ex.local_realizacao?.toLowerCase().includes(q)
    const matchPrep = ex.instrucoes_preparo?.toLowerCase().includes(q)

    return (
      matchesStatus &&
      matchesMed &&
      matchesLoc &&
      (matchNome || matchTipo || matchCat || matchDoc || matchLocal || matchPrep)
    )
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Exames
          </h1>
        </div>

        {permissions.exames_editar && !isReadOnly ? (
          <button
            onClick={openNewForm}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Novo exame</span>
          </button>
        ) : (
          <span className="text-xs text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-full font-medium">
            {isReadOnly ? 'Plano Expirado — Somente Leitura' : 'Modo Somente Leitura'}
          </span>
        )}
      </div>

      <ProfileContextBadge actionLabel="Exames e laudos de" />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#D9E2D4] shadow-sm space-y-4">
        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-[#26362B] uppercase tracking-wider mr-2">
            Status:
          </span>
          {(['Todos', ...STATUS_LIST] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#4C7A5A] text-white shadow-xs'
                  : 'bg-[#F6F4EF] text-[#6B7A6F] hover:bg-[#E7F0E3] hover:text-[#26362B]'
              }`}
            >
              {st}
              {st !== 'Todos' && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                  {exames.filter((e) => e.status === st).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Secondary filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#D9E2D4]/50">
          {/* Médico */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7A6F] mb-1">Médico</label>
            <select
              value={medicoFilter}
              onChange={(e) => setMedicoFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs text-[#26362B]"
            >
              <option value="Todos">Todos os médicos</option>
              {medicosUnicos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Local */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7A6F] mb-1">Local</label>
            <select
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs text-[#26362B]"
            >
              <option value="Todos">Todos os locais</option>
              {locaisUnicos.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7A6F] mb-1">
              Busca textual
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6B7A6F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Exame, preparo..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs text-[#26362B]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Exames List */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
          <p className="text-sm font-serif italic text-[#26362B]">Carregando exames...</p>
        </div>
      ) : filteredExames.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#D9E2D4] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center mx-auto mb-4">
            <TestTube className="w-8 h-8" />
          </div>
          <h3 className="font-serif italic text-xl text-[#26362B] font-medium">
            Nenhum exame encontrado
          </h3>
          <p className="text-xs text-[#6B7A6F] mt-2">
            {searchQuery ||
            statusFilter !== 'Todos' ||
            medicoFilter !== 'Todos' ||
            localFilter !== 'Todos'
              ? 'Tente relaxar os filtros aplicados.'
              : 'Cadastre os pedidos de exames médicos e acompanhe os preparos e laudos.'}
          </p>
          <button
            onClick={openNewForm}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-medium shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar primeiro exame</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExames.map((ex) => {
            const isHistoryOpen = !!expandedHistory[ex.id]
            const historyList: HistoricoStatusExame[] = Array.isArray(ex.historico_status)
              ? ex.historico_status
              : []

            const pedidos: string[] = Array.isArray(ex.pedidos_arquivos) ? ex.pedidos_arquivos : []
            const resultados: string[] = Array.isArray(ex.resultados_arquivos)
              ? ex.resultados_arquivos
              : []

            const isPendente = ex.status === 'Pendente'
            const isAgendado = ex.status === 'Agendado'
            const isRealizado = ex.status === 'Realizado'
            const isFinalizado = ex.status === 'Finalizado'
            const isCancelado = ex.status === 'Cancelado'

            return (
              <div
                key={ex.id}
                className={`bg-white rounded-3xl p-6 border transition-all duration-200 shadow-sm hover:shadow-md ${
                  isFinalizado
                    ? 'border-[#D9E2D4]'
                    : isRealizado
                      ? 'border-teal-300 bg-teal-50/20'
                      : isAgendado
                        ? 'border-blue-300 bg-blue-50/20'
                        : isPendente
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-gray-200 opacity-80'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isFinalizado
                          ? 'bg-[#E7F0E3] text-[#4C7A5A] border-[#DCE9D4]'
                          : isRealizado
                            ? 'bg-teal-100 text-teal-800 border-teal-200'
                            : isAgendado
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : isPendente
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <TestTube className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                          {ex.nome}
                        </h3>

                        {/* Status Badge */}
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider text-[11px] ${
                            isFinalizado
                              ? 'bg-[#DCE9D4] text-[#26362B] ring-1 ring-[#A8C3A0]'
                              : isRealizado
                                ? 'bg-teal-100 text-teal-900 ring-1 ring-teal-300'
                                : isAgendado
                                  ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-300'
                                  : isPendente
                                    ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                                    : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {ex.status}
                        </span>

                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F6F4EF] text-[#6B7A6F] border border-[#D9E2D4]">
                          {ex.tipo}
                        </span>

                        {ex.categoria && (
                          <span className="text-[11px] font-semibold text-[#4C7A5A] bg-[#E7F0E3] px-2.5 py-0.5 rounded-full">
                            {ex.categoria}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7A6F] mt-2.5">
                        <span>
                          Solicitado por: <strong>{ex.expand?.medico?.nome || 'Médico'}</strong>
                        </span>
                        <span>
                          Em: <strong>{formatDate(ex.data_solicitado)}</strong>
                        </span>
                        {ex.data_validade && (
                          <span className="text-amber-800 font-medium">
                            Validade do pedido: {formatDate(ex.data_validade)}
                          </span>
                        )}
                      </div>

                      {/* Autorização do Plano de Saúde */}
                      {ex.numero_autorizacao &&
                        (() => {
                          const validadeIso = extrairDataIso(ex.validade_autorizacao)
                          const hojeIso = extrairDataIso(new Date().toISOString())
                          const isVencida = !!validadeIso && validadeIso < hojeIso
                          return (
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E7F0E3] text-[#26362B] border border-[#DCE9D4]">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#4C7A5A]" />
                                <span>
                                  Autorização: <strong>{ex.numero_autorizacao}</strong>
                                  {validadeIso && <> · válida até {formatDate(validadeIso)}</>}
                                </span>
                              </span>
                              {isVencida && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                  <AlertCircle className="w-3 h-3 text-amber-700" />
                                  <span>Autorização vencida</span>
                                </span>
                              )}
                            </div>
                          )
                        })()}

                      {/* Agendamento e Local */}
                      {(ex.data_hora_agendada || ex.local_realizacao) && (
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#26362B] mt-2 bg-[#F6F4EF]/70 p-2.5 rounded-xl border border-[#D9E2D4]/60">
                          {ex.data_hora_agendada && (
                            <span className="flex items-center gap-1.5 font-semibold text-[#4C7A5A]">
                              <CalendarClock className="w-3.5 h-3.5" />
                              Agendado: {formatarDataHora(ex.data_hora_agendada)}
                            </span>
                          )}
                          {ex.local_realizacao && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#4C7A5A]" />
                              Local: <strong>{ex.local_realizacao}</strong>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Preparo */}
                      {ex.instrucoes_preparo && (
                        <div className="mt-2 text-xs bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60 text-amber-950 flex items-start gap-2">
                          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block text-[11px]">
                              Instruções de preparo:
                            </span>
                            <p className="italic">"{ex.instrucoes_preparo}"</p>
                          </div>
                        </div>
                      )}

                      {/* Datas de Realização e Resultado */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7A6F] mt-2">
                        {ex.data_realizado && (
                          <span>
                            Realizado em: <strong>{formatDate(ex.data_realizado)}</strong>
                          </span>
                        )}
                        {ex.data_disponibilizacao_resultado && (
                          <span className="text-[#4C7A5A] font-medium">
                            Resultado previsto/disponibilizado:{' '}
                            <strong>{formatDate(ex.data_disponibilizacao_resultado)}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-2 self-end md:self-start">
                    <button
                      onClick={() => openEditForm(ex)}
                      className="p-2 rounded-full hover:bg-[#E7F0E3] text-[#4C7A5A] transition cursor-pointer"
                      title="Editar exame"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => promptDelete(ex)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                      title="Excluir exame"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Arquivos anexados (Pedidos e Resultados) */}
                {(pedidos.length > 0 || resultados.length > 0) && (
                  <div className="mt-4 pt-3 border-t border-[#D9E2D4]/60 flex flex-wrap items-center gap-3 text-xs">
                    {pedidos.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-[#4C7A5A]" />
                        <span className="font-semibold text-[#26362B]">Pedidos médicos:</span>
                        {pedidos.map((f, i) => (
                          <a
                            key={i}
                            href={getFileUrl('exames', ex.id, f)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#4C7A5A] font-semibold hover:underline flex items-center gap-0.5 bg-[#E7F0E3] px-2 py-0.5 rounded-full"
                          >
                            <span>Pedido {i + 1}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}

                    {resultados.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span className="font-semibold text-[#26362B]">Laudos e resultados:</span>
                        {resultados.map((f, i) => (
                          <a
                            key={i}
                            href={getFileUrl('exames', ex.id, f)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-800 font-semibold hover:underline flex items-center gap-0.5 bg-teal-100 px-2 py-0.5 rounded-full"
                          >
                            <span>Laudo {i + 1}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Status Flow & Transitions */}
                <div className="mt-4 pt-3 border-t border-[#D9E2D4]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-semibold text-[#6B7A6F] uppercase mr-1">
                      Mudar estado:
                    </span>
                    {isPendente && (
                      <button
                        type="button"
                        onClick={() => openStatusModal(ex, 'Agendado')}
                        className="px-2.5 py-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-900 font-semibold transition cursor-pointer"
                      >
                        Agendar data/local
                      </button>
                    )}
                    {isAgendado && (
                      <>
                        <button
                          type="button"
                          onClick={() => openStatusModal(ex, 'Realizado')}
                          className="px-2.5 py-1 rounded-full bg-teal-100 hover:bg-teal-200 text-teal-900 font-semibold transition cursor-pointer"
                        >
                          Marcar como Realizado
                        </button>
                        <button
                          type="button"
                          onClick={() => openStatusModal(ex, 'Agendado')}
                          className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium transition cursor-pointer border border-blue-200"
                        >
                          Reagendar
                        </button>
                      </>
                    )}
                    {isRealizado && (
                      <button
                        type="button"
                        onClick={() => openStatusModal(ex, 'Finalizado')}
                        className="px-2.5 py-1 rounded-full bg-[#DCE9D4] hover:bg-[#A8C3A0] text-[#26362B] font-semibold transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Vincular Laudo e Finalizar
                      </button>
                    )}
                    {!isCancelado && !isFinalizado && (
                      <button
                        type="button"
                        onClick={() => openStatusModal(ex, 'Cancelado')}
                        className="px-2.5 py-1 rounded-full bg-red-100 hover:bg-red-200 text-red-800 font-medium transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {/* History of status toggle */}
                  <button
                    onClick={() => toggleHistory(ex.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C7A5A] hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Histórico de transições ({historyList.length})</span>
                    {isHistoryOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* History Drawer */}
                {isHistoryOpen && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-2 animate-fade-in text-xs">
                    <span className="font-semibold text-[#26362B] block text-[11px] uppercase tracking-wider">
                      Linha do tempo de estados deste exame
                    </span>
                    {historyList.length === 0 ? (
                      <p className="text-[#6B7A6F] italic">Nenhuma transição registrada.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {historyList.map((h, i) => (
                          <div
                            key={i}
                            className="bg-white p-2.5 rounded-xl border border-[#D9E2D4] flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-[#26362B]">{h.status}</span>
                              {h.observacao && (
                                <span className="text-[#6B7A6F] ml-2 italic">
                                  — "{h.observacao}"
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#4C7A5A] font-medium shrink-0">
                              {formatDateTime(h.data)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Main CRUD Modal Form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#D9E2D4] relative my-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setFormOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-gray-100 text-[#6B7A6F] hover:text-[#26362B] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
                <TestTube className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
                  {editingExame ? 'Editar exame' : 'Cadastrar exame'}
                </h2>
                <p className="text-xs text-[#6B7A6F]">
                  Gestão em 5 estados, múltiplos anexos e preparo obrigatório
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Nome do exame <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Hemograma completo, Ecocardiograma..."
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Tipo de exame
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoExame)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  >
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#26362B]">
                    Médico solicitante <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickMedicoModalOpen(true)}
                    className="text-[11px] font-semibold text-[#4C7A5A] hover:underline cursor-pointer"
                  >
                    + Cadastrar novo
                  </button>
                </div>
                <QuickCreateSelect
                  required
                  value={medicoId}
                  onChange={setMedicoId}
                  placeholder="Selecione o médico..."
                  quickCreateLabel="+ Cadastrar novo médico…"
                  quickCreateHint="Adicione o solicitante sem sair do formulário"
                  onQuickCreate={() => setQuickMedicoModalOpen(true)}
                  options={medicos.map((doc) => ({
                    value: doc.id,
                    label: doc.nome,
                    sublabel: doc.especialidade,
                  }))}
                />
              </div>

              {/* Consulta relacionada */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#26362B]">
                    Consulta relacionada (opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickConsultaModalOpen(true)}
                    className="text-[11px] font-semibold text-[#4C7A5A] hover:underline cursor-pointer"
                  >
                    + Nova consulta
                  </button>
                </div>
                <QuickCreateSelect
                  value={consultaRelacionadaId}
                  onChange={setConsultaRelacionadaId}
                  allowEmpty
                  emptyOptionLabel="Nenhuma consulta vinculada"
                  emptyValue=""
                  placeholder="Selecione uma consulta ou deixe em branco..."
                  quickCreateLabel="+ Cadastrar nova consulta…"
                  quickCreateHint="Vincule a consulta de origem deste exame"
                  onQuickCreate={() => setQuickConsultaModalOpen(true)}
                  options={consultas.map((c) => ({
                    value: c.id,
                    label: `${formatDate(c.data)} — ${c.expand?.medico?.nome || 'Médico'}`,
                    sublabel: c.motivo_atendimento || c.tipo,
                  }))}
                />
              </div>

              {/* Datas e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Data da solicitação <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataSolicitado}
                    onChange={(e) => setDataSolicitado(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Validade do pedido
                  </label>
                  <input
                    type="date"
                    value={dataValidade}
                    onChange={(e) => setDataValidade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Status do exame <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusExame)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
                  >
                    {STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Agendamento e Local */}
              <div className="p-4 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-3">
                <span className="text-xs font-semibold text-[#26362B] uppercase tracking-wider block">
                  Agendamento e Local de Coleta / Execução
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Data agendada
                    </label>
                    <input
                      type="date"
                      value={dataAgendada}
                      onChange={(e) => setDataAgendada(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A] min-h-[38px]"
                    />
                    <span className="text-[10px] text-[#6B7A6F] block mt-0.5">dd/mm/aaaa</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Horário agendado
                    </label>
                    <input
                      type="time"
                      value={horarioAgendado}
                      onChange={(e) => setHorarioAgendado(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A] min-h-[38px]"
                    />
                    <span className="text-[10px] text-[#6B7A6F] block mt-0.5">hh:mm</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Local de realização
                    </label>
                    <input
                      type="text"
                      value={localRealizacao}
                      onChange={(e) => setLocalRealizacao(e.target.value)}
                      placeholder="Ex.: Laboratório Fleury - Jardins"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Instruções de preparo do exame
                  </label>
                  <textarea
                    rows={2}
                    value={instrucoesPreparo}
                    onChange={(e) => setInstrucoesPreparo(e.target.value)}
                    placeholder="Ex.: Jejum absoluto de 12 horas; beber 4 copos de água 1h antes; não suspender medicamentos..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
              </div>

              {/* Seção: Autorização do Plano de Saúde */}
              <div className="p-4 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#4C7A5A]" />
                  <div>
                    <span className="text-xs font-semibold text-[#26362B] block uppercase tracking-wider">
                      Autorização do plano de saúde
                    </span>
                    <span className="text-[11px] text-[#6B7A6F]">
                      Preencha apenas se o procedimento exigir autorização
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Número da autorização (opcional)
                    </label>
                    <input
                      type="text"
                      value={numeroAutorizacao}
                      onChange={(e) => setNumeroAutorizacao(e.target.value)}
                      placeholder="Ex.: 9823410, AUT-2026-778"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Data de validade da autorização (opcional)
                    </label>
                    <input
                      type="date"
                      value={validadeAutorizacao}
                      onChange={(e) => setValidadeAutorizacao(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>
                </div>
              </div>

              {/* Datas de execução e laudo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Data em que foi realizado
                  </label>
                  <input
                    type="date"
                    value={dataRealizado}
                    onChange={(e) => setDataRealizado(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Data de disponibilização do resultado
                  </label>
                  <input
                    type="date"
                    value={dataDisponibilizacaoResultado}
                    onChange={(e) => setDataDisponibilizacaoResultado(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
                  />
                </div>
              </div>

              {/* Uploads Múltiplos: Pedidos e Resultados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#D9E2D4]">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Pedidos médicos anexados (múltiplos permitidos)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files) setPedidosFiles(Array.from(e.target.files))
                    }}
                    className="w-full text-xs text-[#6B7A6F] file:mr-2 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#4C7A5A] file:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Laudos e resultados anexados (múltiplos permitidos)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files) setResultadosFiles(Array.from(e.target.files))
                    }}
                    className="w-full text-xs text-[#6B7A6F] file:mr-2 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-700 file:text-white"
                  />
                  <span className="text-[10px] text-[#6B7A6F] block mt-0.5">
                    O status "Finalizado" exige laudo anexado.
                  </span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F] hover:bg-[#F6F4EF]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  {saving ? 'Gravando...' : editingExame ? 'Salvar alterações' : 'Cadastrar exame'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Modal (Reagendar, Anexar resultado, Registrar histórico) */}
      {statusModalOpen && selectedExameForStatus && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#D9E2D4] space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif italic text-lg text-[#26362B] font-semibold">
                  Mudar status: {targetStatus}
                </h3>
                <p className="text-xs text-[#6B7A6F]">{selectedExameForStatus.nome}</p>
              </div>
            </div>

            {targetStatus === 'Agendado' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Data agendada
                    </label>
                    <input
                      type="date"
                      value={newAgendamentoData}
                      onChange={(e) => setNewAgendamentoData(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A] min-h-[38px]"
                    />
                    <span className="text-[10px] text-[#6B7A6F] block mt-0.5">dd/mm/aaaa</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Horário agendado
                    </label>
                    <input
                      type="time"
                      value={newAgendamentoHora}
                      onChange={(e) => setNewAgendamentoHora(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A] min-h-[38px]"
                    />
                    <span className="text-[10px] text-[#6B7A6F] block mt-0.5">hh:mm</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Local / Laboratório
                  </label>
                  <input
                    type="text"
                    value={newLocal}
                    onChange={(e) => setNewLocal(e.target.value)}
                    placeholder="Ex.: Laboratório Fleury"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
              </div>
            )}

            {targetStatus === 'Finalizado' && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-teal-50 border border-teal-200">
                <div className="flex items-start gap-2 text-xs text-teal-900">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <span>
                    Para finalizar este exame, o resultado deve ser vinculado. Anexe o arquivo do
                    laudo abaixo:
                  </span>
                </div>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                  onChange={(e) => setNewResultFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#6B7A6F] file:mr-2 file:py-1 file:px-2.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-700 file:text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1">
                Observação para o histórico
              </label>
              <textarea
                rows={2}
                value={statusObservation}
                onChange={(e) => setStatusObservation(e.target.value)}
                placeholder="Ex.: Exame reagendado a pedido do paciente; coleta em jejum realizada..."
                className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F]"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmStatusChange}
                className="px-5 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? 'Gravando...' : 'Confirmar transição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Exame Modal */}
      <QuickCreateExameModal
        open={quickExameModalOpen}
        medicos={medicos}
        onClose={() => setQuickExameModalOpen(false)}
        onOpenNewMedico={() => {
          setQuickExameModalOpen(false)
          setQuickMedicoModalOpen(true)
        }}
        defaultMedicoId={medicoId}
        consultaId={consultaRelacionadaId}
        onSuccess={(novoExame) => {
          setExames((prev) => [novoExame, ...prev])
        }}
      />

      {/* Quick Create Médico Modal */}
      <QuickCreateMedicoModal
        open={quickMedicoModalOpen}
        onClose={() => setQuickMedicoModalOpen(false)}
        onSuccess={(novoMedico) => {
          setMedicos((prev) => {
            if (prev.some((m) => m.id === novoMedico.id)) return prev
            return [novoMedico, ...prev]
          })
          setMedicoId(novoMedico.id)
        }}
      />

      {/* Quick Create Consulta Modal */}
      <QuickCreateConsultaModal
        open={quickConsultaModalOpen}
        medicos={medicos}
        onClose={() => setQuickConsultaModalOpen(false)}
        onOpenNewMedico={() => {
          setQuickConsultaModalOpen(false)
          setQuickMedicoModalOpen(true)
        }}
        onSuccess={(novaConsulta) => {
          setConsultas((prev) => {
            if (prev.some((c) => c.id === novaConsulta.id)) return prev
            return [novaConsulta, ...prev]
          })
          setConsultaRelacionadaId(novaConsulta.id)
          // Se o exame ainda não tiver médico preenchido, preenche com o médico da consulta
          if (!medicoId && novaConsulta.medico) {
            setMedicoId(novaConsulta.medico)
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && exameToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D9E2D4] text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Excluir exame?
              </h3>
              <p className="text-xs text-[#6B7A6F] mt-1">
                Remover <strong>{exameToDelete.nome}</strong> apagará o pedido e o histórico. Se o
                exame foi cancelado, prefira mudar o status para <strong>Cancelado</strong> para
                preservar a auditoria.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F] hover:bg-[#F6F4EF]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {saving ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
