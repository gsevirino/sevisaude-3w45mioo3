import React, { useState, useEffect, useCallback } from 'react'
import { getClinicas, createClinica, updateClinica, deleteClinica } from '@/services/healthService'
import type { Clinica, TipoClinica } from '@/types/health'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Building2,
  Plus,
  Search,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Loader2,
  Tag,
  Mail,
  Navigation,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const TIPOS_CLINICA: TipoClinica[] = ['Clínica', 'Laboratório', 'Consultório', 'Hospital', 'Outro']

export default function Clinicas() {
  const { user } = useAuth()
  const { activeProfile, permissions, isOwner } = useHealthProfile()
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const { isReadOnly } = useSubscription()

  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTipo, setSelectedTipo] = useState<string>('Todos')

  // Form Modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingClinica, setEditingClinica] = useState<Clinica | null>(null)
  const [saving, setSaving] = useState(false)

  // Fields
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoClinica>('Clínica')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [cep, setCep] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [clinicaToDelete, setClinicaToDelete] = useState<Clinica | null>(null)

  useRealtime('clinicas', () => triggerRefresh())

  const loadData = useCallback(async () => {
    try {
      const data = await getClinicas(activeProfile?.id)
      setClinicas(data)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar locais e clínicas',
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
    setEditingClinica(null)
    setNome('')
    setTipo('Clínica')
    setTelefone('')
    setEndereco('')
    setBairro('')
    setCidade('')
    setCep('')
    setObservacoes('')
    setFormOpen(true)
  }

  const openEditForm = (c: Clinica) => {
    setEditingClinica(c)
    setNome(c.nome)
    setTipo(c.tipo || 'Clínica')
    setTelefone(c.telefone || '')
    setEndereco(c.endereco || '')
    setBairro(c.bairro || '')
    setCidade(c.cidade || '')
    setCep(c.cep || '')
    setObservacoes(c.observacoes || '')
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da clínica, laboratório ou local.',
        variant: 'destructive',
      })
      return
    }

    if (isReadOnly) {
      toast({
        title: 'Assinatura expirada',
        description: 'Renove seu plano no menu Meu Plano para cadastrar novos locais.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        nome: nome.trim(),
        tipo,
        telefone: telefone.trim() || undefined,
        endereco: endereco.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        cep: cep.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      }

      if (editingClinica) {
        await updateClinica(editingClinica.id, payload)
        toast({
          title: 'Local atualizado!',
          description: 'As alterações foram salvas com sucesso.',
        })
      } else {
        await createClinica(payload, activeProfile?.id)
        toast({
          title: 'Local cadastrado!',
          description: `${nome} foi adicionado à lista de locais e clínicas.`,
        })
      }
      setFormOpen(false)
      triggerRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar local',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const promptDelete = (c: Clinica) => {
    setClinicaToDelete(c)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!clinicaToDelete) return
    setSaving(true)
    try {
      await deleteClinica(clinicaToDelete.id)
      toast({
        title: 'Local excluído',
        description: 'A clínica foi removida da lista.',
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

  const canEdit = (permissions.clinicas_editar ?? permissions.medicos_editar) && !isReadOnly

  const filteredClinicas = clinicas.filter((c) => {
    const matchesTipo = selectedTipo === 'Todos' || c.tipo === selectedTipo
    const q = searchQuery.toLowerCase().trim()
    if (!q) return matchesTipo

    const matchNome = c.nome?.toLowerCase().includes(q)
    const matchTipo = c.tipo?.toLowerCase().includes(q)
    const matchEndereco = c.endereco?.toLowerCase().includes(q)
    const matchBairro = c.bairro?.toLowerCase().includes(q)
    const matchCidade = c.cidade?.toLowerCase().includes(q)
    const matchObs = c.observacoes?.toLowerCase().includes(q)

    return (
      matchesTipo &&
      (matchNome || matchTipo || matchEndereco || matchBairro || matchCidade || matchObs)
    )
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header - Apenas título + botão, sem subtítulo descritivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Clínicas e locais
          </h1>
        </div>

        {canEdit ? (
          <button
            onClick={openNewForm}
            className="inline-flex items-center gap-2 bg-[#4C7A5A] hover:bg-[#3F664C] text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition hover:scale-102 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova clínica</span>
          </button>
        ) : isReadOnly ? (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
            Modo somente leitura (assinatura expirada)
          </div>
        ) : null}
      </div>

      <ProfileContextBadge />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A6F]" />
          <input
            type="text"
            placeholder="Buscar por nome, endereço, bairro ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-white text-sm text-[#26362B] placeholder-[#6B7A6F] outline-none focus:ring-2 focus:ring-[#4C7A5A] transition shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedTipo('Todos')}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedTipo === 'Todos'
                ? 'bg-[#4C7A5A] text-white'
                : 'bg-white text-[#6B7A6F] border border-[#D9E2D4] hover:bg-[#F6F4EF]'
            }`}
          >
            Todos ({clinicas.length})
          </button>
          {TIPOS_CLINICA.map((t) => {
            const count = clinicas.filter((c) => c.tipo === t).length
            if (count === 0 && selectedTipo !== t) return null
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTipo(t)}
                className={`px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedTipo === t
                    ? 'bg-[#4C7A5A] text-white'
                    : 'bg-white text-[#6B7A6F] border border-[#D9E2D4] hover:bg-[#F6F4EF]'
                }`}
              >
                {t} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid or Empty */}
      {loading ? (
        <div className="p-12 text-center text-[#6B7A6F] flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#4C7A5A]" />
          <span>Carregando locais e clínicas...</span>
        </div>
      ) : filteredClinicas.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#D9E2D4] space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-serif italic text-2xl text-[#26362B] font-semibold">
              {searchQuery || selectedTipo !== 'Todos'
                ? 'Nenhum local encontrado'
                : 'Nenhuma clínica cadastrada'}
            </h3>
            <p className="text-sm text-[#6B7A6F] max-w-md mx-auto mt-1">
              {searchQuery || selectedTipo !== 'Todos'
                ? 'Tente ajustar os filtros ou termo de busca.'
                : 'Cadastre clínicas de exames, laboratórios e consultórios para salvar o endereço e agilizar o registro de consultas e exames.'}
            </p>
          </div>
          {canEdit && !searchQuery && selectedTipo === 'Todos' && (
            <button
              onClick={openNewForm}
              className="inline-flex items-center gap-2 bg-[#4C7A5A] hover:bg-[#3F664C] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar primeira clínica</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClinicas.map((c) => {
            const enderecoCompleto = [c.endereco, c.bairro, c.cidade, c.cep ? `CEP ${c.cep}` : null]
              .filter(Boolean)
              .join(' - ')

            return (
              <div
                key={c.id}
                className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Icon & Tag */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center border border-[#DCE9D4] group-hover:scale-105 transition">
                      <Building2 className="w-6 h-6" />
                    </div>
                    {c.tipo && (
                      <span className="text-[11px] font-semibold text-[#4C7A5A] bg-[#F6F4EF] px-2.5 py-1 rounded-full border border-[#D9E2D4]">
                        {c.tipo}
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif italic text-xl text-[#26362B] font-semibold leading-tight">
                    {c.nome}
                  </h3>

                  {/* Endereço e Contatos */}
                  <div className="mt-4 pt-4 border-t border-[#D9E2D4]/50 space-y-2 text-xs text-[#6B7A6F]">
                    {enderecoCompleto && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#4C7A5A] shrink-0 mt-0.5" />
                        <span className="text-[#26362B] leading-relaxed">{enderecoCompleto}</span>
                      </div>
                    )}

                    {c.telefone && (
                      <a
                        href={`tel:${c.telefone.replace(/\D/g, '')}`}
                        className="flex items-center gap-2 hover:text-[#4C7A5A] transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#4C7A5A] shrink-0" />
                        <span className="truncate">{c.telefone}</span>
                      </a>
                    )}

                    {c.observacoes && (
                      <p className="text-xs text-[#26362B] bg-[#F6F4EF] p-2.5 rounded-xl border border-[#D9E2D4]/50 italic mt-2">
                        "{c.observacoes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Bottom */}
                {canEdit && (
                  <div className="mt-6 pt-4 border-t border-[#D9E2D4]/50 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditForm(c)}
                      className="p-2 rounded-full hover:bg-[#E7F0E3] text-[#4C7A5A] transition cursor-pointer"
                      title="Editar clínica"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => promptDelete(c)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                      title="Excluir clínica"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD Modal Form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#D9E2D4] relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setFormOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-gray-100 text-[#6B7A6F] hover:text-[#26362B] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
                  {editingClinica ? 'Editar local / clínica' : 'Novo local / clínica'}
                </h2>
                <p className="text-xs text-[#6B7A6F]">
                  Salve endereço e contatos para reutilizar em exames e consultas
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Nome da clínica / local <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Fleury Medicina e Saúde, Sírio-Libanês"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Tipo de local
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoClinica)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none min-h-[44px]"
                  >
                    {TIPOS_CLINICA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Telefone de contato
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="Ex.: (11) 3123-4567"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    CEP (opcional)
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="Ex.: 01310-100"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Endereço / Logradouro
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex.: Av. Paulista, 1842 - Torre Norte"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Ex.: Bela Vista"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex.: São Paulo - SP"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Observações e referências
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: Estacionamento com convênio no subsolo; elevador privativo bloco B..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F] hover:bg-[#F6F4EF] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {saving
                    ? 'Gravando...'
                    : editingClinica
                      ? 'Salvar alterações'
                      : 'Cadastrar local'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && clinicaToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D9E2D4] text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Excluir clínica?
              </h3>
              <p className="text-xs text-[#6B7A6F] mt-1">
                Tem certeza? Esta ação removerá <strong>{clinicaToDelete.nome}</strong> da sua lista
                de locais. Consultas e exames já cadastrados continuarão exibindo o local.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F] hover:bg-[#F6F4EF] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
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
