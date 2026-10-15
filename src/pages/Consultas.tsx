import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getConsultas,
  createConsulta,
  updateConsulta,
  deleteConsulta,
  getMedicos,
  getMedicamentos,
  getExames,
  getFileUrl,
} from '@/services/healthService'
import type {
  Consulta,
  Medico,
  StatusConsulta,
  TipoConsulta,
  Medicamento,
  Exame,
} from '@/types/health'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  CalendarCheck,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Paperclip,
  ExternalLink,
  UserCheck,
  Link as LinkIcon,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatarData, formatarHora, extrairDataIso } from '@/lib/dateUtils'

const STATUS_FILTERS: (StatusConsulta | 'Todas')[] = ['Todas', 'Agendada', 'Realizada', 'Cancelada']
const TIPOS: TipoConsulta[] = ['Presencial', 'Teleconsulta', 'Domiciliar']

export default function Consultas() {
  const { user } = useAuth()
  const { activeProfile, permissions, isOwner } = useHealthProfile()
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const { isReadOnly } = useSubscription()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [exames, setExames] = useState<Exame[]>([])
  const [loading, setLoading] = useState(true)

  useRealtime('consultas', () => triggerRefresh())

  // Search & Filter
  const [selectedStatus, setSelectedStatus] = useState<StatusConsulta | 'Todas'>('Todas')
  const [searchQuery, setSearchQuery] = useState('')

  // Expand notes & structured details
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({})

  // Form Modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingConsulta, setEditingConsulta] = useState<Consulta | null>(null)
  const [saving, setSaving] = useState(false)

  // Basic Fields
  const [medicoId, setMedicoId] = useState('')
  const [data, setData] = useState('')
  const [horario, setHorario] = useState('09:30')
  const [tipo, setTipo] = useState<TipoConsulta>('Presencial')
  const [local, setLocal] = useState('')
  const [status, setStatus] = useState<StatusConsulta>('Agendada')
  const [anotacoes, setAnotacoes] = useState('')

  // Structured Post-Consultation Fields
  const [motivoAtendimento, setMotivoAtendimento] = useState('')
  const [sintomasRelatados, setSintomasRelatados] = useState('')
  const [perguntasPreparadas, setPergunasPreparadas] = useState('')
  const [assuntosTratados, setAssuntosTratados] = useState('')
  const [resumoOrientacoes, setResumoOrientacoes] = useState('')
  const [alteracoesMedicamentos, setAlteracoesMedicamentos] = useState('')
  const [examesSolicitados, setExamesSolicitados] = useState('')
  const [encaminhamentos, setEncaminhamentos] = useState('')
  const [proximosPassos, setProximosPassos] = useState('')
  const [dataPrevistaRetorno, setDataPrevistaRetorno] = useState('')
  const [dataRegistroNotas, setDataRegistroNotas] = useState('')

  // Related IDs
  const [selectedMedsIds, setSelectedMedsIds] = useState<string[]>([])
  const [selectedExamsIds, setSelectedExamsIds] = useState<string[]>([])

  // Files
  const [anexosFiles, setAnexosFiles] = useState<File[]>([])
  const anexosInputRef = useRef<HTMLInputElement>(null)

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [consultaToDelete, setConsultaToDelete] = useState<Consulta | null>(null)

  const loadData = useCallback(async () => {
    const profId = activeProfile?.id
    try {
      const [cons, docs, meds, exs] = await Promise.all([
        getConsultas(profId),
        getMedicos(profId),
        getMedicamentos(profId),
        getExames(profId),
      ])
      setConsultas(cons)
      setMedicos(docs)
      setMedicamentos(meds)
      setExames(exs)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar consultas',
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
    setEditingConsulta(null)
    setMedicoId(medicos[0]?.id || '')
    const today = extrairDataIso(new Date().toISOString())
    setData(today)
    setHorario('09:30')
    setTipo('Presencial')
    setLocal('')
    setStatus('Agendada')
    setAnotacoes('')

    // Reset post-consultation
    setMotivoAtendimento('')
    setSintomasRelatados('')
    setPergunasPreparadas('')
    setAssuntosTratados('')
    setResumoOrientacoes('')
    setAlteracoesMedicamentos('')
    setExamesSolicitados('')
    setEncaminhamentos('')
    setProximosPassos('')
    setDataPrevistaRetorno('')
    setDataRegistroNotas(today)
    setSelectedMedsIds([])
    setSelectedExamsIds([])
    setAnexosFiles([])
    setFormOpen(true)
  }

  const openEditForm = (c: Consulta) => {
    setEditingConsulta(c)
    setMedicoId(c.medico)
    setData(extrairDataIso(c.data))
    setHorario(formatarHora(c.horario) || '09:00')
    setTipo(c.tipo)
    setLocal(c.local || '')
    setStatus(c.status)
    setAnotacoes(c.anotacoes || '')

    // Post-consultation
    setMotivoAtendimento(c.motivo_atendimento || '')
    setSintomasRelatados(c.sintomas_relatados || '')
    setPergunasPreparadas(c.perguntas_preparadas || '')
    setAssuntosTratados(c.assuntos_tratados || '')
    setResumoOrientacoes(c.resumo_orientacoes || '')
    setAlteracoesMedicamentos(c.alteracoes_medicamentos_relacionadas || '')
    setExamesSolicitados(c.exames_solicitados_relacionados || '')
    setEncaminhamentos(c.encaminhamentos || '')
    setProximosPassos(c.proximos_passos || '')
    setDataPrevistaRetorno(extrairDataIso(c.data_prevista_retorno))
    setDataRegistroNotas(
      extrairDataIso(c.data_registro_notas) || extrairDataIso(new Date().toISOString()),
    )

    setSelectedMedsIds(
      Array.isArray(c.medicamentos_relacionados_ids) ? c.medicamentos_relacionados_ids : [],
    )
    setSelectedExamsIds(Array.isArray(c.exames_relacionados_ids) ? c.exames_relacionados_ids : [])
    setAnexosFiles([])
    setFormOpen(true)
  }

  const toggleMedSelection = (medId: string) => {
    setSelectedMedsIds((prev) =>
      prev.includes(medId) ? prev.filter((id) => id !== medId) : [...prev, medId],
    )
  }

  const toggleExamSelection = (examId: string) => {
    setSelectedExamsIds((prev) =>
      prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!medicoId || !data || !horario) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Médico, data e horário são necessários.',
        variant: 'destructive',
      })
      return
    }

    if (isReadOnly) {
      toast({
        title: 'Assinatura expirada',
        description: 'Renove seu plano no menu Meu Plano para agendar ou registrar consultas.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('medico', medicoId)
      formData.append('data', data)
      formData.append('horario', horario)
      formData.append('tipo', tipo)
      if (local.trim()) formData.append('local', local.trim())
      formData.append('status', status)
      if (anotacoes.trim()) formData.append('anotacoes', anotacoes.trim())

      // Structured Post-Consultation Fields
      if (motivoAtendimento.trim()) formData.append('motivo_atendimento', motivoAtendimento.trim())
      if (sintomasRelatados.trim()) formData.append('sintomas_relatados', sintomasRelatados.trim())
      if (perguntasPreparadas.trim())
        formData.append('perguntas_preparadas', perguntasPreparadas.trim())
      if (assuntosTratados.trim()) formData.append('assuntos_tratados', assuntosTratados.trim())
      if (resumoOrientacoes.trim()) formData.append('resumo_orientacoes', resumoOrientacoes.trim())
      if (alteracoesMedicamentos.trim()) {
        formData.append('alteracoes_medicamentos_relacionadas', alteracoesMedicamentos.trim())
      }
      if (examesSolicitados.trim()) {
        formData.append('exames_solicitados_relacionados', examesSolicitados.trim())
      }
      if (encaminhamentos.trim()) formData.append('encaminhamentos', encaminhamentos.trim())
      if (proximosPassos.trim()) formData.append('proximos_passos', proximosPassos.trim())
      if (dataPrevistaRetorno) formData.append('data_prevista_retorno', dataPrevistaRetorno)
      formData.append(
        'data_registro_notas',
        dataRegistroNotas || extrairDataIso(new Date().toISOString()),
      )

      formData.append('medicamentos_relacionados_ids', JSON.stringify(selectedMedsIds))
      formData.append('exames_relacionados_ids', JSON.stringify(selectedExamsIds))

      // Append files
      anexosFiles.forEach((file) => {
        formData.append('anexos', file)
      })

      if (editingConsulta) {
        await updateConsulta(editingConsulta.id, formData)
        toast({
          title: 'Consulta atualizada!',
          description: 'Registro do atendimento e anotações pós-consulta gravados com sucesso.',
        })
      } else {
        await createConsulta(formData, activeProfile?.id)
        toast({
          title: 'Consulta agendada/cadastrada!',
          description: `A consulta foi salva no prontuário de ${activeProfile?.nome || 'Titular'}.`,
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

  const promptDelete = (c: Consulta) => {
    setConsultaToDelete(c)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!consultaToDelete) return
    setSaving(true)
    try {
      await deleteConsulta(consultaToDelete.id)
      toast({
        title: 'Consulta excluída',
        description: 'Registro e anotações removidos com sucesso.',
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

  const toggleDetails = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (iso?: string) => formatarData(iso)
  const formatTime = (time?: string) => formatarHora(time)

  // Filtered list
  const filteredConsultas = consultas.filter((c) => {
    const matchesStatus = selectedStatus === 'Todas' || c.status === selectedStatus
    const query = searchQuery.toLowerCase().trim()
    if (!query) return matchesStatus
    const docName = c.expand?.medico?.nome?.toLowerCase() || ''
    const spec = c.expand?.medico?.especialidade?.toLowerCase() || ''
    const localStr = c.local?.toLowerCase() || ''
    const notesStr = c.anotacoes?.toLowerCase() || ''
    const motivoStr = c.motivo_atendimento?.toLowerCase() || ''
    const resumoStr = c.resumo_orientacoes?.toLowerCase() || ''
    return (
      matchesStatus &&
      (docName.includes(query) ||
        spec.includes(query) ||
        localStr.includes(query) ||
        notesStr.includes(query) ||
        motivoStr.includes(query) ||
        resumoStr.includes(query))
    )
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Consultas
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Agendamentos, orientações médicas e registro pós-consulta estruturado com autoria do
            paciente
          </p>
        </div>

        {permissions.consultas_editar && !isReadOnly ? (
          <button
            onClick={openNewForm}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nova consulta</span>
          </button>
        ) : (
          <span className="text-xs text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-full font-medium">
            {isReadOnly ? 'Plano Expirado — Somente Leitura' : 'Modo Somente Leitura'}
          </span>
        )}
      </div>

      <ProfileContextBadge actionLabel="Consultas médicas de" />

      {/* Filters & Search Row */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-[#D9E2D4] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                selectedStatus === st
                  ? 'bg-[#4C7A5A] text-white shadow-xs'
                  : 'bg-[#F6F4EF] text-[#6B7A6F] hover:bg-[#E7F0E3] hover:text-[#26362B]'
              }`}
            >
              {st}
              {st !== 'Todas' && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                  {consultas.filter((c) => c.status === st).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#6B7A6F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por médico, sintomas, orientações..."
            className="w-full pl-9 pr-4 py-2 rounded-full border border-[#D9E2D4] bg-[#FDFCFB] text-xs text-[#26362B] focus:ring-2 focus:ring-[#4C7A5A] outline-none"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
          <p className="text-sm font-serif italic text-[#26362B]">Carregando consultas...</p>
        </div>
      ) : filteredConsultas.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#D9E2D4] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <h3 className="font-serif italic text-xl text-[#26362B] font-medium">
            Nenhuma consulta encontrada
          </h3>
          <p className="text-xs text-[#6B7A6F] mt-2">
            {searchQuery || selectedStatus !== 'Todas'
              ? 'Tente ajustar os filtros ou termo de busca.'
              : 'Registre seus atendimentos e guarde com rigor as orientações recebidas.'}
          </p>
          <button
            onClick={openNewForm}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-medium shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar primeira consulta</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConsultas.map((c) => {
            const isDetailsExpanded = !!expandedDetails[c.id]
            const isAgendada = c.status === 'Agendada'
            const hasStructuredNotes =
              c.motivo_atendimento ||
              c.sintomas_relatados ||
              c.perguntas_preparadas ||
              c.assuntos_tratados ||
              c.resumo_orientacoes ||
              c.alteracoes_medicamentos_relacionadas ||
              c.exames_solicitados_relacionados ||
              c.encaminhamentos ||
              c.proximos_passos ||
              c.anotacoes

            // Vinculados
            const linkedMeds = medicamentos.filter(
              (m) =>
                Array.isArray(c.medicamentos_relacionados_ids) &&
                c.medicamentos_relacionados_ids.includes(m.id),
            )
            const linkedExams = exames.filter(
              (e) =>
                Array.isArray(c.exames_relacionados_ids) &&
                c.exames_relacionados_ids.includes(e.id),
            )
            const anexosList: string[] = Array.isArray(c.anexos) ? c.anexos : []

            return (
              <div
                key={c.id}
                className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm hover:shadow-md transition duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Doctor Info & Date */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center shrink-0 border border-[#DCE9D4]">
                      <Stethoscope className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                          {c.expand?.medico?.nome || 'Profissional não informado'}
                        </h3>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            c.status === 'Realizada'
                              ? 'bg-[#DCE9D4] text-[#26362B]'
                              : isAgendada
                                ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {c.status}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#F6F4EF] text-[#6B7A6F] border border-[#D9E2D4]">
                          {c.tipo}
                        </span>
                      </div>

                      <p className="text-xs text-[#4C7A5A] font-semibold uppercase tracking-wider mt-0.5">
                        {c.expand?.medico?.especialidade || 'Consulta Médica'}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7A6F] mt-3">
                        <span className="flex items-center gap-1.5 font-medium text-[#26362B]">
                          <Calendar className="w-3.5 h-3.5 text-[#4C7A5A]" />
                          Data do atendimento: <strong>{formatDate(c.data)}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#4C7A5A]" />
                          {formatTime(c.horario)}
                        </span>
                        {c.local && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#4C7A5A]" />
                            {c.local}
                          </span>
                        )}
                        {c.data_registro_notas && (
                          <span className="text-[11px] text-[#6B7A6F] italic bg-[#F6F4EF] px-2 py-0.5 rounded-md">
                            Anotações registradas em: {formatDate(c.data_registro_notas)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-start">
                    <button
                      onClick={() => openEditForm(c)}
                      className="p-2 rounded-full hover:bg-[#E7F0E3] text-[#4C7A5A] transition cursor-pointer"
                      title="Editar consulta e anotações"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => promptDelete(c)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                      title="Excluir consulta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Structured Post-Consultation Area */}
                {hasStructuredNotes ? (
                  <div className="mt-4 pt-4 border-t border-[#D9E2D4]/60">
                    <button
                      onClick={() => toggleDetails(c.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4C7A5A] hover:underline cursor-pointer mb-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Registro pós-consulta e orientações</span>
                      {isDetailsExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isDetailsExpanded && (
                      <div className="p-4 md:p-5 rounded-2xl bg-[#F6F4EF]/80 border border-[#D9E2D4] space-y-4 animate-fade-in text-xs">
                        {/* Pacient Authorship Banner */}
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                          <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            <strong>Registro pessoal do paciente:</strong> Este conteúdo é de
                            autoria do próprio usuário para controle pessoal de saúde (não constitui
                            declaração oficial do médico).
                          </span>
                        </div>

                        {/* Structured Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {c.motivo_atendimento && (
                            <div className="bg-white p-3 rounded-xl border border-[#D9E2D4]">
                              <span className="font-semibold text-[#26362B] block text-[11px] uppercase tracking-wider mb-1">
                                Motivo do atendimento
                              </span>
                              <p className="text-[#385942] italic">"{c.motivo_atendimento}"</p>
                            </div>
                          )}

                          {c.sintomas_relatados && (
                            <div className="bg-white p-3 rounded-xl border border-[#D9E2D4]">
                              <span className="font-semibold text-[#26362B] block text-[11px] uppercase tracking-wider mb-1">
                                Sintomas relatados
                              </span>
                              <p className="text-[#385942]">{c.sintomas_relatados}</p>
                            </div>
                          )}

                          {c.perguntas_preparadas && (
                            <div className="bg-white p-3 rounded-xl border border-[#D9E2D4]">
                              <span className="font-semibold text-[#26362B] block text-[11px] uppercase tracking-wider mb-1">
                                Perguntas preparadas previamente
                              </span>
                              <p className="text-[#385942]">{c.perguntas_preparadas}</p>
                            </div>
                          )}

                          {c.assuntos_tratados && (
                            <div className="bg-white p-3 rounded-xl border border-[#D9E2D4]">
                              <span className="font-semibold text-[#26362B] block text-[11px] uppercase tracking-wider mb-1">
                                Assuntos tratados
                              </span>
                              <p className="text-[#385942]">{c.assuntos_tratados}</p>
                            </div>
                          )}
                        </div>

                        {/* Big Resumo das orientações */}
                        {c.resumo_orientacoes && (
                          <div className="bg-white p-4 rounded-xl border border-[#D9E2D4]">
                            <span className="font-semibold text-[#26362B] block text-[11px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5 text-[#4C7A5A]">
                              <Sparkles className="w-3.5 h-3.5" />
                              Resumo das orientações recebidas
                            </span>
                            <blockquote className="font-serif italic text-sm leading-relaxed text-[#26362B] pl-3 border-l-2 border-[#4C7A5A]">
                              "{c.resumo_orientacoes}"
                            </blockquote>
                          </div>
                        )}

                        {/* Medical changes, exams requested, referrals */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {c.alteracoes_medicamentos_relacionadas && (
                            <div className="bg-white p-3 rounded-xl border border-[#D9E2D4]">
                              <span className="font-semibold text-[#26362B] block text-[11px] mb-1">
                                Alterações de medicamentos:
                              </span>
                              <p className="text-[#385942] text-[11px]">
                                {c.alteracoes_medicamentos_relacionadas}
                              </p>
                            </div>
                          )}

                          {c.exames_solicitados_relacionados && (
                            <div className="bg-white p-3 rounded-xl border border-[#D9E2D4]">
                              <span className="font-semibold text-[#26362B] block text-[11px] mb-1">
                                Exames solicitados:
                              </span>
                              <p className="text-[#385942] text-[11px]">
                                {c.exames_solicitados_relacionados}
                              </p>
                            </div>
                          )}

                          {c.encaminhamentos && (
                            <div className="bg-white p-3 rounded-xl border border-[#D9E2D4]">
                              <span className="font-semibold text-[#26362B] block text-[11px] mb-1">
                                Encaminhamentos:
                              </span>
                              <p className="text-[#385942] text-[11px]">{c.encaminhamentos}</p>
                            </div>
                          )}
                        </div>

                        {/* Next steps and Return date */}
                        {(c.proximos_passos || c.data_prevista_retorno) && (
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#D9E2D4]">
                            {c.proximos_passos && (
                              <div>
                                <span className="font-semibold text-[#26362B] block text-[11px]">
                                  Próximos passos acordados:
                                </span>
                                <p className="text-[#385942]">{c.proximos_passos}</p>
                              </div>
                            )}

                            {c.data_prevista_retorno && (
                              <div className="text-right">
                                <span className="text-[11px] text-[#6B7A6F] block">
                                  Previsão de retorno:
                                </span>
                                <span className="font-semibold text-[#4C7A5A]">
                                  {formatDate(c.data_prevista_retorno)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Vinculações explícitas no prontuário */}
                        {(linkedMeds.length > 0 || linkedExams.length > 0) && (
                          <div className="p-3.5 rounded-xl bg-white border border-[#D9E2D4] space-y-2">
                            <span className="font-semibold text-[#26362B] block text-[11px] flex items-center gap-1.5 text-[#4C7A5A]">
                              <LinkIcon className="w-3.5 h-3.5" />
                              Vínculos diretos no prontuário
                            </span>

                            <div className="flex flex-wrap gap-2">
                              {linkedMeds.map((lm) => (
                                <span
                                  key={lm.id}
                                  className="px-2.5 py-1 rounded-full bg-[#E7F0E3] text-[#26362B] text-[11px] font-medium border border-[#DCE9D4]"
                                >
                                  Medicamento: <strong>{lm.nome}</strong> (
                                  {lm.dosagem || lm.concentracao})
                                </span>
                              ))}

                              {linkedExams.map((le) => (
                                <span
                                  key={le.id}
                                  className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-900 text-[11px] font-medium border border-teal-200"
                                >
                                  Exame: <strong>{le.nome}</strong> ({le.status})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Legacy anotacoes text if present */}
                        {c.anotacoes && (
                          <div className="bg-white p-3 rounded-xl border border-[#D9E2D4]">
                            <span className="font-semibold text-[#26362B] block text-[11px] mb-1">
                              Anotações gerais adicionais:
                            </span>
                            <p className="text-[#385942] italic">"{c.anotacoes}"</p>
                          </div>
                        )}

                        {/* Anexos */}
                        {anexosList.length > 0 && (
                          <div className="pt-2 border-t border-[#D9E2D4] flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-[#26362B] flex items-center gap-1">
                              <Paperclip className="w-3 h-3 text-[#4C7A5A]" />
                              Anexos da consulta:
                            </span>
                            {anexosList.map((file, i) => {
                              const url = getFileUrl('consultas', c.id, file)
                              return (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[#4C7A5A] text-xs font-medium border border-[#D9E2D4] hover:bg-[#E7F0E3] transition"
                                >
                                  <span>Anexo {i + 1}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  c.status === 'Realizada' && (
                    <div className="mt-4 pt-3 border-t border-[#D9E2D4]/50 flex items-center justify-between text-xs text-amber-800">
                      <span>Nenhum registro pós-consulta preenchido ainda.</span>
                      <button
                        onClick={() => openEditForm(c)}
                        className="text-[#4C7A5A] font-semibold hover:underline"
                      >
                        + Preencher pós-consulta agora
                      </button>
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD Modal Form with Separated Post-Consultation Fields */}
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
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
                  {editingConsulta ? 'Editar consulta e pós-consulta' : 'Nova consulta'}
                </h2>
                <p className="text-xs text-[#6B7A6F]">
                  Mantenha a data do atendimento e o registro detalhado das orientações
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Section 1: Agendamento */}
              <div className="p-4 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4] space-y-3">
                <span className="text-xs font-semibold text-[#26362B] uppercase tracking-wider block">
                  Dados do Atendimento
                </span>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Médico / Profissional de saúde <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={medicoId}
                    onChange={(e) => setMedicoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  >
                    <option value="">Selecione o profissional...</option>
                    {medicos.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.nome} — {doc.especialidade}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Data da consulta <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Horário <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={horario}
                      onChange={(e) => setHorario(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Status da consulta <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StatusConsulta)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    >
                      <option value="Agendada">Agendada</option>
                      <option value="Realizada">Realizada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Tipo de atendimento
                    </label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as TipoConsulta)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    >
                      {TIPOS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Local / Plataforma
                    </label>
                    <input
                      type="text"
                      value={local}
                      onChange={(e) => setLocal(e.target.value)}
                      placeholder="Ex.: Consultório Jardins ou Google Meet"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Registro Pós-consulta Estruturado */}
              <div className="p-4 rounded-2xl bg-white border-2 border-[#4C7A5A]/30 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#D9E2D4]">
                  <div>
                    <span className="text-xs font-bold text-[#26362B] uppercase tracking-wider block">
                      Área de Registro Pós-Consulta Estruturado
                    </span>
                    <span className="text-[11px] text-[#4C7A5A]">
                      Campos separados preenchidos pelo próprio paciente
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B7A6F]">
                    <span>Data do registro:</span>
                    <input
                      type="date"
                      value={dataRegistroNotas}
                      onChange={(e) => setDataRegistroNotas(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-[#D9E2D4] bg-[#FDFCFB] text-xs text-[#26362B]"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Identificação de autoria:</strong> Este registro é redigido pelo usuário
                    para o seu prontuário pessoal e não constitui atestado ou declaração médica
                    oficial.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Motivo do atendimento
                    </label>
                    <textarea
                      rows={2}
                      value={motivoAtendimento}
                      onChange={(e) => setMotivoAtendimento(e.target.value)}
                      placeholder="Ex.: Check-up anual, dor lombar aguda, acompanhamento de pressão..."
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Sintomas relatados
                    </label>
                    <textarea
                      rows={2}
                      value={sintomasRelatados}
                      onChange={(e) => setSintomasRelatados(e.target.value)}
                      placeholder="Ex.: Cansaço vespertino, dor de cabeça ao acordar..."
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Perguntas preparadas antes da consulta
                    </label>
                    <textarea
                      rows={2}
                      value={perguntasPreparadas}
                      onChange={(e) => setPergunasPreparadas(e.target.value)}
                      placeholder="Ex.: Devo reduzir a dose de Losartana? Posso voltar a correr?"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Assuntos tratados na conversa
                    </label>
                    <textarea
                      rows={2}
                      value={assuntosTratados}
                      onChange={(e) => setAssuntosTratados(e.target.value)}
                      placeholder="Ex.: Pressão 120x80, alimentação com pouco sódio, sono..."
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Resumo das orientações recebidas do profissional
                  </label>
                  <textarea
                    rows={3}
                    value={resumoOrientacoes}
                    onChange={(e) => setResumoOrientacoes(e.target.value)}
                    placeholder="Ex.: Manter medicamento de uso contínuo pela manhã; caminhar 30 min por dia; beber 2 litros de água..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Alterações de medicamentos relacionadas
                    </label>
                    <textarea
                      rows={2}
                      value={alteracoesMedicamentos}
                      onChange={(e) => setAlteracoesMedicamentos(e.target.value)}
                      placeholder="Ex.: Aumentar dose de 25mg para 50mg; suspender anti-inflamatório..."
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Exames solicitados relacionados
                    </label>
                    <textarea
                      rows={2}
                      value={examesSolicitados}
                      onChange={(e) => setExamesSolicitados(e.target.value)}
                      placeholder="Ex.: Hemograma, perfil lipídico e ultrassom de abdome..."
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Encaminhamentos
                    </label>
                    <input
                      type="text"
                      value={encaminhamentos}
                      onChange={(e) => setEncaminhamentos(e.target.value)}
                      placeholder="Ex.: Nutricionista, Fisioterapia"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Próximos passos
                    </label>
                    <input
                      type="text"
                      value={proximosPassos}
                      onChange={(e) => setProximosPassos(e.target.value)}
                      placeholder="Ex.: Fazer exames em 15 dias"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Data prevista de retorno
                    </label>
                    <input
                      type="date"
                      value={dataPrevistaRetorno}
                      onChange={(e) => setDataPrevistaRetorno(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Vinculação aos medicamentos e exames existentes */}
                <div className="pt-2 border-t border-[#D9E2D4] space-y-2">
                  <span className="text-xs font-semibold text-[#26362B] uppercase tracking-wider block flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-[#4C7A5A]" />
                    Vincular diretamente a registros do prontuário
                  </span>

                  {/* Medicamentos picker */}
                  <div>
                    <span className="text-[11px] text-[#6B7A6F] block mb-1">
                      Selecione medicamentos relacionados a esta consulta:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#F6F4EF] rounded-xl border border-[#D9E2D4]">
                      {medicamentos.length === 0 ? (
                        <span className="text-[11px] text-gray-500 italic">
                          Nenhum medicamento cadastrado.
                        </span>
                      ) : (
                        medicamentos.map((m) => {
                          const isSelected = selectedMedsIds.includes(m.id)
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleMedSelection(m.id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#4C7A5A] text-white'
                                  : 'bg-white text-[#26362B] border border-[#D9E2D4]'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '} {m.nome}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Exames picker */}
                  <div>
                    <span className="text-[11px] text-[#6B7A6F] block mb-1">
                      Selecione pedidos de exames originados desta consulta:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#F6F4EF] rounded-xl border border-[#D9E2D4]">
                      {exames.length === 0 ? (
                        <span className="text-[11px] text-gray-500 italic">
                          Nenhum exame cadastrado.
                        </span>
                      ) : (
                        exames.map((ex) => {
                          const isSelected = selectedExamsIds.includes(ex.id)
                          return (
                            <button
                              key={ex.id}
                              type="button"
                              onClick={() => toggleExamSelection(ex.id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#5B9A8B] text-white'
                                  : 'bg-white text-[#26362B] border border-[#D9E2D4]'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '} {ex.nome} ({ex.status})
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload de Anexos */}
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Anexos da consulta (PDF, atestados, fotos da receita física)
                  </label>
                  <input
                    ref={anexosInputRef}
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files) {
                        setAnexosFiles(Array.from(e.target.files))
                      }
                    }}
                    className="w-full text-xs text-[#6B7A6F] file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#4C7A5A] file:text-white hover:file:bg-[#3F664C] cursor-pointer"
                  />
                  {anexosFiles.length > 0 && (
                    <p className="text-[11px] text-[#4C7A5A] mt-1 font-semibold">
                      {anexosFiles.length} arquivo(s) selecionado(s) para upload.
                    </p>
                  )}
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
                  {saving
                    ? 'Gravando...'
                    : editingConsulta
                      ? 'Salvar atendimento'
                      : 'Registrar consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && consultaToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D9E2D4] text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Excluir consulta?
              </h3>
              <p className="text-xs text-[#6B7A6F] mt-1">
                Tem certeza? As anotações do atendimento de{' '}
                <strong>{formatDate(consultaToDelete.data)}</strong> serão removidas.
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
