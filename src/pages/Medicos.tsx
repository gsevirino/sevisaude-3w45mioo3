import { useState, useEffect, useCallback } from 'react'
import { getMedicos, createMedico, updateMedico, deleteMedico } from '@/services/healthService'
import type { Medico } from '@/types/health'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  Award,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function Medicos() {
  const { user } = useAuth()
  const { activeProfile, permissions, isOwner } = useHealthProfile()
  const { refreshKey, triggerRefresh } = useHealthRefresh()
  const { isReadOnly } = useSubscription()
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)

  useRealtime('medicos', () => triggerRefresh())

  // Modal
  const [formOpen, setFormOpen] = useState(false)
  const [editingMedico, setEditingMedico] = useState<Medico | null>(null)
  const [saving, setSaving] = useState(false)

  // Fields
  const [nome, setNome] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [crm, setCrm] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // Delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [medicoToDelete, setMedicoToDelete] = useState<Medico | null>(null)

  const loadData = useCallback(async () => {
    const profId = activeProfile?.id
    try {
      const data = await getMedicos(profId)
      setMedicos(data)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar profissionais',
        description: 'Tente novamente mais tarde.',
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
    setEditingMedico(null)
    setNome('')
    setEspecialidade('')
    setCrm('')
    setTelefone('')
    setEmail('')
    setObservacoes('')
    setFormOpen(true)
  }

  const openEditForm = (m: Medico) => {
    setEditingMedico(m)
    setNome(m.nome)
    setEspecialidade(m.especialidade)
    setCrm(m.crm || '')
    setTelefone(m.telefone || '')
    setEmail(m.email || '')
    setObservacoes(m.observacoes || '')
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do médico ou profissional.',
        variant: 'destructive',
      })
      return
    }

    if (isReadOnly) {
      toast({
        title: 'Assinatura expirada',
        description: 'Renove seu plano no menu Meu Plano para cadastrar novos profissionais.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      if (editingMedico) {
        await updateMedico(editingMedico.id, {
          nome: nome.trim(),
          especialidade: especialidade.trim(),
          crm: crm.trim() || undefined,
          telefone: telefone.trim() || undefined,
          email: email.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
        })
        toast({
          title: 'Profissional atualizado!',
          description: 'Dados salvos com sucesso.',
        })
      } else {
        await createMedico(
          {
            nome: nome.trim(),
            especialidade: especialidade.trim(),
            crm: crm.trim(),
            telefone: telefone.trim(),
            email: email.trim(),
            observacoes: observacoes.trim(),
          },
          activeProfile?.id,
        )
        toast({
          title: 'Profissional cadastrado!',
          description: `${nome} foi adicionado à sua equipe médica.`,
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

  const promptDelete = (m: Medico) => {
    setMedicoToDelete(m)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!medicoToDelete) return
    setSaving(true)
    try {
      await deleteMedico(medicoToDelete.id)
      toast({
        title: 'Profissional excluído',
        description: `${medicoToDelete.nome} foi removido.`,
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Médicos e profissionais
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Cadastre médicos, terapeutas, nutricionistas e especialistas que acompanham você
          </p>
        </div>

        {permissions.medicos_editar && !isReadOnly ? (
          <button
            onClick={openNewForm}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Novo profissional</span>
          </button>
        ) : (
          <span className="text-xs text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-full font-medium">
            {isReadOnly ? 'Plano Expirado — Somente Leitura' : 'Modo Somente Leitura'}
          </span>
        )}
      </div>

      <ProfileContextBadge actionLabel="Corpo clínico vinculado a" />

      {/* Grid of Cards */}
      {loading ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
          <p className="text-sm font-serif italic text-[#26362B]">Carregando profissionais...</p>
        </div>
      ) : medicos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#D9E2D4] text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="font-serif italic text-xl text-[#26362B] font-medium">
            Nenhum médico cadastrado
          </h3>
          <p className="text-xs text-[#6B7A6F] mt-2 leading-relaxed">
            Tenha os contatos, especialidades e registros dos seus médicos sempre à mão para
            receitas e agendamentos.
          </p>
          <button
            onClick={openNewForm}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-medium shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar primeiro médico</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {medicos.map((m) => {
            const initials = m.nome
              .replace(/^(Dr\.|Dra\.)\s*/i, '')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((n) => n[0].toUpperCase())
              .join('')

            return (
              <div
                key={m.id}
                className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Avatar & Specialty */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center font-bold text-lg font-serif border-2 border-[#DCE9D4] shadow-xs group-hover:scale-105 transition">
                      {initials || 'MD'}
                    </div>
                    {m.crm && (
                      <span className="text-[11px] font-semibold text-[#6B7A6F] bg-[#F6F4EF] px-2.5 py-1 rounded-full border border-[#D9E2D4]">
                        {m.crm}
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif italic text-xl text-[#26362B] font-semibold leading-tight">
                    {m.nome}
                  </h3>
                  <p className="text-xs font-semibold text-[#4C7A5A] uppercase tracking-wider mt-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>{m.especialidade}</span>
                  </p>

                  {/* Contacts */}
                  <div className="mt-4 pt-4 border-t border-[#D9E2D4]/50 space-y-2 text-xs text-[#6B7A6F]">
                    {m.telefone && (
                      <a
                        href={`tel:${m.telefone.replace(/\D/g, '')}`}
                        className="flex items-center gap-2 hover:text-[#4C7A5A] transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#4C7A5A] shrink-0" />
                        <span className="truncate">{m.telefone}</span>
                      </a>
                    )}
                    {m.email && (
                      <a
                        href={`mailto:${m.email}`}
                        className="flex items-center gap-2 hover:text-[#4C7A5A] transition"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#4C7A5A] shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </a>
                    )}
                    {m.observacoes && (
                      <p className="text-xs text-[#26362B] bg-[#F6F4EF] p-2.5 rounded-xl border border-[#D9E2D4]/50 italic mt-2">
                        "{m.observacoes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Bottom */}
                <div className="mt-6 pt-4 border-t border-[#D9E2D4]/50 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditForm(m)}
                    className="p-2 rounded-full hover:bg-[#E7F0E3] text-[#4C7A5A] transition cursor-pointer"
                    title="Editar profissional"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => promptDelete(m)}
                    className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition cursor-pointer"
                    title="Excluir profissional"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD Modal Form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#D9E2D4] relative animate-scale-in">
            <button
              onClick={() => setFormOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-gray-100 text-[#6B7A6F] hover:text-[#26362B] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif italic text-2xl text-[#26362B] font-semibold">
                  {editingMedico ? 'Editar profissional' : 'Novo profissional'}
                </h2>
                <p className="text-xs text-[#6B7A6F]">
                  Mantenha as informações e contatos da sua equipe de saúde
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Dra. Ana Beatriz Costa"
                  className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    Especialidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                    placeholder="Ex.: Cardiologista, Nutricionista"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    CRM / Registro profissional
                  </label>
                  <input
                    type="text"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    placeholder="Ex.: CRM 123456-SP"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
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
                    placeholder="Ex.: (11) 98765-4321"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="medico@clinica.com.br"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-sm focus:ring-2 focus:ring-[#4C7A5A] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                  Observações e horários de consultório
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: Atende terças e quintas pela manhã no Hospital..."
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
                    : editingMedico
                      ? 'Salvar alterações'
                      : 'Cadastrar profissional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && medicoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#D9E2D4] text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif italic text-xl text-[#26362B] font-semibold">
                Excluir profissional?
              </h3>
              <p className="text-xs text-[#6B7A6F] mt-1">
                Tem certeza? Esta ação removerá <strong>{medicoToDelete.nome}</strong> da sua lista
                de médicos.
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
