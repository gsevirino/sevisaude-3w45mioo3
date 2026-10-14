import { useState, useEffect, useCallback } from 'react'
import {
  getConsultas,
  createConsulta,
  updateConsulta,
  deleteConsulta,
  getMedicos,
} from '@/services/healthService'
import type { Consulta, Medico, StatusConsulta, TipoConsulta } from '@/types/health'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
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
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const STATUS_FILTERS: (StatusConsulta | 'Todas')[] = ['Todas', 'Agendada', 'Realizada', 'Cancelada']
const TIPOS: TipoConsulta[] = ['Presencial', 'Teleconsulta', 'Domiciliar']

export default function Consultas() {
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)

  useRealtime('consultas', () => triggerRefresh())

  // Search & Filter
  const [selectedStatus, setSelectedStatus] = useState<StatusConsulta | 'Todas'>('Todas')
  const [searchQuery, setSearchQuery] = useState('')

  // Expand notes
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})

  // Form Modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingConsulta, setEditingConsulta] = useState<Consulta | null>(null)
  const [saving, setSaving] = useState(false)

  // Fields
  const [medicoId, setMedicoId] = useState('')
  const [data, setData] = useState('')
  const [horario, setHorario] = useState('09:00')
  const [tipo, setTipo] = useState<TipoConsulta>('Presencial')
  const [local, setLocal] = useState('')
  const [status, setStatus] = useState<StatusConsulta>('Agendada')
  const [anotacoes, setAnotacoes] = useState('')

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [consultaToDelete, setConsultaToDelete] = useState<Consulta | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [cons, docs] = await Promise.all([getConsultas(), getMedicos()])
      setConsultas(cons)
      setMedicos(docs)
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
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const openNewForm = () => {
    setEditingConsulta(null)
    setMedicoId(medicos[0]?.id || '')
    setData(new Date().toISOString().split('T')[0])
    setHorario('09:30')
    setTipo('Presencial')
    setLocal('')
    setStatus('Agendada')
    setAnotacoes('')
    setFormOpen(true)
  }

  const openEditForm = (c: Consulta) => {
    setEditingConsulta(c)
    setMedicoId(c.medico)
    setData(c.data ? c.data.split('T')[0] : '')
    setHorario(c.horario || '09:00')
    setTipo(c.tipo)
    setLocal(c.local || '')
    setStatus(c.status)
    setAnotacoes(c.anotacoes || '')
    setFormOpen(true)
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

    if (status === 'Realizada' && !anotacoes.trim()) {
      toast({
        title: 'Anotações obrigatórias',
        description:
          'Quando a consulta está Realizada, é obrigatório registrar "O que foi tratado".',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (editingConsulta) {
        await updateConsulta(editingConsulta.id, {
          medico: medicoId,
          data,
          horario,
          tipo,
          local: local.trim() || undefined,
          status,
          anotacoes: anotacoes.trim() || undefined,
        })
        toast({
          title: 'Consulta atualizada!',
          description: 'Alterações gravadas com sucesso.',
        })
      } else {
        await createConsulta({
          medico: medicoId,
          data,
          horario,
          tipo,
          local: local.trim() || undefined,
          status,
          anotacoes: anotacoes.trim() || undefined,
        })
        toast({
          title: 'Consulta agendada/cadastrada!',
          description: 'A consulta foi salva no seu prontuário.',
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
        description: 'Registro removido com sucesso.',
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

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    const clean = iso.split('T')[0]
    const [y, m, d] = clean.split('-')
    return `${d}/${m}/${y}`
  }

  // Filtered list
  const filteredConsultas = consultas.filter((c) => {
    const matchesStatus = selectedStatus === 'Todas' || c.status === selectedStatus
    const query = searchQuery.toLowerCase().trim()
    const docName = c.expand?.medico?.nome?.toLowerCase() || ''
    const spec = c.expand?.medico?.especialidade?.toLowerCase() || ''
    const localStr = c.local?.toLowerCase() || ''
    const notesStr = c.anotacoes?.toLowerCase() || ''
    const matchesSearch =
      !query ||
      docName.includes(query) ||
      spec.includes(query) ||
      localStr.includes(query) ||
      notesStr.includes(query)

    return matchesStatus && matchesSearch
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
            Agendamentos, orientações médicas e histórico detalhado do que foi tratado
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova consulta</span>
        </button>
      </div>

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
            placeholder="Buscar médico, notas ou local..."
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
              : 'Registre seus próximos atendimentos para nunca perder um retorno médico.'}
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
            const isNotesExpanded = !!expandedNotes[c.id]
            const isAgendada = c.status === 'Agendada'

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
                                ? 'bg-amber-100 text-amber-900 animate-pulse'
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
                          {formatDate(c.data)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#4C7A5A]" />
                          {c.horario}
                        </span>
                        {c.local && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#4C7A5A]" />
                            {c.local}
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
                      title="Editar consulta"
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

                {/* Anotações / O que foi tratado (Blockquote style) */}
                {c.anotacoes ? (
                  <div className="mt-4 pt-4 border-t border-[#D9E2D4]/50">
                    <button
                      onClick={() => toggleNotes(c.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4C7A5A] hover:underline cursor-pointer mb-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>O que foi tratado nesta consulta</span>
                      {isNotesExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isNotesExpanded && (
                      <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]/80 text-[#26362B] animate-fade-in">
                        <blockquote className="font-serif italic text-sm leading-relaxed text-[#385942] pl-3 border-l-2 border-[#4C7A5A]">
                          "{c.anotacoes}"
                        </blockquote>
                      </div>
                    )}
                  </div>
                ) : (
                  c.status === 'Realizada' && (
                    <div className="mt-4 pt-3 border-t border-[#D9E2D4]/50 text-xs text-amber-800 italic">
                      Nenhuma anotação registrada ainda para esta consulta realizada.
                    </div>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD Modal Form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#D9E2D4] relative my-8 animate-scale-in">
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
                  {editingConsulta ? 'Editar consulta' : 'Nova consulta'}
                </h2>
                <p className="text-xs text-[#6B7A6F]">
                  Mantenha a data, médico e as anotações do atendimento organizados
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Médico / Profissional <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={medicoId}
                  onChange={(e) => setMedicoId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                >
                  <option value="">Selecione o profissional...</option>
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
                    Data da consulta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Horário <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Tipo de atendimento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoConsulta)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  >
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Status da consulta <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusConsulta)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  >
                    <option value="Agendada">Agendada</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Local / Plataforma
                </label>
                <input
                  type="text"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="Ex.: Consultório Jardins - Sala 402 ou Google Meet"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#26362B] uppercase tracking-wider">
                    O que foi tratado / Anotações{' '}
                    {status === 'Realizada' && (
                      <span className="text-red-500">* (obrigatório)</span>
                    )}
                  </label>
                  {status === 'Realizada' && (
                    <span className="text-[10px] text-[#4C7A5A] font-semibold">
                      Obrigatório para consultas realizadas
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  required={status === 'Realizada'}
                  value={anotacoes}
                  onChange={(e) => setAnotacoes(e.target.value)}
                  placeholder="Ex.: Queixas apresentadas, orientações do médico, medicações ajustadas, exames solicitados..."
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
                    : editingConsulta
                      ? 'Salvar alterações'
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
