import React, { useState, useEffect } from 'react'
import { createExame } from '@/services/healthService'
import type { Exame, TipoExame, StatusExame, Medico, HistoricoStatusExame } from '@/types/health'
import { useHealthProfile } from '@/context/HealthProfileContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import { extrairDataIso, montarDataHoraAgendada } from '@/lib/dateUtils'
import { TestTube, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const TIPOS: TipoExame[] = [
  'Sangue',
  'Imagem',
  'Urina',
  'Fezes',
  'Cardíaco',
  'Preventivo',
  'Endoscopia/Biópsia',
  'Genético',
  'Outro',
]

interface QuickCreateExameModalProps {
  open: boolean
  medicos: Medico[]
  onClose: () => void
  onSuccess: (exame: Exame) => void
  onOpenNewMedico?: () => void
  defaultMedicoId?: string
  consultaId?: string
}

export function QuickCreateExameModal({
  open,
  medicos,
  onClose,
  onSuccess,
  onOpenNewMedico,
  defaultMedicoId,
  consultaId,
}: QuickCreateExameModalProps) {
  const { activeProfile, permissions } = useHealthProfile()
  const { isReadOnly } = useSubscription()
  const { triggerRefresh } = useHealthRefresh()

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoExame>('Sangue')
  const [medicoId, setMedicoId] = useState(defaultMedicoId || medicos[0]?.id || '')
  const [dataSolicitado, setDataSolicitado] = useState(() =>
    extrairDataIso(new Date().toISOString()),
  )
  const [dataValidade, setDataValidade] = useState('')
  const [status, setStatus] = useState<StatusExame>('Pendente')

  // Agendamento estruturado com date e time
  const [dataAgendada, setDataAgendada] = useState('')
  const [horarioAgendado, setHorarioAgendado] = useState('')
  const [localRealizacao, setLocalRealizacao] = useState('')
  const [instrucoesPreparo, setInstrucoesPreparo] = useState('')

  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (defaultMedicoId) {
      setMedicoId(defaultMedicoId)
    } else if (medicos.length > 0 && !medicoId) {
      setMedicoId(medicos[0].id)
    }
  }, [defaultMedicoId, medicos, medicoId])

  if (!open) return null

  const canCreate = permissions.exames_editar && !isReadOnly

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!nome.trim() || !medicoId || !dataSolicitado) {
      setErrorMessage('Nome do exame, médico e data de solicitação são obrigatórios.')
      return
    }

    if (!canCreate) {
      setErrorMessage(
        isReadOnly
          ? 'Assinatura expirada: renove seu plano para cadastrar exames.'
          : 'Você não tem permissão para cadastrar exames neste perfil.',
      )
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('nome', nome.trim())
      formData.append('tipo', tipo)
      formData.append('medico', medicoId)
      if (consultaId) formData.append('consulta_relacionada', consultaId)
      formData.append('data_solicitado', dataSolicitado)
      if (dataValidade) formData.append('data_validade', dataValidade)
      formData.append('status', status)

      // Monta data e hora estruturadas
      const agendamentoFinal = montarDataHoraAgendada(dataAgendada, horarioAgendado)
      if (agendamentoFinal) {
        formData.append('data_hora_agendada', agendamentoFinal)
      }
      if (localRealizacao.trim()) formData.append('local_realizacao', localRealizacao.trim())
      if (instrucoesPreparo.trim()) formData.append('instrucoes_preparo', instrucoesPreparo.trim())

      const historicoInicial: HistoricoStatusExame[] = [
        {
          status,
          data: new Date().toISOString(),
          observacao: 'Exame cadastrado via criação rápida no prontuário',
        },
      ]
      formData.append('historico_status', JSON.stringify(historicoInicial))

      const novo = await createExame(formData, activeProfile?.id)

      toast({
        title: 'Exame cadastrado!',
        description: `${nome} foi registrado e vinculado com sucesso.`,
      })

      triggerRefresh()
      // Limpar formulário
      setNome('')
      setDataAgendada('')
      setHorarioAgendado('')
      setLocalRealizacao('')
      setInstrucoesPreparo('')

      onSuccess(novo)
      onClose()
    } catch (err: any) {
      console.error('Erro ao cadastrar exame rápido:', err)
      setErrorMessage(err?.message || 'Erro ao cadastrar exame. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-7 shadow-2xl border border-[#D9E2D4] relative my-8 animate-scale-in max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-exame-title"
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
            <TestTube className="w-6 h-6" />
          </div>
          <div>
            <h3
              id="quick-exame-title"
              className="font-serif italic text-xl text-[#26362B] font-semibold"
            >
              Cadastrar novo exame
            </h3>
            <p className="text-xs text-[#6B7A6F]">
              {activeProfile?.nome ? (
                <>
                  Vinculado a: <strong className="text-[#26362B]">{activeProfile.nome}</strong>
                </>
              ) : (
                'Adicione um pedido ou agendamento de exame'
              )}
            </p>
          </div>
        </div>

        {isReadOnly && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Plano expirado:</strong> sua conta está em modo somente leitura.
            </span>
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
              Nome do exame <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Hemograma completo, Ultrassonografia..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoExame)}
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#26362B] uppercase tracking-wider">
                Médico solicitante <span className="text-red-500">*</span>
              </label>
              {onOpenNewMedico && (
                <button
                  type="button"
                  onClick={onOpenNewMedico}
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
              <option value="">Selecione o médico...</option>
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
                Data do pedido <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dataSolicitado}
                onChange={(e) => setDataSolicitado(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none min-h-[38px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1 uppercase tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusExame)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] text-xs focus:ring-2 focus:ring-[#4C7A5A] outline-none"
              >
                <option value="Pendente">Pendente</option>
                <option value="Agendado">Agendado</option>
                <option value="Realizado">Realizado</option>
                <option value="Finalizado">Finalizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Seção Estruturada: Agendamento e Local */}
          <div className="p-3.5 rounded-2xl bg-[#F6F4EF]/90 border border-[#D9E2D4] space-y-3">
            <span className="text-xs font-semibold text-[#26362B] uppercase tracking-wider block">
              Agendamento e Local de Coleta / Execução
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Data agendada
                </label>
                <input
                  type="date"
                  value={dataAgendada}
                  onChange={(e) => setDataAgendada(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A] min-h-[38px]"
                />
                <span className="text-[10px] text-[#6B7A6F] block mt-0.5">dd/mm/aaaa</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#26362B] mb-1">
                  Horário agendado
                </label>
                <input
                  type="time"
                  value={horarioAgendado}
                  onChange={(e) => setHorarioAgendado(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A] min-h-[38px]"
                />
                <span className="text-[10px] text-[#6B7A6F] block mt-0.5">hh:mm</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1">
                Local de realização
              </label>
              <input
                type="text"
                value={localRealizacao}
                onChange={(e) => setLocalRealizacao(e.target.value)}
                placeholder="Ex.: Laboratório Fleury - Jardins"
                className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#26362B] mb-1">
                Instruções de preparo do exame
              </label>
              <textarea
                rows={2}
                value={instrucoesPreparo}
                onChange={(e) => setInstrucoesPreparo(e.target.value)}
                placeholder="Ex.: Jejum de 12 horas; beber água..."
                className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A]"
              />
            </div>
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
                <span>Salvar exame</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
