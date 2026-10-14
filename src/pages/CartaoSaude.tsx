import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMedicamentos } from '@/services/healthService'
import type { Medicamento } from '@/types/health'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import {
  CreditCard,
  Printer,
  FileDown,
  Pill,
  Leaf,
  Clock,
  Heart,
  Calendar,
  Sparkles,
  Loader2,
} from 'lucide-react'

export default function CartaoSaude() {
  const { user } = useAuth()
  const { refreshKey } = useHealthRefresh()
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const data = await getMedicamentos()
      setMedicamentos(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  const activeMeds = medicamentos.filter((m) => m.status === 'ativo')

  const handlePrint = () => {
    window.print()
  }

  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Meu cartão de saúde
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Gere uma lista de medicamentos ativos diagramada para levar em consultas, viagens ou na
            carteira
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-sm font-semibold shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir cartão</span>
          </button>
        </div>
      </div>

      {/* Helpful Hint banner (no-print) */}
      <div className="no-print p-4 rounded-2xl bg-[#E7F0E3]/70 border border-[#DCE9D4] flex items-center justify-between gap-4 text-xs text-[#26362B]">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[#4C7A5A] shrink-0" />
          <span>
            Ao clicar em <strong>"Imprimir cartão"</strong>, o navegador isolará apenas a ficha
            abaixo em tamanho A4 retrato, ocultando o menu e cabeçalhos. Você também pode salvar
            como PDF na tela de impressão.
          </span>
        </div>
      </div>

      {/* Printable Card Container */}
      <div className="flex justify-center">
        {loading ? (
          <div className="text-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 text-[#4C7A5A] animate-spin mx-auto" />
            <p className="text-sm font-serif italic text-[#26362B]">
              Montando seu cartão de saúde...
            </p>
          </div>
        ) : (
          <div className="print-card-container w-full max-w-[800px] bg-white rounded-3xl p-8 md:p-12 border-2 border-[#4C7A5A]/30 shadow-lg relative overflow-hidden">
            {/* Top Organic decorative badge */}
            <div className="flex items-start justify-between pb-6 border-b-2 border-[#4C7A5A]/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#4C7A5A] text-white flex items-center justify-center shadow">
                  <Leaf className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-serif italic font-bold text-2xl text-[#26362B] block leading-tight">
                    VerdeVida
                  </span>
                  <span className="text-[11px] text-[#4C7A5A] font-semibold uppercase tracking-wider">
                    Cartão de Saúde Pessoal
                  </span>
                </div>
              </div>

              <div className="text-right text-xs text-[#6B7A6F]">
                <p className="font-semibold text-[#26362B]">Emissão do cartão:</p>
                <p>{currentDateFormatted}</p>
              </div>
            </div>

            {/* Patient Name Heading */}
            <div className="my-6">
              <h2 className="font-serif italic text-2xl md:text-3xl text-[#26362B] font-semibold">
                Meus Medicamentos — {user?.name || user?.email || 'Titular'}
              </h2>
              <p className="text-xs text-[#6B7A6F] mt-1">
                Apresente este cartão ao seu médico, farmacêutico ou em casos de urgência
                hospitalar.
              </p>
            </div>

            {/* Empty State */}
            {activeMeds.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#E7F0E3] text-[#4C7A5A] flex items-center justify-center mx-auto">
                  <Pill className="w-6 h-6" />
                </div>
                <p className="font-serif italic text-lg text-[#26362B]">
                  Nenhum medicamento ativo no momento.
                </p>
                <p className="text-xs text-[#6B7A6F]">
                  Assim que você cadastrar novos remédios na aba "Meus Medicamentos", eles
                  aparecerão automaticamente aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeMeds.map((m, index) => {
                  const horariosList = Array.isArray(m.horarios) ? m.horarios : []
                  return (
                    <div
                      key={m.id}
                      className="py-4 border-b border-dashed border-[#A8C3A0] last:border-b-0 space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#E7F0E3] text-[#4C7A5A] font-bold text-xs flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-serif italic text-lg text-[#26362B] font-semibold">
                            {m.nome}
                          </span>
                          <span className="text-sm font-medium text-[#4C7A5A]">
                            ({m.dosagem} — {m.forma})
                          </span>
                        </div>

                        {/* Prescriber */}
                        <span className="text-xs text-[#6B7A6F]">
                          Prescritor:{' '}
                          <strong className="text-[#26362B]">
                            {m.expand?.medico?.nome || 'Não especificado'}
                          </strong>
                        </span>
                      </div>

                      {/* Schedule & Notes */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#385942] pl-7">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#4C7A5A]" />
                          <span>
                            Horários:{' '}
                            <strong className="text-[#26362B]">
                              {horariosList.length > 0
                                ? horariosList.join(', ')
                                : 'Conforme prescrição'}
                            </strong>
                          </span>
                        </div>

                        {m.laboratorio && (
                          <span>
                            Lab: <strong>{m.laboratorio}</strong>
                          </span>
                        )}

                        {m.observacoes && (
                          <span className="italic text-[#6B7A6F]">• "{m.observacoes}"</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Bottom Card Footer */}
            <div className="mt-8 pt-6 border-t-2 border-[#4C7A5A]/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6B7A6F]">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#4C7A5A]" />
                <span>Mantenha este documento atualizado a cada consulta médica.</span>
              </div>
              <span className="font-serif italic text-[11px] text-[#4C7A5A]">
                VerdeVida — saúde controlada pelo próprio usuário
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
