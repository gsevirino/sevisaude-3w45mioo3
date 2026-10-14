import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getMedicamentos,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
  getAlteracoesMedicamento,
  getMedicos,
  getFileUrl,
} from '@/services/healthService'
import type {
  Medicamento,
  Medico,
  FormaFarmaceutica,
  StatusMedicamento,
  TipoUsoMedicamento,
  AlteracaoMedicamento,
} from '@/types/health'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Pill,
  Plus,
  Clock,
  Calendar,
  History,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Power,
  RotateCcw,
  Paperclip,
  ExternalLink,
  Pause,
  AlertTriangle,
  Info,
  ShieldCheck,
  Filter,
  Search,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatarData, formatarHora, formatarTimestampLocal, extrairDataIso } from '@/lib/dateUtils'

const FORMAS: { label: string; value: FormaFarmaceutica }[] = [
  { label: 'Comprimido', value: 'comprimido' },
  { label: 'Cápsula', value: 'cápsula' },
  { label: 'Xarope', value: 'xarope' },
  { label: 'Solução oral', value: 'solução' },
  { label: 'Gotas', value: 'gotas' },
  { label: 'Injetável', value: 'injetável' },
  { label: 'Creme', value: 'creme' },
  { label: 'Pomada', value: 'pomada' },
  { label: 'Spray', value: 'spray' },
  { label: 'Adesivo transdérmico', value: 'adesivo' },
  { label: 'Outro', value: 'outro' },
]

const STATUS_FILTERS: (StatusMedicamento | 'todos')[] = [
  'todos',
  'em uso',
  'pausado',
  'suspenso',
  'concluído',
]

const VIAS_ADMINISTRACAO = [
  'Oral',
  'Sublingual',
  'Inalatória',
  'Tópica / Cutânea',
  'Oftálmica',
  'Otológica',
  'Nasal',
  'Intramuscular (IM)',
  'Intravenosa (IV)',
  'Subcutânea (SC)',
  'Retal',
  'Outra',
]

