import { useState, useEffect, useRef } from 'react'
import { getMedicamentos } from '@/services/healthService'
import type { Medicamento } from '@/types/health'
import { formatarPeriodicidadeLegivel, formatarDoseComUnidade } from '@/lib/medicamentoUtils'
import { useAuth } from '@/context/AuthContext'
import { useHealthProfile } from '@/context/HealthProfileContext'
import ProfileContextBadge from '@/components/ProfileContextBadge'
import { formatarData } from '@/lib/dateUtils'
import { useHealthRefresh } from '@/context/HealthRefreshContext'
import {
  Printer,
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  Check,
  AlertCircle,
  Maximize2,
  Minimize2,
  Activity,
  Layers,
  Download,
  FileCheck,
  CreditCard,
  Droplet,
  Info,
  Sliders,
} from 'lucide-react'
import { SeviSaudeIcon } from '@/components/SeviSaudeLogo'
import {
  exportarCartaoSaudeA4,
  exportarCartaoSaudeDireto,
  type CartaoDados,
} from '@/services/cartaoPdfService'

export default function CartaoSaude() {
  const { user } = useAuth()
  const { activeProfile } = useHealthProfile()
  const { refreshKey } = useHealthRefresh()
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [loading, setLoading] = useState(true)

  // Seleção de itens pelo usuário para constar no cartão
  const [selectedMeds, setSelectedMeds] = useState<string[]>([])
  const [includeAlergias, setIncludeAlergias] = useState(true)
  const [includeCondicoes, setIncludeCondicoes] = useState(true)
  const [includeEmergencia, setIncludeEmergencia] = useState(true)
  const [includeTipoSanguineo, setIncludeTipoSanguineo] = useState(true)

  // Campo opcional do cartão: Nome do Plano de Saúde ou SUS
  const [planoSaudeOuSus, setPlanoSaudeOuSus] = useState<string>('')

  // Modo de visualização da página: formato compacto de carteirinha (96×65 mm) vs folha ampliada A4
  const [formatoAmpliado, setFormatoAmpliado] = useState(false)

  // Escala de zoom da prévia na tela: 100% (tamanho real ~363×246px a 96dpi), 125% ou 140% para conforto visual
  const [escalaPrevia, setEscalaPrevia] = useState<'real' | 'conforto' | 'grande'>('conforto')

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

  // Inicializar planoSaudeOuSus a partir do perfil se houver informações em observacoes ou meta
  useEffect(() => {
    if (activeProfile?.observacoes?.toLowerCase().includes('sus')) {
      setPlanoSaudeOuSus('SUS')
    } else if (activeProfile?.observacoes?.toLowerCase().includes('unimed')) {
      setPlanoSaudeOuSus('Unimed')
    }
  }, [activeProfile])

  const toggleMed = (id: string) => {
    setSelectedMeds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const medsToDisplay = medicamentos.filter((m) => selectedMeds.includes(m.id))

  // Dados consolidados do titular selecionado no seletor de topo
  const nomeTitular = activeProfile?.nome || user?.name || 'Paciente SeviSaúde'
  const dataNascimento = activeProfile?.data_nascimento || user?.meta?.dataNascimento
  const tipoSanguineo = (activeProfile?.tipo_sanguineo || '').trim()
  const alergiasTexto = activeProfile?.alergias || user?.alergias || ''
  const condicoesTexto = activeProfile?.condicoes_saude || user?.condicoes_saude || ''
  const contatoEmergenciaNome =
    activeProfile?.contato_emergencia_nome || user?.contato_emergencia_nome || ''
  const contatoEmergenciaParentesco =
    activeProfile?.contato_emergencia_parentesco || user?.contato_emergencia_parentesco || ''
  const contatoEmergenciaTelefone =
    activeProfile?.contato_emergencia_telefone || user?.contato_emergencia_telefone || ''

  // Monta payload unificado para exportação milimétrica em PDF
  const dadosCartao: CartaoDados = {
    profile: activeProfile,
    nomeTitular,
    dataNascimento,
    tipoSanguineo: includeTipoSanguineo ? tipoSanguineo : '',
    alergias: includeAlergias ? alergiasTexto : '',
    condicoesSaude: includeCondicoes ? condicoesTexto : '',
    contatoEmergenciaNome: includeEmergencia ? contatoEmergenciaNome : '',
    contatoEmergenciaParentesco: includeEmergencia ? contatoEmergenciaParentesco : '',
    contatoEmergenciaTelefone: includeEmergencia ? contatoEmergenciaTelefone : '',
    planoSaudeOuSus,
    medicamentos: medsToDisplay,
    dataAtualizacao: currentDate,
  }

  // Ações de exportação em PDF
  const handleExportarA4 = () => {
    const slug = nomeTitular.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    exportarCartaoSaudeA4(dadosCartao, `cartao-saude-${slug}-96x65mm-a4.pdf`)
  }

  const handleExportarDireto = () => {
    const slug = nomeTitular.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    exportarCartaoSaudeDireto(dadosCartao, `carteirinha-${slug}-96x65mm.pdf`)
  }

  const handlePrint = () => {
    window.print()
  }

  // Larguras para cada nível de escala visual na tela (mantendo proporção exata 96 : 65)
  // Tamanho 1:1 físico em 96dpi = 96 / 25.4 * 96 ≈ 363px x 246px
  const widthClasses = {
    real: 'w-[363px] h-[246px]', // 100% escala real aproximada de tela (96dpi)
    conforto: 'w-[420px] h-[284px]', // ~115% (leitura confortável em monitores)
    grande: 'w-[480px] h-[325px]', // ~132% (para visualização ampliada)
  }[escalaPrevia]

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header com identificação do titular ativo e ações de impressão */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ProfileContextBadge />
            <span className="text-[11px] font-semibold text-[#4C7A5A] uppercase tracking-wider bg-[#E7F0E3] px-2.5 py-0.5 rounded-full">
              Formato Físico 96 × 65 mm
            </span>
          </div>
          <h1 className="font-serif italic text-3xl md:text-4xl text-[#26362B] font-semibold tracking-tight">
            Meu cartão de saúde
          </h1>
          <p className="text-[#6B7A6F] text-xs md:text-sm mt-1 max-w-2xl">
            Carteirinha física frente e verso padronizada em <strong>96 mm × 65 mm</strong> (formato
            carteirinha/plastificado), contendo identificação, alergias, contato de emergência e
            lista compacta com o nome dos medicamentos em uso no verso.
          </p>{' '}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Alternar formato ampliado (tabela expandida) vs formato carteirinha */}
          <button
            onClick={() => setFormatoAmpliado(!formatoAmpliado)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#D9E2D4] bg-white hover:bg-[#F6F4EF] text-xs font-semibold text-[#26362B] transition cursor-pointer shadow-sm"
          >
            {formatoAmpliado ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Modo Carteirinha (96×65 mm)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Modo Folha Ampliada</span>
              </>
            )}
          </button>

          {/* Download PDF direto 96x65 mm */}
          <button
            onClick={handleExportarDireto}
            title="Gera PDF com páginas no tamanho exato 96 mm x 65 mm"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#4C7A5A] bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#26362B] text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#4C7A5A]" />
            <span>PDF Direto (96×65 mm)</span>
          </button>

          {/* Download PDF A4 com marca de corte */}
          <button
            onClick={handleExportarA4}
            title="Gera PDF em folha A4 com marca de recorte, dobra e régua de conferência"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Baixar PDF A4 para Recorte</span>
          </button>

          {/* Diálogo nativo do navegador */}
          <button
            onClick={handlePrint}
            title="Abre a tela de impressão do navegador"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#D9E2D4] bg-white hover:bg-[#F6F4EF] text-[#26362B] text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-[#6B7A6F]" />
            <span className="sr-only sm:not-sr-only">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Caixa de personalização e dados exibidos (Oculta na impressão) */}
      <div className="bg-white rounded-3xl p-6 border border-[#D9E2D4] shadow-sm space-y-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9E2D4] pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#4C7A5A]" />
            <div>
              <h2 className="font-serif italic text-lg text-[#26362B] font-semibold">
                Personalizar dados do Cartão de 96×65 mm
              </h2>
              <p className="text-[11px] text-[#6B7A6F]">
                Ajuste os dados que entram na carteirinha do titular selecionado: {nomeTitular}
              </p>
            </div>
          </div>

          {/* Seletor de Escala da Prévia em tela */}
          {!formatoAmpliado && (
            <div className="flex items-center gap-1.5 bg-[#F6F4EF] p-1 rounded-2xl border border-[#D9E2D4] text-xs">
              <span className="text-[10px] uppercase font-bold text-[#6B7A6F] px-2">Escala:</span>
              <button
                type="button"
                onClick={() => setEscalaPrevia('real')}
                className={`px-2.5 py-1 rounded-xl font-medium transition cursor-pointer text-[11px] ${
                  escalaPrevia === 'real'
                    ? 'bg-white text-[#26362B] shadow-xs font-semibold'
                    : 'text-[#6B7A6F] hover:text-[#26362B]'
                }`}
              >
                100% Real
              </button>
              <button
                type="button"
                onClick={() => setEscalaPrevia('conforto')}
                className={`px-2.5 py-1 rounded-xl font-medium transition cursor-pointer text-[11px] ${
                  escalaPrevia === 'conforto'
                    ? 'bg-white text-[#26362B] shadow-xs font-semibold'
                    : 'text-[#6B7A6F] hover:text-[#26362B]'
                }`}
              >
                115% Conforto
              </button>
              <button
                type="button"
                onClick={() => setEscalaPrevia('grande')}
                className={`px-2.5 py-1 rounded-xl font-medium transition cursor-pointer text-[11px] ${
                  escalaPrevia === 'grande'
                    ? 'bg-white text-[#26362B] shadow-xs font-semibold'
                    : 'text-[#6B7A6F] hover:text-[#26362B]'
                }`}
              >
                130% Grande
              </button>
            </div>
          )}
        </div>

        {/* Opções de campos opcionais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
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
              checked={includeTipoSanguineo}
              onChange={(e) => setIncludeTipoSanguineo(e.target.checked)}
              className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A]"
            />
            <span className="font-semibold text-[#26362B]">Grupo sanguíneo</span>
          </label>
        </div>

        {/* Identificação de Plano de Saúde ou SUS */}
        <div className="p-4 rounded-2xl bg-[#FDFCFB] border border-[#D9E2D4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#4C7A5A]" />
              <label
                htmlFor="plano-input"
                className="text-xs font-semibold text-[#26362B] block cursor-pointer"
              >
                Nome do Plano de Saúde / SUS (opcional)
              </label>
            </div>
            <p className="text-[11px] text-[#6B7A6F]">
              Exibido no canto superior do cartão para identificação rápida em postos de atendimento
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              id="plano-input"
              type="text"
              value={planoSaudeOuSus}
              onChange={(e) => setPlanoSaudeOuSus(e.target.value)}
              placeholder="Ex.: SUS, Unimed, Bradesco Saúde, Amil"
              className="px-3 py-1.5 rounded-xl border border-[#D9E2D4] text-xs outline-none focus:ring-2 focus:ring-[#4C7A5A] w-full sm:w-64 bg-white"
            />
          </div>
        </div>

        {/* Seleção de medicamentos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-xs font-semibold text-[#26362B] uppercase tracking-wider">
              Medicamentos em uso a incluir no verso ({medsToDisplay.length}/{medicamentos.length}):
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedMeds(medicamentos.map((m) => m.id))}
                className="text-[#4C7A5A] hover:underline font-medium"
              >
                Selecionar todos
              </button>
              <span className="text-[#D9E2D4]">|</span>
              <button
                type="button"
                onClick={() => setSelectedMeds([])}
                className="text-[#6B7A6F] hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-[#6B7A6F] italic">
              Carregando medicamentos do prontuário...
            </p>
          ) : medicamentos.length === 0 ? (
            <p className="text-xs text-[#6B7A6F] italic bg-[#F6F4EF] p-3 rounded-xl border border-[#D9E2D4]">
              Nenhum medicamento com status "em uso" encontrado no prontuário deste titular.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {medicamentos.map((m) => {
                const isSelected = selectedMeds.includes(m.id)
                const doseFlex = m.dose_prescrita
                  ? formatarDoseComUnidade(m.dose_prescrita, m.unidade_dose || m.forma || '')
                  : m.concentracao || m.dosagem || ''
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
                    {doseFlex && <span className="opacity-80 text-[10px]">({doseFlex})</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Regra médica mantida */}
        <div className="p-3 rounded-2xl bg-[#E7F0E3]/70 text-xs text-[#26362B] flex items-center gap-2 border border-[#D9E2D4]">
          <Info className="w-4 h-4 text-[#4C7A5A] shrink-0" />
          <span>
            <strong>Diretriz do Verso do Cartão:</strong> exibe apenas o{' '}
            <strong>nome de cada medicamento</strong> (sem dose, sem quantidade e sem horários) para
            que toda a lista caiba com máxima legibilidade no formato físico 96 × 65 mm.
          </span>
        </div>
      </div>

      {/* ÁREA DE PRÉVIA DO CARTÃO / IMPRESSÃO */}
      <div ref={printAreaRef} className="space-y-6">
        {!formatoAmpliado ? (
          /* =========================================================================
             FORMATO FÍSICO DE CARTEIRINHA (96 mm x 65 mm — Proporção exata 96:65)
             ========================================================================= */
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs text-[#6B7A6F] print:hidden">
              <span className="font-semibold text-[#26362B]">
                Dimensão real impressa: 96 mm × 65 mm
              </span>
              <span>•</span>
              <span>Proporção 96:65</span>
              <span>•</span>
              <span className="bg-[#E7F0E3] text-[#4C7A5A] px-2 py-0.5 rounded-full text-[10px] font-bold">
                Escala em tela:{' '}
                {escalaPrevia === 'real'
                  ? '100% Real'
                  : escalaPrevia === 'conforto'
                    ? '115%'
                    : '130%'}
              </span>
            </div>

            <div className="flex flex-col xl:flex-row items-center justify-center gap-6 py-2">
              {/* ======================= FRENTE DO CARTÃO (96×65 mm) ======================= */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-bold text-[#4C7A5A] uppercase tracking-wider print:hidden">
                  Frente • 96 × 65 mm
                </span>

                <div
                  className={`${widthClasses} transition-all duration-200 bg-[#FDFCFB] text-[#26362B] rounded-2xl p-4 shadow-md border-2 border-[#D9E2D4] flex flex-col justify-between relative overflow-hidden select-none`}
                  style={{ aspectRatio: '96 / 65' }}
                >
                  {/* Faixa decorativa sutil no topo */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#4C7A5A]" />

                  {/* 1. Topo: Logo SeviSaúde + Tag do Plano/SUS */}
                  <div>
                    <div className="flex items-center justify-between border-b border-[#D9E2D4]/70 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#4C7A5A] text-white flex items-center justify-center shrink-0">
                          <SeviSaudeIcon size={16} variant="light" />
                        </div>
                        <div className="leading-none">
                          <div className="flex items-baseline gap-0.5">
                            <span className="font-serif italic text-sm font-semibold text-[#26362B]">
                              Sevi
                            </span>
                            <span className="font-serif italic text-sm font-bold text-[#4C7A5A]">
                              Saúde
                            </span>
                          </div>
                          <span className="text-[7.5px] uppercase tracking-widest text-[#6B7A6F] font-medium block">
                            Cartão de Saúde
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] font-bold uppercase tracking-wider bg-[#E7F0E3] text-[#26362B] px-2 py-0.5 rounded-full border border-[#D9E2D4]">
                          {planoSaudeOuSus.trim() || 'SUS / Particular'}
                        </span>
                        <span className="text-[7.5px] font-semibold text-[#6B7A6F] bg-white px-1.5 py-0.5 rounded-md border border-[#D9E2D4]">
                          Frente
                        </span>
                      </div>
                    </div>

                    {/* 2. Titular do Prontuário + Nascimento + Tipo Sanguíneo */}
                    <div className="mt-2.5">
                      <span className="text-[7.5px] uppercase tracking-widest text-[#6B7A6F] font-bold block">
                        Titular do Prontuário
                      </span>
                      <h3 className="font-serif italic text-base md:text-lg font-bold text-[#26362B] tracking-wide leading-tight truncate">
                        {nomeTitular}
                      </h3>

                      <div className="flex items-center gap-2 mt-0.5 text-[9px] text-[#6B7A6F]">
                        <span>
                          Nasc.:{' '}
                          <strong className="text-[#26362B]">
                            {dataNascimento ? formatarData(dataNascimento) : 'Não informada'}
                          </strong>
                        </span>

                        {includeTipoSanguineo && tipoSanguineo && (
                          <span className="inline-flex items-center gap-0.5 bg-[#E7F0E3] text-[#26362B] px-1.5 py-0.2 rounded-md font-bold text-[8.5px] border border-[#D9E2D4]">
                            <Droplet className="w-2.5 h-2.5 text-red-600 fill-red-600" />
                            {tipoSanguineo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. Box de Alergias */}
                    {includeAlergias && (
                      <div
                        className={`mt-2 p-1.5 rounded-xl border text-[8.5px] leading-tight ${
                          alergiasTexto && !alergiasTexto.toLowerCase().includes('nenhum')
                            ? 'bg-red-50/90 border-red-200 text-red-950'
                            : 'bg-[#F6F4EF] border-[#D9E2D4] text-[#26362B]'
                        }`}
                      >
                        <span className="font-bold uppercase tracking-wider text-[7.5px] flex items-center gap-1 text-red-800">
                          <AlertTriangle className="w-2.5 h-2.5 text-red-600 shrink-0" />
                          Alergias e reações adversas:
                        </span>
                        <p className="font-medium mt-0.5 line-clamp-2">
                          {alergiasTexto.trim() || 'Nenhuma alergia conhecida relatada'}
                        </p>
                      </div>
                    )}

                    {/* Condições Clínicas se couber / ativado */}
                    {includeCondicoes && condicoesTexto && (
                      <div className="mt-1 text-[8px] text-[#6B7A6F] line-clamp-1">
                        <strong className="text-[#26362B]">Condições:</strong> {condicoesTexto}
                      </div>
                    )}
                  </div>

                  {/* 4. Rodapé da Frente: Contato de Emergência */}
                  {includeEmergencia && (
                    <div className="pt-1.5 border-t border-[#D9E2D4] bg-[#F6F4EF]/70 -mx-4 -mb-4 px-3 py-2 rounded-b-2xl flex items-center justify-between text-[8.5px]">
                      <div className="flex items-center gap-1 truncate max-w-[65%]">
                        <PhoneCall className="w-3 h-3 text-[#4C7A5A] shrink-0" />
                        <span className="truncate">
                          Emergência:{' '}
                          <strong className="text-[#26362B]">
                            {contatoEmergenciaNome || 'A definir'}
                          </strong>
                          {contatoEmergenciaParentesco && ` (${contatoEmergenciaParentesco})`}
                        </span>
                      </div>
                      <strong className="text-[#4C7A5A] font-mono text-[9px] shrink-0">
                        {contatoEmergenciaTelefone || '—'}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* ======================= VERSO DO CARTÃO (96×65 mm) ======================= */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-bold text-[#4C7A5A] uppercase tracking-wider print:hidden">
                  Verso • 96 × 65 mm
                </span>

                <div
                  className={`${widthClasses} transition-all duration-200 bg-[#FDFCFB] text-[#26362B] rounded-2xl p-4 shadow-md border-2 border-[#D9E2D4] flex flex-col justify-between relative overflow-hidden select-none`}
                  style={{ aspectRatio: '96 / 65' }}
                >
                  {/* Faixa decorativa sutil no topo */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#4C7A5A]" />

                  {/* 1. Cabeçalho do Verso */}
                  <div>
                    <div className="flex items-center justify-between border-b border-[#D9E2D4]/70 pb-1.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#26362B]">
                        <Activity className="w-3 h-3 text-[#4C7A5A]" />
                        <span>Medicamentos em uso ({medsToDisplay.length})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] text-[#6B7A6F]">Somente nomes</span>
                        <span className="text-[7.5px] font-semibold text-[#6B7A6F] bg-white px-1.5 py-0.5 rounded-md border border-[#D9E2D4]">
                          Verso
                        </span>
                      </div>
                    </div>

                    {/* 2. Lista Compacta de Medicamentos (SOMENTE O NOME - sem doses, sem horários) */}
                    <div className="mt-1.5">
                      {medsToDisplay.length === 0 ? (
                        <p className="text-[10px] text-[#6B7A6F] italic text-center py-6">
                          Nenhum medicamento com status "em uso" selecionado.
                        </p>
                      ) : medsToDisplay.length <= 10 ? (
                        /* Layout 1 coluna para até 10 medicamentos */
                        <div className="space-y-0.5 max-h-[148px] overflow-y-auto pr-0.5">
                          {medsToDisplay.map((m, idx) => (
                            <div
                              key={m.id}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-semibold text-[#26362B] leading-tight break-words ${
                                idx % 2 === 0 ? 'bg-[#F6F4EF]' : 'bg-transparent'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4C7A5A] shrink-0" />
                              <span className="break-words line-clamp-2">{m.nome}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Layout 2 colunas para mais de 10 medicamentos (garante que todos caibam) */
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-h-[148px] overflow-y-auto pr-0.5">
                          {medsToDisplay.map((m, idx) => (
                            <div
                              key={m.id}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold text-[#26362B] leading-tight break-words ${
                                Math.floor(idx / 2) % 2 === 0 ? 'bg-[#F6F4EF]' : 'bg-transparent'
                              }`}
                            >
                              <span className="w-1 h-1 rounded-full bg-[#4C7A5A] shrink-0" />
                              <span className="break-words line-clamp-2 truncate">{m.nome}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 3. Rodapé do Verso */}
                  <div className="pt-1.5 border-t border-[#D9E2D4] text-[7.5px] text-[#6B7A6F] space-y-0.5 leading-tight">
                    <p className="italic text-amber-950 font-medium">
                      Confira sempre com as prescrições médicas atuais.
                    </p>
                    <div className="flex items-center justify-between">
                      <span>Atualizado em: {currentDate}</span>
                      <span className="font-semibold text-[#4C7A5A]">sevisaude.com.br</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             FORMATO FOLHA AMPLIADA (Prontuário Pessoal Expandido A4)
             ========================================================================= */
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
                  <p className="text-xs text-[#6B7A6F]">
                    Prontuário Pessoal e Ficha de Emergência Expandida
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-[#6B7A6F]">
                <span>Última atualização:</span>
                <strong className="block text-[#26362B]">{currentDate}</strong>
              </div>
            </div>

            {/* Dados do Paciente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] text-xs">
              <div>
                <span className="text-[#6B7A6F] block">Titular:</span>
                <strong className="text-sm text-[#26362B] block">{nomeTitular}</strong>
                <span className="text-[11px] text-[#6B7A6F]">
                  Nasc.: {dataNascimento ? formatarData(dataNascimento) : 'Não informada'}
                </span>
              </div>
              <div>
                <span className="text-[#6B7A6F] block">Plano / SUS:</span>
                <strong className="text-sm text-[#26362B] block">
                  {planoSaudeOuSus || 'SUS / Particular'}
                </strong>
                {tipoSanguineo && (
                  <span className="text-[11px] text-[#4C7A5A] font-bold">
                    Sangue: {tipoSanguineo}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[#6B7A6F] block">Contato de Emergência:</span>
                <strong className="text-sm text-[#26362B] block">
                  {contatoEmergenciaNome || '—'}
                  {contatoEmergenciaParentesco && ` (${contatoEmergenciaParentesco})`}
                </strong>
                <span className="text-[11px] text-[#4C7A5A] font-mono">
                  {contatoEmergenciaTelefone || '—'}
                </span>
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
                    {alergiasTexto || 'Nenhuma alergia conhecida declarada.'}
                  </p>
                </div>
              )}

              {includeCondicoes && (
                <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#D9E2D4] text-xs">
                  <span className="font-bold uppercase tracking-wider text-[#26362B] block mb-1">
                    Condições de saúde relevantes
                  </span>
                  <p className="text-[#385942]">
                    {condicoesTexto || 'Nenhuma condição crônica registrada.'}
                  </p>
                </div>
              )}
            </div>

            {/* Medicamentos em uso tabela detalhada */}
            <div className="space-y-3">
              <span className="font-bold uppercase tracking-wider text-xs text-[#26362B] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#4C7A5A]" />
                Medicamentos em uso contínuo (Posologia)
              </span>

              <div className="border border-[#D9E2D4] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F4EF] border-b border-[#D9E2D4] text-[#6B7A6F]">
                    <tr>
                      <th className="p-3">Medicamento</th>
                      <th className="p-3">Dose / Unidade</th>
                      <th className="p-3">Periodicidade / Frequência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E2D4]">
                    {medsToDisplay.map((m) => {
                      const pLegivel = formatarPeriodicidadeLegivel(
                        m.periodicidade,
                        m.dia_referencia,
                      )
                      const doseFlex = m.dose_prescrita
                        ? formatarDoseComUnidade(m.dose_prescrita, m.unidade_dose || m.forma || '')
                        : m.concentracao || m.dosagem || '—'
                      const freqCompleta =
                        [pLegivel, m.frequencia].filter(Boolean).join(' • ') || 'Conforme receita'
                      return (
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
                            {doseFlex}
                            {m.via_administracao && ` • ${m.via_administracao}`}
                          </td>
                          <td className="p-3">{freqCompleta}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aviso Obrigatório */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Aviso de Segurança ao Paciente:</span>
                <p>
                  Confira sempre as informações com as prescrições médicas atuais. Em caso de
                  dúvidas, consulte seu médico assistente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cartão de instruções para impressão física */}
      <div className="bg-[#F6F4EF] rounded-3xl p-5 border border-[#D9E2D4] text-xs text-[#6B7A6F] space-y-2 print:hidden">
        <div className="flex items-center gap-2 text-[#26362B] font-semibold">
          <Printer className="w-4 h-4 text-[#4C7A5A]" />
          <span>Instruções para impressão física precisa em 96 × 65 mm:</span>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-[11px] text-[#6B7A6F]">
          <li>
            <strong>Opção 1 (Recomendada para casa/escritório):</strong> Clique em{' '}
            <em>"Baixar PDF A4 para Recorte"</em>. Imprima em papel offset 180g ou papel couché com{' '}
            <strong>Escala 100% (Tamanho Real)</strong>, recorte nas marcas de guia e dobre ao meio
            antes de plastificar.
          </li>
          <li>
            <strong>Opção 2 (Gráfica / Impressora de Cartão):</strong> Clique em{' '}
            <em>"PDF Direto (96×65 mm)"</em> para obter arquivo de dimensões milimétricas exatas
            (página 1 frente, página 2 verso).
          </li>
        </ul>
      </div>
    </div>
  )
}
