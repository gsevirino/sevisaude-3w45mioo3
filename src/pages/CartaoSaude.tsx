import { useState, useEffect, useRef } from 'react'
import { getMedicamentos } from '@/services/healthService'
import type { Medicamento } from '@/types/health'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { formatarData } from '@/lib/dateUtils'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import {
  CreditCard,
  Printer,
  Clock,
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  Check,
  Calendar,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileText,
  User,
  Activity,
  Layers,
} from 'lucide-react'
import { SeviSaudeIcon } from '@/components/SeviSaudeLogo'

export default function CartaoSaude() {
  const { user } = useAuth()
  const { activeProfile, isOwner } = useHealthProfile()
  const { refreshKey } = useHealthRefresh()
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [loading, setLoading] = useState(true)

  // Seleção de itens pelo usuário para constar no cartão
  const [selectedMeds, setSelectedMeds] = useState<string[]>([])
  const [includeAlergias, setIncludeAlergias] = useState(true)
  const [includeCondicoes, setIncludeCondicoes] = useState(true)
  const [includeEmergencia, setIncludeEmergencia] = useState(true)
  const [includeHorarios, setIncludeHorarios] = useState(true)

  // Modo de visualização: compacto (tamanho padrão cartão de visita / bancário frente e verso) vs ampliado (folha completa / expandido)
  const [formatoAmpliado, setFormatoAmpliado] = useState(false)

  const printAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const profId = activeProfile?.id
        const meds = await getMedicamentos(profId)
        // Apenas medicamentos "em uso"
        const emUso = meds.filter((m) => m.status === 'em uso')
        setMedicamentos(emUso)
        // Por padrão, todos os em uso ficam selecionados
        setSelectedMeds(emUso.map((m) => m.id))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey, activeProfile?.id])

  const toggleMed = (id: string) => {
    setSelectedMeds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const medsToDisplay = medicamentos.filter((m) => selectedMeds.includes(m.id))

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header (oculto na impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Meu cartão de saúde
          </h1>
          <p className="text-[#6B7A6F] text-sm mt-1">
            Gere seu cartão compacto de emergência (frente e verso) com medicamentos em uso,
            alergias e contatos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFormatoAmpliado(!formatoAmpliado)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#D9E2D4] bg-white hover:bg-[#F6F4EF] text-xs font-semibold text-[#26362B] transition cursor-pointer"
          >
            {formatoAmpliado ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Formato Cartão Compacto</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Formato Folha Ampliada</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Seletor de Informações (Oculto na impressão) */}
      <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm space-y-5 print:hidden">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-[#4C7A5A]" />
          <h2 className="font-serif italic text-lg text-[#26362B] font-semibold">
            Personalizar dados exibidos no Cartão
          </h2>
        </div>

        {/* Opções globais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <label className="flex items-center gap-2 p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] cursor-pointer hover:bg-[#E7F0E3]/60 transition">
            <input
              type="checkbox"
              checked={includeAlergias}
              onChange={(e) => setIncludeAlergias(e.target.checked)}
              className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
            />
            <span className="font-semibold text-[#26362B]">Alergias conhecidas</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] cursor-pointer hover:bg-[#E7F0E3]/60 transition">
            <input
              type="checkbox"
              checked={includeCondicoes}
              onChange={(e) => setIncludeCondicoes(e.target.checked)}
              className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
            />
            <span className="font-semibold text-[#26362B]">Condições de saúde</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] cursor-pointer hover:bg-[#E7F0E3]/60 transition">
            <input
              type="checkbox"
              checked={includeEmergencia}
              onChange={(e) => setIncludeEmergencia(e.target.checked)}
              className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
            />
            <span className="font-semibold text-[#26362B]">Contato de emergência</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] cursor-pointer hover:bg-[#E7F0E3]/60 transition">
            <input
              type="checkbox"
              checked={includeHorarios}
              onChange={(e) => setIncludeHorarios(e.target.checked)}
              className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
            />
            <span className="font-semibold text-[#26362B]">Horários de tomada</span>
          </label>
        </div>

        {/* Seleção de medicamentos */}
        <div>
          <span className="block text-xs font-semibold text-[#26362B] mb-2 uppercase tracking-wider">
            Selecione quais medicamentos em uso incluir:
          </span>
          {medicamentos.length === 0 ? (
            <p className="text-xs text-[#6B7A6F] italic">
              Nenhum medicamento com status "em uso" encontrado no seu prontuário.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {medicamentos.map((m) => {
                const isSelected = selectedMeds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMed(m.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#4C7A5A] text-white border-[#4C7A5A]'
                        : 'bg-white text-[#6B7A6F] border-[#D9E2D4] hover:bg-[#F6F4EF]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{m.nome}</span>
                    <span className="opacity-80 text-[10px]">
                      (
                      {m.dose_prescrita
                        ? `${m.dose_prescrita} ${m.unidade_dose || ''}`
                        : m.concentracao || m.dosagem || 'dose padrão'}
                      )
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Alerta de privacidade */}
        <div className="p-3 rounded-2xl bg-[#F6F4EF] text-xs text-[#6B7A6F] flex items-center gap-2 border border-[#D9E2D4]">
          <ShieldCheck className="w-4 h-4 text-[#4C7A5A] shrink-0" />
          <span>
            <strong>Privacidade preservada:</strong> CPF, RG e endereço residencial completo são
            omitidos por padrão do cartão impresso para prevenir fraudes em caso de perda.
          </span>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO / PRÉVIA DO CARTÃO */}
      <div ref={printAreaRef} className="space-y-6">
        {!formatoAmpliado ? (
          /* FORMATO COMPACTO DE CARTÃO (Tamanho aproximado de cartão bancário / carteira frente e verso) */
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-4">
            {/* FRENTE DO CARTÃO (85.6mm x 53.98mm aprox ratio) */}
            <div className="w-full max-w-[420px] min-h-[250px] bg-gradient-to-br from-[#26362B] via-[#2F4435] to-[#1C281F] text-white rounded-3xl p-6 shadow-xl border border-white/20 flex flex-col justify-between relative overflow-hidden">
              {/* Marca d'água sutil */}
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />

              <div>
                <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#4C7A5A] flex items-center justify-center p-1">
                      <SeviSaudeIcon size={18} variant="light" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-0.5 leading-none">
                        <span className="font-serif italic text-base font-bold tracking-wide text-white">
                          Sevi
                        </span>
                        <span className="font-serif italic text-base font-bold tracking-wide text-[#74C69D]">
                          Saúde
                        </span>
                      </div>
                      <span className="block text-[8px] uppercase tracking-widest text-[#DCE9D4] mt-0.5">
                        Cartão de Emergência
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full font-semibold border border-white/10">
                    Frente
                  </span>
                </div>

                {/* Nome do Paciente */}
                <div className="mt-3">
                  <span className="text-[9px] uppercase tracking-wider text-white/60 block">
                    Titular do Prontuário
                  </span>
                  <h3 className="font-serif italic text-xl font-bold text-white tracking-wide">
                    {activeProfile?.nome || user?.name || 'Paciente SeviSaúde'}
                  </h3>
                  {(activeProfile?.data_nascimento || user?.meta?.dataNascimento) && (
                    <span className="text-[10px] text-white/80">
                      Nasc:{' '}
                      {formatarData(activeProfile?.data_nascimento || user?.meta?.dataNascimento)}
                    </span>
                  )}
                </div>

                {/* Alergias Conhecidas */}
                {includeAlergias && (
                  <div className="mt-3 p-2 rounded-xl bg-red-950/40 border border-red-500/30">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      Alergias e reações adversas:
                    </span>
                    <p className="text-[10px] text-red-100 font-medium leading-tight mt-0.5">
                      {activeProfile?.alergias ||
                        user?.alergias ||
                        'Nenhuma alergia conhecida relatada'}
                    </p>
                  </div>
                )}

                {/* Condições Clínicas */}
                {includeCondicoes && (activeProfile?.condicoes_saude || user?.condicoes_saude) && (
                  <div className="mt-2 text-[10px] text-white/90">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60 block">
                      Condições de saúde:
                    </span>
                    <p className="leading-tight">
                      {activeProfile?.condicoes_saude || user?.condicoes_saude}
                    </p>
                  </div>
                )}
              </div>

              {/* Contato de emergência no rodapé da frente */}
              {includeEmergencia && (
                <div className="pt-2 mt-2 border-t border-white/15 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-[#DCE9D4]" />
                    <span>
                      Emergência:{' '}
                      <strong>
                        {activeProfile?.contato_emergencia_nome ||
                          user?.contato_emergencia_nome ||
                          'A definir'}
                      </strong>{' '}
                      {activeProfile?.contato_emergencia_parentesco ||
                      user?.contato_emergencia_parentesco
                        ? `(${activeProfile?.contato_emergencia_parentesco || user?.contato_emergencia_parentesco})`
                        : ''}
                    </span>
                  </div>
                  <strong className="text-[#DCE9D4] font-mono">
                    {activeProfile?.contato_emergencia_telefone ||
                      user?.contato_emergencia_telefone ||
                      '—'}
                  </strong>
                </div>
              )}
            </div>

            {/* VERSO DO CARTÃO (Medicamentos em uso detalhados) */}
            <div className="w-full max-w-[420px] min-h-[250px] bg-[#FDFCFB] text-[#26362B] rounded-3xl p-6 shadow-xl border-2 border-[#D9E2D4] flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between border-b border-[#D9E2D4] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#4C7A5A]">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Medicamentos em uso contínuo</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider bg-[#E7F0E3] px-2 py-0.5 rounded-full font-bold text-[#26362B]">
                    Verso
                  </span>
                </div>

                {/* Lista de medicamentos compacta */}
                <div className="mt-2.5 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {medsToDisplay.length === 0 ? (
                    <p className="text-[11px] text-[#6B7A6F] italic text-center py-4">
                      Nenhum medicamento selecionado.
                    </p>
                  ) : (
                    medsToDisplay.map((m) => {
                      const doseText = m.dose_prescrita
                        ? `${m.dose_prescrita} ${m.unidade_dose || ''}`
                        : m.concentracao || m.dosagem || ''
                      const freqText = m.frequencia || ''
                      const horarios =
                        includeHorarios && Array.isArray(m.horarios) && m.horarios.length > 0
                          ? m.horarios.join(', ')
                          : ''

                      return (
                        <div
                          key={m.id}
                          className="text-[10px] p-1.5 rounded-lg bg-[#F6F4EF] border border-[#D9E2D4]/70 flex items-start justify-between gap-1"
                        >
                          <div>
                            <strong className="text-[#26362B] block leading-tight">{m.nome}</strong>
                            <span className="text-[#4C7A5A] font-medium block">
                              {doseText} {m.via_administracao ? `• ${m.via_administracao}` : ''}{' '}
                              {freqText ? `• ${freqText}` : ''}
                            </span>
                          </div>
                          {horarios && (
                            <span className="font-mono text-[9px] text-[#26362B] font-semibold bg-white px-1.5 py-0.5 rounded border border-[#D9E2D4] shrink-0">
                              {horarios}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Rodapé com aviso obrigatório e data de atualização */}
              <div className="pt-2 border-t border-[#D9E2D4] text-[9px] text-[#6B7A6F] space-y-0.5">
                <p className="font-semibold text-amber-900 text-[8.5px] italic">
                  Aviso: confira as informações com as prescrições médicas atuais.
                </p>
                <div className="flex items-center justify-between">
                  <span>Atualizado em: {currentDate}</span>
                  <span>SeviSaúde Prontuário Pessoal</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* FORMATO FOLHA AMPLIADA (Para guardar na bolsa, pasta de exames ou fixar na porta da geladeira) */
          <div className="bg-white rounded-3xl p-8 md:p-10 border-2 border-[#D9E2D4] shadow-md max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b-2 border-[#D9E2D4] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#4C7A5A] text-white flex items-center justify-center p-1.5">
                  <SeviSaudeIcon size={24} variant="light" />
                </div>
                <div>
                  <h2 className="font-serif italic text-2xl font-bold text-[#26362B]">
                    SeviSaúde — Cartão Clínico do Paciente
                  </h2>
                  <p className="text-xs text-[#6B7A6F]">Prontuário Pessoal e Ficha de Emergência</p>
                </div>
              </div>
              <div className="text-right text-xs text-[#6B7A6F]">
                <span>Última atualização:</span>
                <strong className="block text-[#26362B]">{currentDate}</strong>
              </div>
            </div>

            {/* Dados do Paciente */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] text-xs">
              <div>
                <span className="text-[#6B7A6F] block">Nome do Titular:</span>
                <strong className="text-sm text-[#26362B]">
                  {activeProfile?.nome || user?.name || 'Paciente'}
                </strong>
              </div>
              <div>
                <span className="text-[#6B7A6F] block">Contato de Emergência:</span>
                <strong className="text-sm text-[#26362B]">
                  {activeProfile?.contato_emergencia_nome || user?.contato_emergencia_nome || '—'}{' '}
                  {activeProfile?.contato_emergencia_telefone || user?.contato_emergencia_telefone
                    ? `• ${activeProfile?.contato_emergencia_telefone || user?.contato_emergencia_telefone}`
                    : ''}
                </strong>
              </div>
            </div>

            {/* Alergias e Condições */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {includeAlergias && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs">
                  <span className="font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Alergias e reações adversas
                  </span>
                  <p className="text-red-950 font-medium">
                    {user?.alergias || 'Nenhuma alergia conhecida declarada.'}
                  </p>
                </div>
              )}

              {includeCondicoes && (
                <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] text-xs">
                  <span className="font-bold uppercase tracking-wider text-[#26362B] block mb-1">
                    Condições de saúde relevantes
                  </span>
                  <p className="text-[#385942]">
                    {user?.condicoes_saude || 'Nenhuma condição crônica registrada.'}
                  </p>
                </div>
              )}
            </div>

            {/* Medicamentos em uso tabela detalhada */}
            <div className="space-y-3">
              <span className="font-bold uppercase tracking-wider text-xs text-[#26362B] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#4C7A5A]" />
                Medicamentos em uso e posologia atual
              </span>

              <div className="border border-[#D9E2D4] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F4EF] border-b border-[#D9E2D4] text-[#6B7A6F]">
                    <tr>
                      <th className="p-3">Medicamento</th>
                      <th className="p-3">Dose / Via</th>
                      <th className="p-3">Frequência</th>
                      {includeHorarios && <th className="p-3">Horários</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E2D4]">
                    {medsToDisplay.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-semibold text-[#26362B]">
                          {m.nome}
                          {m.principio_ativo && (
                            <span className="block text-[10px] text-[#6B7A6F] font-normal">
                              ({m.principio_ativo})
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {m.dose_prescrita
                            ? `${m.dose_prescrita} ${m.unidade_dose || ''}`
                            : m.concentracao || m.dosagem || '—'}
                          {m.via_administracao && ` • ${m.via_administracao}`}
                        </td>
                        <td className="p-3">{m.frequencia || 'Conforme receita'}</td>
                        {includeHorarios && (
                          <td className="p-3 font-mono text-[#4C7A5A]">
                            {Array.isArray(m.horarios) ? m.horarios.join(', ') : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aviso Obrigatório */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  Aviso de Segurança ao Paciente e Profissionais:
                </span>
                <p>
                  Confira sempre as informações com as prescrições médicas atuais. Em caso de
                  dúvidas, consulte seu médico assistente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dica de impressão */}
      <div className="bg-[#F6F4EF] rounded-3xl p-5 border border-[#D9E2D4] text-xs text-[#6B7A6F] flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-[#4C7A5A]" />
          <span>
            Dica: no diálogo de impressão do navegador, selecione <strong>"Salvar como PDF"</strong>{' '}
            para ter o cartão salvo no celular.
          </span>
        </div>
      </div>
    </div>
  )
}
