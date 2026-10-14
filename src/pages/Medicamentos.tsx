import { useState, useEffect, useCallback } from 'react'
import {
  getMedicamentos,
  createMedicamento,
  updateMedicamento,
  deleteMedicamento,
  getAlteracoesMedicamento,
  getMedicos,
} from '@/services/healthService'
import type { Medicamento, Medico, FormaFarmaceutica, AlteracaoMedicamento } from '@/types/health'
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
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const FORMAS: FormaFarmaceutica[] = [
  'comprimido',
  'cápsula',
  'xarope',
  'solução',
  'injetável',
  'creme',
  'outro',
]

export default function Medicamentos() {
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)

  // Realtime
  useRealtime('medicamentos', () => triggerRefresh())
  useRealtime('alteracoes_medicamentos', () => triggerRefresh())

  // Modal form states
  const [formOpen, setFormOpen] = useState(false)
  const [editingMed, setEditingMed] = useState<Medicamento | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [nome, setNome] = useState('')
  const [dosagem, setDosagem] = useState('')
  const [forma, setForma] = useState<FormaFarmaceutica>('comprimido')
  const [laboratorio, setLaboratorio] = useState('')
  const [medicoId, setMedicoId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horarios, setHorarios] = useState<string[]>(['08:00'])
  const [observacoes, setObservacoes] = useState('')
  const [novoHorario, setNovoHorario] = useState('12:00')

  // Edit / End reason modal
  const [reasonModalOpen, setReasonModalOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState<'edit' | 'end' | 'reactivate'>('edit')
  const [reasonText, setReasonText] = useState('')
  const [targetMedForAction, setTargetMedForAction] = useState<Medicamento | null>(null)

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
    setDosagem('')
    setForma('comprimido')
    setLaboratorio('')
    setMedicoId(medicos[0]?.id || '')
    setDataInicio(new Date().toISOString().split('T')[0])
    setDataFim('')
    setHorarios(['08:00'])
    setObservacoes('')
    setFormOpen(true)
  }

  const openEditForm = (m: Medicamento) => {
    setEditingMed(m)
    setNome(m.nome)
    setDosagem(m.dosagem)
    setForma(m.forma)
    setLaboratorio(m.laboratorio || '')
    setMedicoId(m.medico || '')
    setDataInicio(m.data_inicio ? m.data_inicio.split('T')[0] : '')
    setDataFim(m.data_fim ? m.data_fim.split('T')[0] : '')
    setHorarios(Array.isArray(m.horarios) && m.horarios.length > 0 ? m.horarios : ['08:00'])
    setObservacoes(m.observacoes || '')
    setFormOpen(true)
  }

  const handleAddHorario = () => {
    if (novoHorario && !horarios.includes(novoHorario)) {
      setHorarios([...horarios, novoHorario].sort())
    }
  }

  const handleRemoveHorario = (time: string) => {
    if (horarios.length <= 1) {
      toast({
        title: 'Horário obrigatório',
        description: 'Mantenha pelo menos um horário de administração.',
        variant: 'destructive',
      })
      return
    }
    setHorarios(horarios.filter((h) => h !== time))
  }

  // Pre-save check: if editing, ask for reason
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !dosagem.trim() || !dataInicio) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome, dosagem e data de início são necessários.',
        variant: 'destructive',
      })
      return
    }

    if (editingMed) {
      // Prompt reason modal before saving edit
      setReasonAction('edit')
      setReasonText('')
      setReasonModalOpen(true)
    } else {
      // Direct create
      setSaving(true)
      try {
        await createMedicamento({
          nome: nome.trim(),
          dosagem: dosagem.trim(),
          forma,
          laboratorio: laboratorio.trim(),
          medico: medicoId || undefined,
          data_inicio: dataInicio,
          data_fim: dataFim || undefined,
          horarios,
          observacoes: observacoes.trim(),
          status: 'ativo',
        })
        toast({
          title: 'Medicamento cadastrado!',
          description: `${nome} foi incluído ao seu prontuário.`,
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

  const handleConfirmReason = async () => {
    if (reasonAction === 'edit' && editingMed) {
      setSaving(true)
      try {
        await updateMedicamento(
          editingMed.id,
          {
            nome: nome.trim(),
            dosagem: dosagem.trim(),
            forma,
            laboratorio: laboratorio.trim(),
            medico: medicoId || undefined,
            data_inicio: dataInicio,
            data_fim: dataFim || undefined,
            horarios,
            observacoes: observacoes.trim(),
          },
          reasonText.trim() || 'Alteração de dados cadastrais/posologia',
        )
        toast({
          title: 'Medicamento atualizado!',
          description: 'Alterações e histórico registrados com sucesso.',
        })
        setReasonModalOpen(false)
        setFormOpen(false)
        triggerRefresh()
      } catch (err: any) {
        toast({
          title: 'Erro ao atualizar',
          description: err?.message || 'Tente novamente.',
          variant: 'destructive',
        })
      } finally {
        setSaving(false)
      }
    } else if (reasonAction === 'end' && targetMedForAction) {
      setSaving(true)
      try {
        await updateMedicamento(
          targetMedForAction.id,
          {
            status: 'encerrado',
            data_fim: new Date().toISOString().split('T')[0],
          },
          reasonText.trim() || 'Tratamento encerrado pelo paciente/médico',
        )
        toast({
          title: 'Medicamento encerrado',
          description: `${targetMedForAction.nome} foi marcado como encerrado.`,
        })
        setReasonModalOpen(false)
        triggerRefresh()
      } catch (err: any) {
        toast({
          title: 'Erro ao encerrar',
          description: err?.message || 'Tente novamente.',
          variant: 'destructive',
        })
      } finally {
        setSaving(false)
      }
    } else if (reasonAction === 'reactivate' && targetMedForAction) {
      setSaving(true)
      try {
        await updateMedicamento(
          targetMedForAction.id,
          {
            status: 'ativo',
            data_fim: undefined,
          },
          reasonText.trim() || 'Medicamento reativado',
        )
        toast({
          title: 'Medicamento reativado!',
          description: `${targetMedForAction.nome} está ativo novamente.`,
        })
        setReasonModalOpen(false)
        triggerRefresh()
      } catch (err: any) {
        toast({
          title: 'Erro ao reativar',
          description: err?.message || 'Tente novamente.',
          variant: 'destructive',
        })
      } finally {
        setSaving(false)
      }
    }
  }

  const promptEndMedication = (m: Medicamento) => {
    setTargetMedForAction(m)
    setReasonAction('end')
    setReasonText('')
    setReasonModalOpen(true)
  }

  const promptReactivateMedication = (m: Medicamento) => {
    setTargetMedForAction(m)
    setReasonAction('reactivate')
    setReasonText('')
    setReasonModalOpen(true)
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
        description: 'Não foi possível buscar as alterações anteriores.',
        variant: 'destructive',
      })
    } finally {
      setLoadingHistory((prev) => ({ ...prev, [medId]: false }))
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    const clean = iso.split('T')[0]
    const [y, m, d] = clean.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Meus medicamentos
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Controle de doses, horários, médicos prescritores e histórico detalhado de alterações
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

      {/* Medication Cards List */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
          <p className="text-sm font-serif italic text-[#26362B]">
            Carregando seus medicamentos...
          </p>
        </div>
      ) : medicamentos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#D9E2D4] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8" />
          </div>
          <h3 className="font-serif italic text-xl text-[#26362B] font-medium">
            Nenhum medicamento cadastrado
          </h3>
          <p className="text-xs text-[#6B7A6F] mt-2 leading-relaxed">
            Cadastre os remédios e suplementos que você toma no dia a dia para acompanhar horários e
            manter seu prontuário em dia.
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
          {medicamentos.map((m) => {
            const isAtivo = m.status === 'ativo'
            const isHistoryOpen = !!expandedHistory[m.id]
            const historyList = expandedHistory[m.id] || []
            const horariosList = Array.isArray(m.horarios) ? m.horarios : []

            return (
              <div
                key={m.id}
                className={`bg-white rounded-3xl p-6 border transition-all duration-200 shadow-sm hover:shadow-md ${
                  isAtivo ? 'border-[#D9E2D4]' : 'border-gray-200 opacity-85 bg-gray-50/50'
                }`}
              >
                {/* Top Row: Name + Status */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-serif italic text-2xl text-[#26362B] font-semibold leading-tight">
                      {m.nome}
                    </h3>
                    <p className="text-sm text-[#4C7A5A] font-medium mt-0.5">
                      {m.dosagem} — {m.forma}
                      {m.laboratorio ? ` • Lab. ${m.laboratorio}` : ''}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                      isAtivo
                        ? 'bg-[#DCE9D4] text-[#26362B] ring-1 ring-[#A8C3A0]/60'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isAtivo ? 'Ativo' : 'Encerrado'}
                  </span>
                </div>

                {/* Schedules */}
                <div className="mt-4 pt-4 border-t border-[#D9E2D4]/50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7A6F] uppercase tracking-wider mb-2">
                    <Clock className="w-3.5 h-3.5 text-[#4C7A5A]" />
                    <span>Horários de tomada:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {horariosList.length > 0 ? (
                      horariosList.map((h) => (
                        <span
                          key={h}
                          className="px-3 py-1 rounded-full bg-[#E7F0E3] text-[#26362B] text-xs font-semibold border border-[#DCE9D4]"
                        >
                          {h}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#6B7A6F] italic">Nenhum horário definido</span>
                    )}
                  </div>
                </div>

                {/* Details: Prescriber, Dates, Notes */}
                <div className="mt-4 space-y-1.5 text-xs text-[#6B7A6F]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[#26362B]">Prescritor:</span>
                    <span>{m.expand?.medico?.nome || 'Não especificado'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#4C7A5A]" />
                    <span>
                      Início em: <strong>{formatDate(m.data_inicio)}</strong>
                      {m.data_fim ? ` • Término: ${formatDate(m.data_fim)}` : ''}
                    </span>
                  </div>
                  {m.observacoes && (
                    <p className="mt-2 text-xs text-[#26362B] bg-[#F6F4EF] p-2.5 rounded-xl border border-[#D9E2D4]/60 italic">
                      "{m.observacoes}"
                    </p>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="mt-6 pt-4 border-t border-[#D9E2D4]/50 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(m)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F4EF] hover:bg-[#E7F0E3] text-[#26362B] text-xs font-medium border border-[#D9E2D4] transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-[#4C7A5A]" />
                      <span>Alterar</span>
                    </button>

                    {isAtivo ? (
                      <button
                        onClick={() => promptEndMedication(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-medium border border-amber-200 transition cursor-pointer"
                      >
                        <Power className="w-3 h-3 text-amber-700" />
                        <span>Encerrar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => promptReactivateMedication(m)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#DCE9D4] hover:bg-[#A8C3A0] text-[#26362B] text-xs font-medium border border-[#A8C3A0] transition cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-[#4C7A5A]" />
                        <span>Reativar</span>
                      </button>
                    )}

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
                    <span>Histórico</span>
                    {isHistoryOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Expandable History Section */}
                {isHistoryOpen && (
                  <div className="mt-4 pt-4 border-t border-[#D9E2D4] bg-[#F6F4EF]/60 p-3.5 rounded-2xl animate-fade-in">
                    <h4 className="text-xs font-semibold text-[#26362B] mb-2 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#4C7A5A]" />
                      <span>Histórico de alterações e motivos</span>
                    </h4>
                    {loadingHistory[m.id] ? (
                      <p className="text-xs text-[#6B7A6F] italic">Carregando histórico...</p>
                    ) : historyList.length === 0 ? (
                      <p className="text-xs text-[#6B7A6F] italic">
                        Nenhuma alteração registrada ainda para este medicamento.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {historyList.map((h) => (
                          <div
                            key={h.id}
                            className="text-xs bg-white p-2.5 rounded-xl border border-[#D9E2D4] space-y-0.5"
                          >
                            <span className="font-semibold text-[#4C7A5A] block">
                              {formatDate(h.data || h.created)}
                            </span>
                            <p className="text-[#26362B] italic">"{h.motivo}"</p>
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
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-[#D9E2D4] relative my-8 animate-scale-in">
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
                  Preencha os dados do tratamento para manter sua rotina em dia
                </p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
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
                    Dosagem <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dosagem}
                    onChange={(e) => setDosagem(e.target.value)}
                    placeholder="Ex.: 50 mg, 1 comprimido, 10 ml"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Forma farmacêutica <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={forma}
                    onChange={(e) => setForma(e.target.value as FormaFarmaceutica)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  >
                    {FORMAS.map((f) => (
                      <option key={f} value={f}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </option>
                    ))}
                  </select>
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
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Médico prescritor
                </label>
                <select
                  value={medicoId}
                  onChange={(e) => setMedicoId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                >
                  <option value="">Nenhum médico selecionado</option>
                  {medicos.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.nome} — {doc.especialidade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Data de início <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Data de término (opcional)
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              {/* Multiple Schedule Pickers */}
              <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]">
                <label className="block text-xs font-semibold text-[#26362B] mb-2 uppercase tracking-wider">
                  Horários de tomada diários <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {horarios.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#26362B] text-xs font-semibold border border-[#D9E2D4] shadow-xs"
                    >
                      <Clock className="w-3 h-3 text-[#4C7A5A]" />
                      <span>{h}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHorario(h)}
                        className="text-red-500 hover:text-red-700 ml-1 cursor-pointer"
                        title="Remover horário"
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
                    className="px-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-white text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                  <button
                    type="button"
                    onClick={handleAddHorario}
                    className="px-4 py-1.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-medium cursor-pointer"
                  >
                    + Adicionar horário
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Observações e recomendações
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: Tomar em jejum com água abundante; evitar laticínios 2h antes..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                />
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
                      ? 'Salvar alterações'
                      : 'Cadastrar medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reason Modal (Motivo da alteração / encerramento) */}
      {reasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#D9E2D4] space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                  {reasonAction === 'edit'
                    ? 'Motivo da alteração'
                    : reasonAction === 'end'
                      ? 'Motivo do encerramento'
                      : 'Motivo da reativação'}
                </h3>
                <p className="text-xs text-[#6B7A6F]">
                  Ficará gravado no prontuário para consultas futuras
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                Descreva o motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={
                  reasonAction === 'edit'
                    ? 'Ex.: Troca de dose prescrita pelo Dr. Rafael após retorno; redução de frequência.'
                    : 'Ex.: Tratamento finalizado com sucesso; remissão de sintomas.'
                }
                className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F]"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={saving || !reasonText.trim()}
                onClick={handleConfirmReason}
                className="px-5 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? 'Registrando...' : 'Confirmar e salvar'}
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
                Tem certeza? Esta ação não pode ser desfeita e removerá todo o histórico de{' '}
                <strong>{medToDelete.nome}</strong>.
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
