import React, { useState } from 'react'
import { createConsulta } from '@/services/healthService'
import type { Consulta, TipoConsulta, StatusConsulta, Medico } from '@/types/health'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { CalendarCheck, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const TIPOS: TipoConsulta[] = ['Presencial', 'Teleconsulta', 'Domiciliar']

interface QuickCreateConsultaModalProps {
  open: boolean
  medicos: Medico[]
  onClose: () => void
  onSuccess: (consulta: Consulta) => void
  onOpenNewMedico?: () => void
}

export function QuickCreateConsultaModal({
  open,
  medicos,
  onClose,
  onSuccess,
  onOpenNewMedico,
}: QuickCreateConsultaModalProps) {
  const { activeProfile, permissions } = useHealthProfile()
  const { isReadOnly } = useSubscription()
  const { triggerRefresh } = useHealthRefresh()

  const [medicoId, setMedicoId] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().split('T')[0])
  const [horario, setHorario] = useState('09:00')
  const [tipo, setTipo] = useState<TipoConsulta>('Presencial')
  const [status, setStatus] = useState<StatusConsulta>('Realizada')
  const [motivoAtendimento, setMotivoAtendimento] = useState('')
  const [local, setLocal] = useState('')

  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!open) return null

  const canCreate = permissions.consultas_editar && !isReadOnly

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!medicoId) {
      setErrorMessage('Selecione o médico ou profissional da consulta.')
      return
    }

    if (!data || !horario) {
      setErrorMessage('Informe a data e o horário da consulta.')
      return
    }

    if (!canCreate) {
      setErrorMessage(
        isReadOnly
          ? 'Assinatura expirada: renove seu plano para cadastrar novas consultas.'
          : 'Você não tem permissão para cadastrar consultas neste perfil.',
      )
      return
    }

    setSaving(true)
    try {
      const nova = await createConsulta(
        {
          medico: medicoId,
          data,
          horario,
          tipo,
          status,
          motivo_atendimento: motivoAtendimento.trim(),
          local: local.trim(),
        },
        activeProfile?.id,
      )

      toast({
        title: 'Consulta cadastrada!',
        description: 'A consulta foi salva e selecionada automaticamente.',
      })

      triggerRefresh()
      // Limpa os campos
      setMotivoAtendimento('')
      setLocal('')
      onSuccess(nova)
      onClose()
    } catch (err: any) {
      console.error('Erro ao cadastrar consulta rápida:', err)
      setErrorMessage(
        err?.message || 'Erro ao cadastrar consulta. Verifique os dados e tente novamente.',
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
        aria-labelledby="quick-consulta-title"
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
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h3
              id="quick-consulta-title"
              className="font-serif italic text-xl text-[#26362B] font-semibold"
            >
              Cadastrar nova consulta
            </h3>
            <p className="text-xs text-[#6B7A6F]">
              {activeProfile?.nome ? (
                <>
                  Vinculado a: <strong className="text-[#26362B]">{activeProfile.nome}</strong>
                </>
              ) : (
                'Adicione rapidamente uma consulta ao prontuário'
              )}
            </p>
          </div>
        </div>

        {isReadOnly && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Plano expirado:</strong> sua conta está em modo somente leitura. Renove sua
              assinatura para cadastrar consultas.
            </span>
          </div>
        )}

        {!permissions.consultas_editar && !isReadOnly && (
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#26362B] uppercase tracking-wider">
                Médico / Profissional <span className="text-red-500">*</span>
              </label>
              {onOpenNewMedico && (
                <button
                  type="button"
                  onClick={() => onOpenNewMedico()}
                  className="text-[11px] font-semibold text-[#4C7A5A] hover:underline cursor-pointer"
                >
                  + Novo médico
                </button>
              )}
            </div>
            <select
              required
              value={medicoId}
              onChange={(e) => setMedicoId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
            >
              <option value="">Selecione o profissional...</option>
              {medicos.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.nome} — {doc.especialidade}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Data da consulta <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
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
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoConsulta)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
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
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusConsulta)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              >
                <option value="Realizada">Realizada</option>
                <option value="Agendada">Agendada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
              Motivo do atendimento (opcional)
            </label>
            <input
              type="text"
              value={motivoAtendimento}
              onChange={(e) => setMotivoAtendimento(e.target.value)}
              placeholder="Ex.: Check-up anual, retorno, dor lombar..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
              Local / Plataforma (opcional)
            </label>
            <input
              type="text"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Ex.: Consultório Jardins ou Teleconsulta"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
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
