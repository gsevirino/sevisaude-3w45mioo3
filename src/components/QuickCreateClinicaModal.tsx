import React, { useState } from 'react'
import { createClinica } from '@/services/healthService'
import type { Clinica, TipoClinica } from '@/types/health'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { Building2, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const TIPOS_CLINICA: TipoClinica[] = ['Clínica', 'Laboratório', 'Consultório', 'Hospital', 'Outro']

interface QuickCreateClinicaModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (clinica: Clinica) => void
}

export function QuickCreateClinicaModal({
  open,
  onClose,
  onSuccess,
}: QuickCreateClinicaModalProps) {
  const { activeProfile, permissions } = useHealthProfile()
  const { isReadOnly } = useSubscription()
  const { triggerRefresh } = useHealthRefresh()

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoClinica>('Clínica')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [cep, setCep] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!open) return null

  const canCreate = (permissions.clinicas_editar ?? permissions.medicos_editar) && !isReadOnly

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!nome.trim()) {
      setErrorMessage('Informe o nome da clínica, laboratório ou local.')
      return
    }

    if (!canCreate) {
      setErrorMessage(
        isReadOnly
          ? 'Assinatura expirada: renove seu plano para cadastrar novas clínicas.'
          : 'Você não tem permissão para cadastrar clínicas neste perfil.',
      )
      return
    }

    setSaving(true)
    try {
      const nova = await createClinica(
        {
          nome: nome.trim(),
          tipo,
          telefone: telefone.trim() || undefined,
          endereco: endereco.trim() || undefined,
          bairro: bairro.trim() || undefined,
          cidade: cidade.trim() || undefined,
          cep: cep.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
        },
        activeProfile?.id,
      )

      toast({
        title: 'Local cadastrado!',
        description: `${nova.nome} foi cadastrado e selecionado.`,
      })

      triggerRefresh()
      setNome('')
      setTipo('Clínica')
      setTelefone('')
      setEndereco('')
      setBairro('')
      setCidade('')
      setCep('')
      setObservacoes('')
      onSuccess(nova)
      onClose()
    } catch (err: any) {
      console.error('Erro ao cadastrar clínica rápido:', err)
      setErrorMessage(
        err?.message || 'Erro ao cadastrar local. Verifique os dados e tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-7 shadow-2xl border border-[#D9E2D4] relative animate-scale-in max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-clinica-title"
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
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3
              id="quick-clinica-title"
              className="font-serif italic text-xl text-[#26362B] font-semibold"
            >
              Cadastrar nova clínica ou local
            </h3>
            <p className="text-xs text-[#6B7A6F]">
              {activeProfile?.nome ? (
                <>
                  Vinculado a: <strong className="text-[#26362B]">{activeProfile.nome}</strong>
                </>
              ) : (
                'Salve o endereço para não precisar digitar novamente'
              )}
            </p>
          </div>
        </div>

        {isReadOnly && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Plano expirado:</strong> sua conta está em modo somente leitura. Renove sua
              assinatura no menu <em>Meu Plano</em> para cadastrar novos locais.
            </span>
          </div>
        )}

        {!canCreate && !isReadOnly && (
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Nome da clínica / local <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Fleury Medicina e Saúde, Hospital Sírio-Libanês"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Tipo de local
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoClinica)}
                className="w-full px-3 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none min-h-[42px]"
              >
                {TIPOS_CLINICA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
                placeholder="Ex.: (11) 3123-4567"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
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
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
              Endereço / Logradouro (opcional)
            </label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex.: Av. Paulista, 1842 - Bloco B"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Bairro (opcional)
              </label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex.: Bela Vista"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Cidade (opcional)
              </label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex.: São Paulo - SP"
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
              placeholder="Ex.: Estacionamento com manobrista no subsolo; andar 4..."
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
