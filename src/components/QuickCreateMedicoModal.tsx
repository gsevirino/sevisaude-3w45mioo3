import React, { useState } from 'react'
import { createMedico } from '@/services/healthService'
import type { Medico } from '@/types/health'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { UserCheck, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface QuickCreateMedicoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (medico: Medico) => void
}

export function QuickCreateMedicoModal({ open, onClose, onSuccess }: QuickCreateMedicoModalProps) {
  const { activeProfile, permissions } = useHealthProfile()
  const { isReadOnly } = useSubscription()
  const { triggerRefresh } = useHealthRefresh()

  const [nome, setNome] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [crm, setCrm] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!open) return null

  const canCreate = permissions.medicos_editar && !isReadOnly

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!nome.trim()) {
      setErrorMessage('Informe o nome do médico ou profissional.')
      return
    }

    if (!especialidade.trim()) {
      setErrorMessage('Informe a especialidade do profissional.')
      return
    }

    if (!canCreate) {
      setErrorMessage(
        isReadOnly
          ? 'Assinatura expirada: renove seu plano para cadastrar novos profissionais.'
          : 'Você não tem permissão para cadastrar profissionais neste perfil.',
      )
      return
    }

    setSaving(true)
    try {
      const novo = await createMedico(
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
        description: `${novo.nome} foi adicionado à equipe médica e selecionado.`,
      })

      triggerRefresh()
      // Limpa os campos antes de fechar
      setNome('')
      setEspecialidade('')
      setCrm('')
      setTelefone('')
      setEmail('')
      setObservacoes('')
      onSuccess(novo)
      onClose()
    } catch (err: any) {
      console.error('Erro ao cadastrar profissional rápido:', err)
      setErrorMessage(
        err?.message || 'Erro ao cadastrar profissional. Verifique os dados e tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-7 shadow-2xl border border-[#D9E2D4] relative animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-medico-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-[#6B7A6F] hover:text-[#26362B] transition cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3
              id="quick-medico-title"
              className="font-serif italic text-xl text-[#26362B] font-semibold"
            >
              Cadastrar novo profissional
            </h3>
            <p className="text-xs text-[#6B7A6F]">
              {activeProfile?.nome ? (
                <>
                  Vinculado a: <strong className="text-[#26362B]">{activeProfile.nome}</strong>
                </>
              ) : (
                'Adicione rapidamente o médico à sua equipe'
              )}
            </p>
          </div>
        </div>

        {isReadOnly && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Plano expirado:</strong> sua conta está em modo somente leitura. Renove sua
              assinatura no menu <em>Meu Plano</em> para cadastrar novos médicos.
            </span>
          </div>
        )}

        {!permissions.medicos_editar && !isReadOnly && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>Você tem permissão apenas de visualização neste perfil de saúde.</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
              Nome do profissional <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Dra. Ana Beatriz Costa"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Especialidade <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                placeholder="Ex.: Cardiologista, Clínico Geral"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                CRM / Registro (opcional)
              </label>
              <input
                type="text"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                placeholder="Ex.: CRM 123456-SP"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Telefone / WhatsApp (opcional)
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex.: (11) 98765-4321"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                E-mail (opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex.: consultorio@exemplo.com.br"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: Atende no Hospital Sírio-Libanês às quartas-feiras..."
              className="w-full px-3.5 py-2 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-full border border-[#D9E2D4] text-xs font-medium text-[#6B7A6F] hover:bg-[#F6F4EF] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !canCreate}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <span>Salvar e selecionar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
