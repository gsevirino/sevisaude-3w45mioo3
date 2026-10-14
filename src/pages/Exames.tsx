import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getExames,
  createExame,
  updateExame,
  deleteExame,
  getMedicos,
  getFileUrl,
} from '@/services/healthService'
import type { Exame, Medico, StatusExame, TipoExame } from '@/types/health'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  FileSearch,
  Plus,
  Calendar,
  Upload,
  ExternalLink,
  FileText,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Loader2,
  Paperclip,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const TIPOS_EXAME: TipoExame[] = [
  'Sangue',
  'Imagem',
  'Urina',
  'Fezes',
  'Cardíaco',
  'Preventivo',
  'Outro',
]
const STATUS_EXAME: StatusExame[] = ['Solicitado', 'Em análise', 'Concluído']

export default function Exames() {
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const [exames, setExames] = useState<Exame[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)

  useRealtime('exames', () => triggerRefresh())

  // Filter
  const [activeTab, setActiveTab] = useState<'Todos' | StatusExame>('Todos')

  // Main CRUD Modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingExame, setEditingExame] = useState<Exame | null>(null)
  const [saving, setSaving] = useState(false)

  // Fields
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoExame>('Sangue')
  const [medicoId, setMedicoId] = useState('')
  const [dataSolicitado, setDataSolicitado] = useState('')
  const [dataRealizado, setDataRealizado] = useState('')
  const [status, setStatus] = useState<StatusExame>('Solicitado')
  const [observacoes, setObservacoes] = useState('')

  // Files
  const [pedidoFile, setPedidoFile] = useState<File | null>(null)
  const [resultadoFile, setResultadoFile] = useState<File | null>(null)

  // Quick "Anexar resultado" Modal
  const [quickResultModalOpen, setQuickResultModalOpen] = useState(false)
  const [targetExameForQuickResult, setTargetExameForQuickResult] = useState<Exame | null>(null)
  const [quickResultFile, setQuickResultFile] = useState<File | null>(null)
  const [quickRealizadoDate, setQuickRealizadoDate] = useState('')
  const [uploadingQuick, setUploadingQuick] = useState(false)

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [exameToDelete, setExameToDelete] = useState<Exame | null>(null)

  const pedidoInputRef = useRef<HTMLInputElement>(null)
  const resultadoInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    try {
      const [exs, docs] = await Promise.all([getExames(), getMedicos()])
      setExames(exs)
      setMedicos(docs)
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
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const openNewForm = () => {
    setEditingExame(null)
    setNome('')
    setTipo('Sangue')
    setMedicoId(medicos[0]?.id || '')
    setDataSolicitado(new Date().toISOString().split('T')[0])
    setDataRealizado('')
    setStatus('Solicitado')
    setObservacoes('')
    setPedidoFile(null)
    setResultadoFile(null)
    setFormOpen(true)
  }

  const openEditForm = (e: Exame) => {
    setEditingExame(e)
    setNome(e.nome)
    setTipo(e.tipo)
    setMedicoId(e.medico)
    setDataSolicitado(e.data_solicitado ? e.data_solicitado.split('T')[0] : '')
    setDataRealizado(e.data_realizado ? e.data_realizado.split('T')[0] : '')
    setStatus(e.status)
    setObservacoes(e.observacoes || '')
    setPedidoFile(null)
    setResultadoFile(null)
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !medicoId || !dataSolicitado) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome do exame, médico solicitante e data são necessários.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('nome', nome.trim())
      formData.append('tipo', tipo)
      formData.append('medico', medicoId)
      formData.append('data_solicitado', dataSolicitado)
      if (dataRealizado) formData.append('data_realizado', dataRealizado)
      formData.append('status', status)
      if (observacoes.trim()) formData.append('observacoes', observacoes.trim())

      if (pedidoFile) formData.append('pedido_arquivo', pedidoFile)
      if (resultadoFile) formData.append('resultado_arquivo', resultadoFile)

      if (editingExame) {
        await updateExame(editingExame.id, formData)
        toast({
          title: 'Exame atualizado!',
          description: 'Dados e arquivos salvos com sucesso.',
        })
      } else {
        await createExame(formData)
        toast({
          title: 'Exame cadastrado!',
          description: `${nome} adicionado ao seu prontuário.`,
        })
      }

      setFormOpen(false)
      triggerRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Verifique os dados ou o tamanho do arquivo (máx. 10MB).',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Quick Upload
  const openQuickResultModal = (e: Exame) => {
    setTargetExameForQuickResult(e)
    setQuickResultFile(null)
    setQuickRealizadoDate(
      e.data_realizado ? e.data_realizado.split('T')[0] : new Date().toISOString().split('T')[0],
    )
    setQuickResultModalOpen(true)
  }

  const handleQuickResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetExameForQuickResult || !quickResultFile) {
      toast({
        title: 'Arquivo obrigatório',
        description: 'Selecione o arquivo com o laudo ou resultado.',
        variant: 'destructive',
      })
      return
    }

    setUploadingQuick(true)
    try {
      const formData = new FormData()
      formData.append('resultado_arquivo', quickResultFile)
      if (quickRealizadoDate) {
        formData.append('data_realizado', quickRealizadoDate)
      }
      formData.append('status', 'Concluído')

      await updateExame(targetExameForQuickResult.id, formData)
      toast({
        title: 'Resultado anexado!',
        description: `O laudo de ${targetExameForQuickResult.nome} foi salvo e o exame marcado como Concluído.`,
      })
      setQuickResultModalOpen(false)
      triggerRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro no upload',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setUploadingQuick(false)
    }
  }

  const promptDelete = (e: Exame) => {
    setExameToDelete(e)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!exameToDelete) return
    setSaving(true)
    try {
      await deleteExame(exameToDelete.id)
      toast({
        title: 'Exame excluído',
        description: 'Registro e arquivos removidos com sucesso.',
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

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    const clean = iso.split('T')[0]
    const [y, m, d] = clean.split('-')
    return `${d}/${m}/${y}`
  }

  const filteredExames =
    activeTab === 'Todos' ? exames : exames.filter((e) => e.status === activeTab)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Exames
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Acompanhe pedidos médicos, anexe resultados em PDF/imagens e consulte históricos
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo exame</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D9E2D4] pb-2 overflow-x-auto">
        {(['Todos', 'Solicitado', 'Em análise', 'Concluído'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
              activeTab === tab
                ? 'bg-[#5B9A8B] text-white shadow-xs'
                : 'bg-white text-[#6B7A6F] hover:bg-[#E7F0E3] hover:text-[#26362B] border border-[#D9E2D4]'
            }`}
          >
            {tab}
            {tab !== 'Todos' && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                {exames.filter((e) => e.status === tab).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#5B9A8B] animate-spin mx-auto" />
          <p className="text-sm font-serif italic text-[#26362B]">Carregando seus exames...</p>
        </div>
      ) : filteredExames.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#D9E2D4] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#5B9A8B]/15 text-[#5B9A8B] flex items-center justify-center mx-auto mb-4">
            <FileSearch className="w-8 h-8" />
          </div>
          <h3 className="font-serif italic text-xl text-[#26362B] font-medium">
            Nenhum exame nesta categoria
          </h3>
          <p className="text-xs text-[#6B7A6F] mt-2 leading-relaxed">
            Cadastre os pedidos passados pelo seu médico para controlar datas e anexar os laudos
            assim que ficarem prontos.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredExames.map((e) => {
            const pedidoUrl = getFileUrl('exames', e.id, e.pedido_arquivo || '')
            const resultadoUrl = getFileUrl('exames', e.id, e.resultado_arquivo || '')

            return (
              <div
                key={e.id}
                className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top: Name & Status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-serif italic text-xl text-[#26362B] font-semibold leading-tight">
                        {e.nome}
                      </h3>
                      <p className="text-xs font-semibold text-[#5B9A8B] uppercase tracking-wider mt-0.5">
                        {e.tipo} • Solicitante: {e.expand?.medico?.nome || 'Médico'}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                        e.status === 'Concluído'
                          ? 'bg-[#DCE9D4] text-[#26362B]'
                          : e.status === 'Em análise'
                            ? 'bg-teal-100 text-[#5B9A8B]'
                            : 'bg-orange-100 text-orange-900 animate-pulse'
                      }`}
                    >
                      {e.status}
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-xs text-[#6B7A6F] mt-3 pt-3 border-t border-[#D9E2D4]/50">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#5B9A8B]" />
                      Solicitado: <strong>{formatDate(e.data_solicitado)}</strong>
                    </span>
                    {e.data_realizado && (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4C7A5A]" />
                        Realizado: <strong>{formatDate(e.data_realizado)}</strong>
                      </span>
                    )}
                  </div>

                  {e.observacoes && (
                    <p className="mt-3 text-xs text-[#26362B] bg-[#F6F4EF] p-2.5 rounded-xl border border-[#D9E2D4]/50 italic">
                      "{e.observacoes}"
                    </p>
                  )}

                  {/* Files indicators */}
                  <div className="mt-4 pt-3 border-t border-[#D9E2D4]/50 space-y-2">
                    {/* Pedido */}
                    <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#F6F4EF]/70 border border-[#D9E2D4]/50">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-[#5B9A8B]" />
                        <span className="font-medium text-[#26362B]">Pedido médico:</span>
                        <span className="text-[#6B7A6F] truncate max-w-[150px]">
                          {e.pedido_arquivo ? 'Arquivo anexado' : 'Sem anexo'}
                        </span>
                      </div>
                      {pedidoUrl ? (
                        <a
                          href={pedidoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#4C7A5A] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Ver</span> <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </div>

                    {/* Resultado */}
                    <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#F6F4EF]/70 border border-[#D9E2D4]/50">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#4C7A5A]" />
                        <span className="font-medium text-[#26362B]">Resultado / Laudo:</span>
                        <span className="text-[#6B7A6F] truncate max-w-[150px]">
                          {e.resultado_arquivo ? 'Arquivo anexado' : 'Pendente'}
                        </span>
                      </div>
                      {resultadoUrl ? (
                        <a
                          href={resultadoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#4C7A5A] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Abrir laudo</span> <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openQuickResultModal(e)}
                          className="text-[#5B9A8B] hover:text-[#3F664C] hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Anexar agora</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div className="mt-6 pt-4 border-t border-[#D9E2D4]/50 flex items-center justify-between gap-2">
                  {!e.resultado_arquivo ? (
                    <button
                      onClick={() => openQuickResultModal(e)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] text-xs font-semibold border border-[#DCE9D4] transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#4C7A5A]" />
                      <span>Anexar resultado</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#4C7A5A] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resultado disponível
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditForm(e)}
                      className="p-2 rounded-full hover:bg-[#E7F0E3] text-[#4C7A5A] transition cursor-pointer"
                      title="Editar exame"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => promptDelete(e)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                      title="Excluir exame"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Main CRUD Modal Form */}
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
              <div className="w-11 h-11 rounded-2xl bg-[#5B9A8B]/15 text-[#5B9A8B] flex items-center justify-center">
                <FileSearch className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
                  {editingExame ? 'Editar exame' : 'Novo exame'}
                </h2>
                <p className="text-xs text-[#6B7A6F]">
                  Cadastre o pedido e anexe os arquivos em PDF ou imagem
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Nome do exame <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Hemograma Completo, Ecocardiograma"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Tipo de exame <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoExame)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  >
                    {TIPOS_EXAME.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusExame)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  >
                    {STATUS_EXAME.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Médico solicitante <span className="text-red-500">*</span>
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
                    Data do pedido <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataSolicitado}
                    onChange={(e) => setDataSolicitado(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Data de realização (opcional)
                  </label>
                  <input
                    type="date"
                    value={dataRealizado}
                    onChange={(e) => setDataRealizado(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-3 p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4]">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Anexar pedido médico (PDF/Imagem até 10MB)
                  </label>
                  <input
                    ref={pedidoInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                    onChange={(e) => setPedidoFile(e.target.files?.[0] || null)}
                    className="text-xs text-[#6B7A6F] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#4C7A5A] file:text-white hover:file:bg-[#3F664C] cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-[#D9E2D4]/60">
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Anexar resultado / laudo (PDF/Imagem até 10MB)
                  </label>
                  <input
                    ref={resultadoInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                    onChange={(e) => setResultadoFile(e.target.files?.[0] || null)}
                    className="text-xs text-[#6B7A6F] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#5B9A8B] file:text-white hover:file:bg-[#477a6e] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Observações e preparos
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: Jejum de 8h; laboratório Fleury..."
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
                  {saving ? 'Gravando...' : editingExame ? 'Salvar alterações' : 'Cadastrar exame'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Upload Result Modal */}
      {quickResultModalOpen && targetExameForQuickResult && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#D9E2D4] space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                  Anexar resultado
                </h3>
                <p className="text-xs text-[#6B7A6F]">{targetExameForQuickResult.nome}</p>
              </div>
            </div>

            <form onSubmit={handleQuickResultSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                  Arquivo do laudo / resultado <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                  onChange={(e) => setQuickResultFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#6B7A6F] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#4C7A5A] file:text-white hover:file:bg-[#3F664C] cursor-pointer"
                />
                <p className="text-[11px] text-[#6B7A6F] mt-1">
                  Formatos aceitos: PDF, PNG, JPG, WEBP, DOCX (até 10MB)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                  Data de realização
                </label>
                <input
                  type="date"
                  value={quickRealizadoDate}
                  onChange={(e) => setQuickRealizadoDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickResultModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingQuick || !quickResultFile}
                  className="px-5 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold disabled:opacity-50"
                >
                  {uploadingQuick ? 'Enviando laudo...' : 'Concluir exame com laudo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                Tem certeza? Esta ação removerá <strong>{exameToDelete.nome}</strong> e os arquivos
                associados.
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