export default function Medicamentos() {
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)

  // Realtime
  useRealtime('medicamentos', () => triggerRefresh())
  useRealtime('alteracoes_medicamentos', () => triggerRefresh())

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<StatusMedicamento | 'todos'>('todos')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal form states
  const [formOpen, setFormOpen] = useState(false)
  const [editingMed, setEditingMed] = useState<Medicamento | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [nome, setNome] = useState('')
  const [principioAtivo, setPrincipioAtivo] = useState('')
  const [apresentacao, setApresentacao] = useState('')
  const [concentracao, setConcentracao] = useState('')
  const [dosePrescrita, setDosePrescrita] = useState('')
  const [unidadeDose, setUnidadeDose] = useState('comprimido')
  const [viaAdministracao, setViaAdministracao] = useState('Oral')
  const [frequencia, setFrequencia] = useState('')
  const [instrucoesPrescricao, setInstrucoesPrescricao] = useState('')
  const [tipoUso, setTipoUso] = useState<TipoUsoMedicamento>('contínuo')
  const [dataPrescricao, setDataPrescricao] = useState('')
  const [status, setStatus] = useState<StatusMedicamento>('em uso')
  const [dosagem, setDosagem] = useState('')
  const [forma, setForma] = useState<FormaFarmaceutica>('comprimido')
  const [laboratorio, setLaboratorio] = useState('')
  const [medicoId, setMedicoId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horarios, setHorarios] = useState<string[]>(['08:00'])
  const [observacoes, setObservacoes] = useState('')
  const [novoHorario, setNovoHorario] = useState('12:00')
  const [receitaFile, setReceitaFile] = useState<File | null>(null)
  const receitaInputRef = useRef<HTMLInputElement>(null)

  // Audit modal for updates or status changes
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [auditFieldLabel, setAuditFieldLabel] = useState('Alteração de dados / posologia')
  const [auditOldValue, setAuditOldValue] = useState('')
  const [auditNewValue, setAuditNewValue] = useState('')
  const [auditReason, setAuditReason] = useState('')
  const [pendingAction, setPendingAction] = useState<
    | { type: 'submit_edit'; formData: FormData }
    | { type: 'status_change'; target: Medicamento; newStatus: StatusMedicamento }
    | null
  >(null)

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [medToDelete, setMedToDelete] = useState<Medicamento | null>(null)

  // Expanded alteration history cards
  const [expandedHistory, setExpandedHistory] = useState<Record<string, AlteracaoMedicamento[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({})

  const loadData = useCallback(async () => {
    try {
      const [meds, docs] = await Promise.all([getMedicamentos(), getMedicos()])
      setMedicamentos(meds)
      setMedicos(docs)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os medicamentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const openNewForm = () => {
    setEditingMed(null)
    setNome('')
    setPrincipioAtivo('')
    setApresentacao('')
    setConcentracao('')
    setDosePrescrita('')
    setUnidadeDose('comprimido')
    setViaAdministracao('Oral')
    setFrequencia('12 em 12 horas')
    setInstrucoesPrescricao('')
    setTipoUso('contínuo')
    setDataPrescricao(extrairDataIso(new Date().toISOString()))
    setStatus('em uso')
    setDosagem('')
    setForma('comprimido')
    setLaboratorio('')
    setMedicoId(medicos[0]?.id || '')
    setDataInicio(extrairDataIso(new Date().toISOString()))
    setDataFim('')
    setHorarios(['08:00'])
    setObservacoes('')
    setReceitaFile(null)
    setFormOpen(true)
  }

  const openEditForm = (m: Medicamento) => {
    setEditingMed(m)
    setNome(m.nome || '')
    setPrincipioAtivo(m.principio_ativo || '')
    setApresentacao(m.apresentacao || '')
    setConcentracao(m.concentracao || '')
    setDosePrescrita(m.dose_prescrita || '')
    setUnidadeDose(m.unidade_dose || 'comprimido')
    setViaAdministracao(m.via_administracao || 'Oral')
    setFrequencia(m.frequencia || '')
    setInstrucoesPrescricao(m.instrucoes_prescricao || '')
    setTipoUso(m.tipo_uso || 'contínuo')
    setDataPrescricao(extrairDataIso(m.data_prescricao))
    setStatus(m.status || 'em uso')
    setDosagem(m.dosagem || '')
    setForma(m.forma || 'comprimido')
    setLaboratorio(m.laboratorio || '')
    setMedicoId(m.medico || '')
    setDataInicio(extrairDataIso(m.data_inicio))
    setDataFim(extrairDataIso(m.data_fim))
    setHorarios(Array.isArray(m.horarios) && m.horarios.length > 0 ? m.horarios : ['08:00'])
    setObservacoes(m.observacoes || '')
    setReceitaFile(null)
    setFormOpen(true)
  }

  const handleAddHorario = () => {
    if (novoHorario && !horarios.includes(novoHorario)) {
      setHorarios([...horarios, novoHorario].sort())
    }
  }

  const handleRemoveHorario = (time: string) => {
    setHorarios(horarios.filter((h) => h !== time))
  }

  // Pre-save check
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome comercial ou designação do medicamento.',
        variant: 'destructive',
      })
      return
    }

    const calculatedDosagem = dosagem.trim() || concentracao.trim() || dosePrescrita.trim() || ''

    const formData = new FormData()
    formData.append('nome', nome.trim())
    if (principioAtivo.trim()) formData.append('principio_ativo', principioAtivo.trim())
    if (apresentacao.trim()) formData.append('apresentacao', apresentacao.trim())
    if (concentracao.trim()) formData.append('concentracao', concentracao.trim())
    if (dosePrescrita.trim()) formData.append('dose_prescrita', dosePrescrita.trim())
    if (unidadeDose.trim()) formData.append('unidade_dose', unidadeDose.trim())
    if (viaAdministracao.trim()) formData.append('via_administracao', viaAdministracao.trim())
    if (frequencia.trim()) formData.append('frequencia', frequencia.trim())
    if (instrucoesPrescricao.trim())
      formData.append('instrucoes_prescricao', instrucoesPrescricao.trim())
    if (tipoUso) formData.append('tipo_uso', tipoUso)
    if (dataPrescricao) formData.append('data_prescricao', dataPrescricao)
    formData.append('status', status)
    formData.append('dosagem', calculatedDosagem)
    formData.append('forma', forma)
    if (laboratorio.trim()) formData.append('laboratorio', laboratorio.trim())
    if (medicoId) formData.append('medico', medicoId)
    if (dataInicio) formData.append('data_inicio', dataInicio)
    if (dataFim) formData.append('data_fim', dataFim)
    formData.append('horarios', JSON.stringify(horarios))
    if (observacoes.trim()) formData.append('observacoes', observacoes.trim())
    if (receitaFile) formData.append('receita_arquivo', receitaFile)

    if (editingMed) {
      // Calculate what changed to pre-populate audit
      const changes: string[] = []
      if (editingMed.dose_prescrita !== dosePrescrita || editingMed.dosagem !== calculatedDosagem) {
        changes.push(
          `Dose: "${editingMed.dose_prescrita || editingMed.dosagem || '—'}" → "${dosePrescrita || calculatedDosagem}"`,
        )
      }
      if (editingMed.frequencia !== frequencia) {
        changes.push(`Frequência: "${editingMed.frequencia || '—'}" → "${frequencia || '—'}"`)
      }
      if (editingMed.status !== status) {
        changes.push(`Status: "${editingMed.status}" → "${status}"`)
      }
      if (editingMed.instrucoes_prescricao !== instrucoesPrescricao) {
        changes.push('Instruções da prescrição atualizadas')
      }

      setAuditFieldLabel(
        changes.length > 0 ? changes.join('; ') : 'Revisão de posologia/dados cadastrais',
      )
      setAuditOldValue(
        `Dose: ${editingMed.dose_prescrita || editingMed.dosagem || '—'} | Freq: ${editingMed.frequencia || '—'} | Status: ${editingMed.status}`,
      )
      setAuditNewValue(
        `Dose: ${dosePrescrita || calculatedDosagem || '—'} | Freq: ${frequencia || '—'} | Status: ${status}`,
      )
      setAuditReason('')
      setPendingAction({ type: 'submit_edit', formData })
      setAuditModalOpen(true)
    } else {
      // Direct create
      setSaving(true)
      try {
        await createMedicamento(formData)
        toast({
          title: 'Medicamento cadastrado!',
          description: `${nome} foi incluído ao seu prontuário com sucesso.`,
        })
        setFormOpen(false)
        triggerRefresh()
      } catch (err: any) {
        toast({
          title: 'Erro ao cadastrar',
          description: err?.message || 'Tente novamente.',
          variant: 'destructive',
        })
      } finally {
        setSaving(false)
      }
    }
  }

  const handleStatusChangeRequest = (m: Medicamento, newStatus: StatusMedicamento) => {
    let actionLabel = ''
    if (newStatus === 'pausado') actionLabel = 'Pausa temporária de uso'
    else if (newStatus === 'suspenso') actionLabel = 'Suspensão médica do medicamento'
    else if (newStatus === 'concluído') actionLabel = 'Tratamento finalizado / concluído'
    else actionLabel = 'Retomada de uso do medicamento'

    setAuditFieldLabel(`Status: ${m.status} → ${newStatus} (${actionLabel})`)
    setAuditOldValue(`Status anterior: ${m.status}`)
    setAuditNewValue(`Novo status: ${newStatus}`)
    setAuditReason('')
    setPendingAction({ type: 'status_change', target: m, newStatus })
    setAuditModalOpen(true)
  }

  const confirmAuditAction = async () => {
    if (!pendingAction) return
    if (!auditReason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Para manter o registro imutável de auditoria, informe o motivo da alteração.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (pendingAction.type === 'submit_edit' && editingMed) {
        await updateMedicamento(editingMed.id, pendingAction.formData, {
          campo_alterado: auditFieldLabel,
          valor_anterior: auditOldValue,
          novo_valor: auditNewValue,
          motivo: auditReason.trim(),
        })
        toast({
          title: 'Medicamento atualizado!',
          description: 'Alterações e auditoria imutável gravadas com sucesso.',
        })
        setAuditModalOpen(false)
        setFormOpen(false)
        triggerRefresh()
      } else if (pendingAction.type === 'status_change') {
        const payload: Partial<Medicamento> = { status: pendingAction.newStatus }
        if (pendingAction.newStatus === 'concluído') {
          payload.data_fim = extrairDataIso(new Date().toISOString())
        }
        await updateMedicamento(pendingAction.target.id, payload, {
          campo_alterado: `Status alterado de "${pendingAction.target.status}" para "${pendingAction.newStatus}"`,
          valor_anterior: pendingAction.target.status,
          novo_valor: pendingAction.newStatus,
          motivo: auditReason.trim(),
        })
        toast({
          title: 'Status atualizado!',
          description: `${pendingAction.target.nome} agora está ${pendingAction.newStatus}.`,
        })
        setAuditModalOpen(false)
        triggerRefresh()
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao gravar auditoria',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
      setPendingAction(null)
    }
  }

  const promptDelete = (m: Medicamento) => {
    setMedToDelete(m)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!medToDelete) return
    setSaving(true)
    try {
      await deleteMedicamento(medToDelete.id)
      toast({
        title: 'Medicamento excluído',
        description: `${medToDelete.nome} foi removido do seu prontuário.`,
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

  const toggleHistory = async (medId: string) => {
    if (expandedHistory[medId]) {
      const next = { ...expandedHistory }
      delete next[medId]
      setExpandedHistory(next)
      return
    }

    setLoadingHistory((prev) => ({ ...prev, [medId]: true }))
    try {
      const logs = await getAlteracoesMedicamento(medId)
      setExpandedHistory((prev) => ({ ...prev, [medId]: logs }))
    } catch (err) {
      toast({
        title: 'Erro ao carregar histórico',
        description: 'Não foi possível buscar os registros de auditoria.',
        variant: 'destructive',
      })
    } finally {
      setLoadingHistory((prev) => ({ ...prev, [medId]: false }))
    }
  }

  const formatDate = (iso?: string) => formatarData(iso)
  const formatDateTime = (iso?: string) => formatarTimestampLocal(iso)

  // Identificar campos incompletos sem inventar valores
  const getIncompleteFields = (m: Medicamento): string[] => {
    const missing: string[] = []
    if (!m.principio_ativo) missing.push('Princípio ativo')
    if (!m.apresentacao && !m.forma) missing.push('Apresentação / Forma')
    if (!m.concentracao && !m.dosagem) missing.push('Concentração / Dosagem')
    if (!m.dose_prescrita) missing.push('Dose prescrita')
    if (!m.frequencia) missing.push('Frequência')
    if (!m.via_administracao) missing.push('Via de administração')
    if (!m.medico) missing.push('Médico prescritor')
    if (!m.data_prescricao && !m.data_inicio) missing.push('Data da prescrição/início')
    if (!m.receita_arquivo) missing.push('Receita anexada')
    return missing
  }

  // Filter list
  const filteredMeds = medicamentos.filter((m) => {
    const matchesStatus = statusFilter === 'todos' || m.status === statusFilter
    const q = searchQuery.toLowerCase().trim()
    if (!q) return matchesStatus
    const matchName = m.nome?.toLowerCase().includes(q)
    const matchPrincipio = m.principio_ativo?.toLowerCase().includes(q)
    const matchLab = m.laboratorio?.toLowerCase().includes(q)
    const matchDoc = m.expand?.medico?.nome?.toLowerCase().includes(q)
    return matchesStatus && (matchName || matchPrincipio || matchLab || matchDoc)
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Meus medicamentos
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Prontuário completo: princípio ativo, posologia, receita anexada, 4 estados e auditoria
            imutável
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo medicamento</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-[#D9E2D4] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#4C7A5A] text-white shadow-xs'
                  : 'bg-[#F6F4EF] text-[#6B7A6F] hover:bg-[#E7F0E3] hover:text-[#26362B]'
              }`}
            >
              {st === 'todos' ? 'Todos' : st}
              {st !== 'todos' && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                  {medicamentos.filter((m) => m.status === st).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#6B7A6F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por medicamento, princípio ativo ou médico..."
            className="w-full pl-9 pr-4 py-2 rounded-full border border-[#D9E2D4] bg-[#FDFCFB] text-xs text-[#26362B] focus:ring-2 focus:ring-[#4C7A5A] outline-none"
          />
        </div>
      </div>

      {/* Medication Cards List */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
          <p className="text-sm font-serif italic text-[#26362B]">
            Carregando seus medicamentos...
          </p>
        </div>
      ) : filteredMeds.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#D9E2D4] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8" />
          </div>
          <h3 className="font-serif italic text-xl text-[#26362B] font-medium">
            Nenhum medicamento encontrado
          </h3>
          <p className="text-xs text-[#6B7A6F] mt-2 leading-relaxed">
            {searchQuery || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros ou termo de busca acima.'
              : 'Cadastre seus medicamentos com receita médica e acompanhe dosagens e histórico de alterações.'}
          </p>
          <button
            onClick={openNewForm}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-medium shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar meu primeiro medicamento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMeds.map((m) => {
            const isEmUso = m.status === 'em uso'
            const isPausado = m.status === 'pausado'
            const isSuspenso = m.status === 'suspenso'
            const isConcluido = m.status === 'concluído'
            const isHistoryOpen = !!expandedHistory[m.id]
            const historyList = expandedHistory[m.id] || []
            const horariosList = Array.isArray(m.horarios) ? m.horarios : []
            const incompleteList = getIncompleteFields(m)
            const receitaUrl = m.receita_arquivo
              ? getFileUrl('medicamentos', m.id, m.receita_arquivo)
              : ''

            return (
              <div
                key={m.id}
                className={`bg-white rounded-3xl p-6 border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                  isEmUso
                    ? 'border-[#D9E2D4]'
                    : isPausado
                      ? 'border-amber-300 bg-amber-50/20'
                      : isSuspenso
                        ? 'border-red-200 bg-red-50/20'
                        : 'border-gray-200 opacity-85 bg-gray-50/50'
                }`}
              >
                <div>
                  {/* Top Row: Name + Status badge */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-serif italic text-2xl text-[#26362B] font-semibold leading-tight">
                        {m.nome}
                      </h3>
                      {m.principio_ativo && (
                        <p className="text-xs text-[#6B7A6F] font-medium mt-0.5">
                          Princípio ativo:{' '}
                          <strong className="text-[#26362B]">{m.principio_ativo}</strong>
                        </p>
                      )}
                      <p className="text-xs text-[#4C7A5A] font-semibold mt-1">
                        {m.concentracao || m.dosagem || 'Concentração não informada'} •{' '}
                        {m.apresentacao || m.forma || 'Forma não informada'}
                        {m.laboratorio ? ` • Lab. ${m.laboratorio}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider text-[11px] ${
                          isEmUso
                            ? 'bg-[#DCE9D4] text-[#26362B] ring-1 ring-[#A8C3A0]/60'
                            : isPausado
                              ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                              : isSuspenso
                                ? 'bg-red-100 text-red-800 ring-1 ring-red-300'
                                : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {m.status}
                      </span>
                      {m.tipo_uso && (
                        <span className="text-[10px] text-[#6B7A6F] font-medium bg-[#F6F4EF] px-2 py-0.5 rounded-full border border-[#D9E2D4]">
                          Uso {m.tipo_uso}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Posologia Detalhada */}
                  <div className="mt-3 p-3.5 rounded-2xl bg-[#F6F4EF]/70 border border-[#D9E2D4]/60 space-y-1.5 text-xs text-[#26362B]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[#6B7A6F] block text-[11px]">Dose prescrita:</span>
                        <span className="font-semibold">
                          {m.dose_prescrita
                            ? `${m.dose_prescrita} ${m.unidade_dose || ''}`
                            : 'Não informada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6B7A6F] block text-[11px]">Via / Frequência:</span>
                        <span className="font-semibold">
                          {m.via_administracao || 'Oral'} {m.frequencia ? `• ${m.frequencia}` : ''}
                        </span>
                      </div>
                    </div>

                    {m.instrucoes_prescricao && (
                      <p className="pt-1.5 border-t border-[#D9E2D4]/50 italic text-[#385942]">
                        "{m.instrucoes_prescricao}"
                      </p>
                    )}
                  </div>

                  {/* Schedules */}
                  <div className="mt-3 pt-3 border-t border-[#D9E2D4]/50">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7A6F] uppercase tracking-wider mb-2">
                      <Clock className="w-3.5 h-3.5 text-[#4C7A5A]" />
                      <span>Horários programados:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {horariosList.length > 0 ? (
                        horariosList.map((h) => (
                          <span
                            key={h}
                            className="px-2.5 py-0.5 rounded-full bg-[#E7F0E3] text-[#26362B] text-xs font-semibold border border-[#DCE9D4]"
                          >
                            {h}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#6B7A6F] italic">Sem horários fixos</span>
                      )}
                    </div>
                  </div>

                  {/* Prescriber & Dates */}
                  <div className="mt-3 space-y-1 text-xs text-[#6B7A6F]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#26362B]">Prescritor:</span>
                      <span>{m.expand?.medico?.nome || 'Não especificado'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {m.data_prescricao && (
                        <span>
                          Prescrito em: <strong>{formatDate(m.data_prescricao)}</strong>
                        </span>
                      )}
                      {m.data_inicio && (
                        <span>
                          Início: <strong>{formatDate(m.data_inicio)}</strong>
                        </span>
                      )}
                      {m.data_fim && (
                        <span>
                          Término: <strong>{formatDate(m.data_fim)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Receita Anexada */}
                  <div className="mt-3 pt-3 border-t border-[#D9E2D4]/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-[#4C7A5A]" />
                      <span className="font-medium text-[#26362B]">Receita médica:</span>
                      <span className="text-[#6B7A6F]">
                        {m.receita_arquivo ? 'Arquivo anexado' : 'Sem receita anexada'}
                      </span>
                    </div>
                    {receitaUrl && (
                      <a
                        href={receitaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4C7A5A] hover:underline flex items-center gap-1 font-semibold text-xs"
                      >
                        <span>Ver receita</span> <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Identificação de campos incompletos sem inventar valores */}
                  {incompleteList.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Dados cadastrais incompletos:</span>
                        <span>{incompleteList.join(', ')}.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="mt-5 pt-4 border-t border-[#D9E2D4]/50 space-y-3">
                  {/* Status transitions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase text-[#6B7A6F] mr-1">
                      Mudar status:
                    </span>
                    {!isEmUso && (
                      <button
                        type="button"
                        onClick={() => handleStatusChangeRequest(m, 'em uso')}
                        className="px-2.5 py-1 rounded-full bg-[#DCE9D4] hover:bg-[#A8C3A0] text-[#26362B] text-xs font-semibold transition cursor-pointer"
                      >
                        Em uso
                      </button>
                    )}
                    {!isPausado && (
                      <button
                        type="button"
                        onClick={() => handleStatusChangeRequest(m, 'pausado')}
                        className="px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition cursor-pointer"
                      >
                        Pausar
                      </button>
                    )}
                    {!isSuspenso && (
                      <button
                        type="button"
                        onClick={() => handleStatusChangeRequest(m, 'suspenso')}
                        className="px-2.5 py-1 rounded-full bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold transition cursor-pointer"
                      >
                        Suspender
                      </button>
                    )}
                    {!isConcluido && (
                      <button
                        type="button"
                        onClick={() => handleStatusChangeRequest(m, 'concluído')}
                        className="px-2.5 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold transition cursor-pointer"
                      >
                        Concluir
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditForm(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F4EF] hover:bg-[#E7F0E3] text-[#26362B] text-xs font-medium border border-[#D9E2D4] transition cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3 text-[#4C7A5A]" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => promptDelete(m)}
                        title="Excluir medicamento"
                        className="p-1.5 rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expand History Button */}
                    <button
                      onClick={() => toggleHistory(m.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C7A5A] hover:underline cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Auditoria e histórico</span>
                      {isHistoryOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Expandable History Section */}
                  {isHistoryOpen && (
                    <div className="mt-3 pt-3 border-t border-[#D9E2D4] bg-[#F6F4EF]/70 p-3.5 rounded-2xl animate-fade-in space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-[#26362B] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#4C7A5A]" />
                          <span>Registro imutável de auditoria</span>
                        </h4>
                        <span className="text-[10px] text-[#6B7A6F]">
                          {historyList.length} registro(s)
                        </span>
                      </div>

                      {loadingHistory[m.id] ? (
                        <p className="text-xs text-[#6B7A6F] italic">Carregando auditoria...</p>
                      ) : historyList.length === 0 ? (
                        <p className="text-xs text-[#6B7A6F] italic">
                          Nenhuma alteração registrada ainda para este medicamento.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {historyList.map((h) => (
                            <div
                              key={h.id}
                              className="text-xs bg-white p-3 rounded-xl border border-[#D9E2D4] space-y-1 shadow-2xs"
                            >
                              <div className="flex items-center justify-between text-[11px] text-[#6B7A6F]">
                                <span className="font-semibold text-[#4C7A5A]">
                                  {formatDateTime(h.data_hora || h.data || h.created)}
                                </span>
                                <span>Por: {h.usuario_responsavel || 'Usuário'}</span>
                              </div>

                              {h.campo_alterado && (
                                <p className="text-xs font-semibold text-[#26362B]">
                                  {h.campo_alterado}
                                </p>
                              )}

                              {(h.valor_anterior || h.novo_valor) && (
                                <div className="text-[11px] text-[#6B7A6F] bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                  {h.valor_anterior && (
                                    <p>
                                      <span className="font-medium text-red-700">Anterior:</span>{' '}
                                      {h.valor_anterior}
                                    </p>
                                  )}
                                  {h.novo_valor && (
                                    <p>
                                      <span className="font-medium text-[#4C7A5A]">Novo:</span>{' '}
                                      {h.novo_valor}
                                    </p>
                                  )}
                                </div>
                              )}

                              <p className="text-xs text-[#26362B] italic pl-2 border-l-2 border-[#4C7A5A]">
                                Motivo: "{h.motivo}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
                  {editingMed ? 'Editar medicamento' : 'Novo medicamento'}
                </h2>
                <p className="text-xs text-[#6B7A6F]">
                  Preencha os dados do prontuário (apenas o nome é obrigatório)
                </p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Section 1: Identificação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Nome do medicamento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Losartana Potássica"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Princípio ativo
                  </label>
                  <input
                    type="text"
                    value={principioAtivo}
                    onChange={(e) => setPrincipioAtivo(e.target.value)}
                    placeholder="Ex.: Losartana Potássica, Colecalciferol"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              {/* Section 2: Apresentação, Concentração, Dose */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Apresentação / Forma
                  </label>
                  <select
                    value={forma}
                    onChange={(e) => {
                      setForma(e.target.value as FormaFarmaceutica)
                      if (!apresentacao) setApresentacao(e.target.value)
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  >
                    {FORMAS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Concentração
                  </label>
                  <input
                    type="text"
                    value={concentracao}
                    onChange={(e) => {
                      setConcentracao(e.target.value)
                      if (!dosagem) setDosagem(e.target.value)
                    }}
                    placeholder="Ex.: 50 mg, 2.000 UI, 5 mg/ml"
                    className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Laboratório (opcional)
                  </label>
                  <input
                    type="text"
                    value={laboratorio}
                    onChange={(e) => setLaboratorio(e.target.value)}
                    placeholder="Ex.: EMS, Eurofarma, Medley"
                    className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              {/* Section 3: Posologia prescrita */}
              <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] space-y-3">
                <span className="text-xs font-semibold text-[#26362B] uppercase tracking-wider block">
                  Posologia e Prescrição Médica
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Dose prescrita
                    </label>
                    <input
                      type="text"
                      value={dosePrescrita}
                      onChange={(e) => setDosePrescrita(e.target.value)}
                      placeholder="Ex.: 1, 2, 10"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Unidade da dose
                    </label>
                    <input
                      type="text"
                      value={unidadeDose}
                      onChange={(e) => setUnidadeDose(e.target.value)}
                      placeholder="Ex.: comprimido, gotas, ml"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Via de administração
                    </label>
                    <select
                      value={viaAdministracao}
                      onChange={(e) => setViaAdministracao(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    >
                      {VIAS_ADMINISTRACAO.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Frequência
                    </label>
                    <input
                      type="text"
                      value={frequencia}
                      onChange={(e) => setFrequencia(e.target.value)}
                      placeholder="Ex.: 12 em 12 horas, 1 vez ao dia, se dor"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#26362B] mb-1">
                      Tipo de uso
                    </label>
                    <select
                      value={tipoUso}
                      onChange={(e) => setTipoUso(e.target.value as TipoUsoMedicamento)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    >
                      <option value="contínuo">Uso Contínuo</option>
                      <option value="temporário">Uso Temporário</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1">
                    Instruções da prescrição
                  </label>
                  <textarea
                    rows={2}
                    value={instrucoesPrescricao}
                    onChange={(e) => setInstrucoesPrescricao(e.target.value)}
                    placeholder="Ex.: Tomar em jejum 30 min antes do café; evitar laticínios..."
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
              </div>

              {/* Section 4: Médico, Datas, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Médico prescritor
                  </label>
                  <select
                    value={medicoId}
                    onChange={(e) => setMedicoId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  >
                    <option value="">Nenhum médico selecionado</option>
                    {medicos.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.nome} — {doc.especialidade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Data da prescrição
                  </label>
                  <input
                    type="date"
                    value={dataPrescricao}
                    onChange={(e) => setDataPrescricao(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Status inicial / atual
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusMedicamento)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none capitalize"
                  >
                    <option value="em uso">Em uso</option>
                    <option value="pausado">Pausado</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="concluído">Concluído</option>
                  </select>
                </div>
              </div>

              {/* Section 5: Horários e Anexo de Receita */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Horários */}
                <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]">
                  <label className="block text-xs font-semibold text-[#26362B] mb-2 uppercase tracking-wider">
                    Horários de tomada
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {horarios.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-[#26362B] text-xs font-semibold border border-[#D9E2D4]"
                      >
                        <Clock className="w-3 h-3 text-[#4C7A5A]" />
                        <span>{h}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHorario(h)}
                          className="text-red-500 hover:text-red-700 ml-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={novoHorario}
                      onChange={(e) => setNovoHorario(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddHorario}
                      className="px-3 py-1.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-medium cursor-pointer"
                    >
                      + Horário
                    </button>
                  </div>
                </div>

                {/* Receita Anexada */}
                <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]">
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Anexar receita médica (PDF/Imagem)
                  </label>
                  <input
                    ref={receitaInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                    onChange={(e) => setReceitaFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[#6B7A6F] file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#4C7A5A] file:text-white hover:file:bg-[#3F664C] cursor-pointer"
                  />
                  {editingMed?.receita_arquivo && !receitaFile && (
                    <p className="text-[11px] text-[#4C7A5A] mt-1.5 font-medium">
                      Já possui arquivo anexado. Envie outro para substituir.
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
                    : editingMed
                      ? 'Revisar e salvar'
                      : 'Cadastrar medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Modal (Registro Imutável de Auditoria) */}
      {auditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-7 shadow-2xl border border-[#D9E2D4] space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                  Auditoria de Alteração de Medicamento
                </h3>
                <p className="text-xs text-[#6B7A6F]">
                  Registro imutável no prontuário com campo alterado, valores e motivo
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] text-xs space-y-1.5">
              <p>
                <span className="font-semibold text-[#26362B]">Operação:</span> {auditFieldLabel}
              </p>
              {auditOldValue && (
                <p className="text-gray-600">
                  <span className="font-semibold text-[#26362B]">Valor anterior:</span>{' '}
                  {auditOldValue}
                </p>
              )}
              {auditNewValue && (
                <p className="text-[#4C7A5A]">
                  <span className="font-semibold text-[#26362B]">Novo valor:</span> {auditNewValue}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                Motivo da alteração / suspensão{' '}
                <span className="text-red-500">* (obrigatório)</span>
              </label>
              <textarea
                rows={3}
                required
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="Ex.: Ajuste de dosagem determinado pela Dra. Ana Beatriz após ecocardiograma; remissão de sintomas; reação adversa..."
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
              <p className="text-[11px] text-[#6B7A6F] mt-1">
                Ficará gravado permanentemente na linha do tempo clínica com data, hora e
                responsável.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuditModalOpen(false)
                  setPendingAction(null)
                }}
                className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F]"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={saving || !auditReason.trim()}
                onClick={confirmAuditAction}
                className="px-5 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? 'Gravando auditoria...' : 'Confirmar e gravar no prontuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && medToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D9E2D4] text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Excluir medicamento?
              </h3>
              <p className="text-xs text-[#6B7A6F] mt-1">
                Atenção: remover <strong>{medToDelete.nome}</strong> apagará as definições do
                medicamento. Para manter o histórico intacto, prefira marcar como{' '}
                <strong>Suspenso</strong> ou <strong>Concluído</strong>.
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
