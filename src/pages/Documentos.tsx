import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getDocumentos,
  createDocumento,
  deleteDocumento,
  getExames,
  getFileUrl,
} from '@/services/healthService'
import type { Documento, Exame, CategoriaDocumento } from '@/types/health'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  FolderOpen,
  Plus,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  AlertCircle,
  X,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatarData, extrairDataIso } from '@/lib/dateUtils'

interface UnifiedDoc {
  id: string
  titulo: string
  categoria: string
  origem: string
  data: string
  url: string
  tipoArquivo: 'pdf' | 'imagem' | 'doc'
  canDelete: boolean
  originalDocId?: string
}

const CATEGORIAS: CategoriaDocumento[] = [
  'Exame — Pedido',
  'Exame — Resultado',
  'Receita',
  'Laudo',
  'Atestado',
  'Outro',
]

export default function Documentos() {
  const { user } = useAuth()
  const { activeProfile, isOwner, permissions } = useHealthProfile()
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const { isReadOnly } = useSubscription()
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [exames, setExames] = useState<Exame[]>([])
  const [loading, setLoading] = useState(true)

  useRealtime('documentos', () => triggerRefresh())
  useRealtime('exames', () => triggerRefresh())

  // Upload Modal
  const [uploadOpen, setUploadOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState<CategoriaDocumento>('Receita')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [docToDelete, setDocToDelete] = useState<UnifiedDoc | null>(null)

  const loadData = useCallback(async () => {
    const profId = activeProfile?.id
    try {
      const [docs, exs] = await Promise.all([getDocumentos(profId), getExames(profId)])
      setDocumentos(docs)
      setExames(exs)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar documentos',
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

  // Build unified view: avulsos + exam attachments
  const unifiedList: UnifiedDoc[] = []

  // 1. Direct documentos
  documentos.forEach((d) => {
    const ext = d.arquivo?.split('.').pop()?.toLowerCase() || ''
    const tipo =
      ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? 'imagem' : 'doc'

    unifiedList.push({
      id: `doc-${d.id}`,
      titulo: d.titulo,
      categoria: d.categoria,
      origem: d.expand?.exame_ref?.nome || 'Geral',
      data: extrairDataIso(d.created),
      url: getFileUrl('documentos', d.id, d.arquivo),
      tipoArquivo: tipo,
      canDelete: true,
      originalDocId: d.id,
    })
  })

  // 2. Exam attachments (pedido & resultado)
  exames.forEach((e) => {
    if (e.pedido_arquivo) {
      const ext = e.pedido_arquivo.split('.').pop()?.toLowerCase() || ''
      const tipo: 'pdf' | 'imagem' | 'doc' =
        ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? 'imagem' : 'doc'

      unifiedList.push({
        id: `ex-ped-${e.id}`,
        titulo: `Pedido Médico — ${e.nome}`,
        categoria: 'Exame — Pedido',
        origem: e.nome,
        data: extrairDataIso(e.data_solicitado),
        url: getFileUrl('exames', e.id, e.pedido_arquivo),
        tipoArquivo: tipo,
        canDelete: false,
      })
    }

    if (e.resultado_arquivo) {
      const ext = e.resultado_arquivo.split('.').pop()?.toLowerCase() || ''
      const tipo: 'pdf' | 'imagem' | 'doc' =
        ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? 'imagem' : 'doc'

      unifiedList.push({
        id: `ex-res-${e.id}`,
        titulo: `Laudo / Resultado — ${e.nome}`,
        categoria: 'Exame — Resultado',
        origem: e.nome,
        data: extrairDataIso(e.data_realizado) || extrairDataIso(e.data_solicitado),
        url: getFileUrl('exames', e.id, e.resultado_arquivo),
        tipoArquivo: tipo,
        canDelete: false,
      })
    }
  })

  unifiedList.sort((a, b) => b.data.localeCompare(a.data))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    if (selected && !titulo) {
      // Auto-derive title from file name without extension
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '')
      setTitulo(nameWithoutExt)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !file) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o título e selecione o arquivo para envio.',
        variant: 'destructive',
      })
      return
    }

    if (isReadOnly) {
      toast({
        title: 'Assinatura expirada',
        description: 'Renove seu plano no menu Meu Plano para enviar novos documentos.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('titulo', titulo.trim())
      formData.append('categoria', categoria)
      formData.append('arquivo', file)

      await createDocumento(formData, activeProfile?.id)
      toast({
        title: 'Documento arquivado!',
        description: `${titulo} foi salvo na biblioteca de ${activeProfile?.nome || 'Titular'}.`,
      })
      setUploadOpen(false)
      setTitulo('')
      setFile(null)
      triggerRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro no upload',
        description: err?.message || 'Verifique o formato e o tamanho (máx. 10MB).',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const promptDelete = (d: UnifiedDoc) => {
    setDocToDelete(d)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!docToDelete?.originalDocId) return
    setSaving(true)
    try {
      await deleteDocumento(docToDelete.originalDocId)
      toast({
        title: 'Documento excluído',
        description: `${docToDelete.titulo} foi removido da sua biblioteca.`,
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

  const formatDate = (iso?: string) => formatarData(iso)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Documentos de saúde
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Biblioteca unificada de laudos, pedidos médicos, receitas e atestados
          </p>
        </div>

        {permissions.documentos_editar && !isReadOnly ? (
          <button
            onClick={() => {
              setTitulo('')
              setCategoria('Receita')
              setFile(null)
              setUploadOpen(true)
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Enviar documento</span>
          </button>
        ) : (
          <span className="text-xs text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-full font-medium">
            {isReadOnly ? 'Plano Expirado — Somente Leitura' : 'Modo Somente Leitura'}
          </span>
        )}
      </div>

      <ProfileContextBadge actionLabel="Biblioteca de documentos de" />

      {/* Unified Grid */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
          <p className="text-sm font-serif italic text-[#26362B]">Carregando sua biblioteca...</p>
        </div>
      ) : unifiedList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#D9E2D4] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="font-serif italic text-xl text-[#26362B] font-medium">
            Nenhum documento arquivado
          </h3>
          <p className="text-xs text-[#6B7A6F] mt-2 leading-relaxed">
            Envie receitas, atestados médicos e laudos escaneados para centralizar toda a sua
            documentação em um lugar seguro.
          </p>
          <button
            onClick={() => setUploadOpen(true)}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-medium shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enviar primeiro documento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {unifiedList.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* File icon and category badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center group-hover:scale-105 transition">
                    {doc.tipoArquivo === 'pdf' ? (
                      <FileText className="w-6 h-6 text-red-600" />
                    ) : doc.tipoArquivo === 'imagem' ? (
                      <ImageIcon className="w-6 h-6 text-[#5B9A8B]" />
                    ) : (
                      <FileSpreadsheet className="w-6 h-6 text-[#4C7A5A]" />
                    )}
                  </div>

                  <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#F6F4EF] text-[#26362B] border border-[#D9E2D4]">
                    {doc.categoria}
                  </span>
                </div>

                <h3 className="font-serif italic text-lg text-[#26362B] font-semibold leading-snug line-clamp-2">
                  {doc.titulo}
                </h3>

                <div className="mt-3 space-y-1 text-xs text-[#6B7A6F]">
                  <p className="flex items-center gap-1.5">
                    <span className="font-medium text-[#26362B]">Origem:</span>
                    <span className="truncate">{doc.origem}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#4C7A5A]" />
                    <span>{formatDate(doc.data)}</span>
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-[#D9E2D4]/50 flex items-center justify-between gap-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow-xs transition"
                >
                  <span>Abrir arquivo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {doc.canDelete && (
                  <button
                    onClick={() => promptDelete(doc)}
                    className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                    title="Excluir documento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-[#D9E2D4] relative animate-scale-in">
            <button
              onClick={() => setUploadOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-gray-100 text-[#6B7A6F] hover:text-[#26362B] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
                  Enviar documento
                </h2>
                <p className="text-xs text-[#6B7A6F]">
                  Arquive receitas, atestados e exames complementares
                </p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Título do documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Receita de Losartana - Dr. Rafael"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1.5 uppercase tracking-wider">
                  Arquivo (PDF, PNG, JPG, WEBP, DOCX - máx 10MB){' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                  onChange={handleFileChange}
                  className="w-full text-xs text-[#6B7A6F] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#4C7A5A] file:text-white hover:file:bg-[#3F664C] cursor-pointer"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F] hover:bg-[#F6F4EF]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !file}
                  className="px-6 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  {saving ? 'Enviando...' : 'Salvar na biblioteca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && docToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D9E2D4] text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Excluir documento?
              </h3>
              <p className="text-xs text-[#6B7A6F] mt-1">
                Tem certeza? Esta ação removerá <strong>{docToDelete.titulo}</strong> do seu
                prontuário.
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
