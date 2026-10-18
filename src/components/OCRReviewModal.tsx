import React, { useState, useEffect } from 'react'
import type {
  OcrExtractedData,
  OcrMedicamentoExtracted,
  OcrExameExtracted,
} from '@/services/ocrService'
import {
  createMedicamento,
  createDocumento,
  createMedico,
  createExame,
  getMedicos,
} from '@/services/healthService'
import type {
  Medico,
  FormaFarmaceutica,
  TipoUsoMedicamento,
  CategoriaDocumento,
  TipoExame,
} from '@/types/health'
import {
  X,
  ShieldCheck,
  Check,
  AlertTriangle,
  Pill,
  FileText,
  Stethoscope,
  Trash2,
  Plus,
  Loader2,
  FileCheck,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { extrairDataIso } from '@/lib/dateUtils'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'

const FORMAS: { label: string; value: FormaFarmaceutica }[] = [
  { label: 'Comprimido', value: 'comprimido' },
  { label: 'Cápsula', value: 'cápsula' },
  { label: 'Xarope', value: 'xarope' },
  { label: 'Solução oral', value: 'solução' },
  { label: 'Gotas', value: 'gotas' },
  { label: 'Injetável', value: 'injetável' },
  { label: 'Creme', value: 'creme' },
  { label: 'Pomada', value: 'pomada' },
  { label: 'Spray', value: 'spray' },
  { label: 'Adesivo', value: 'adesivo' },
  { label: 'Outro', value: 'outro' },
]

interface OCRReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmed: () => void
  file: File
  filePreviewUrl: string
  extractedData: OcrExtractedData
  quotaRemaining: number
  profileId: string
  profileName: string
}

export function OCRReviewModal({
  isOpen,
  onClose,
  onConfirmed,
  file,
  filePreviewUrl,
  extractedData,
  quotaRemaining,
  profileId,
  profileName,
}: OCRReviewModalProps) {
  const [saving, setSaving] = useState(false)
  const [medicosExistentes, setMedicosExistentes] = useState<Medico[]>([])

  // Campos do documento
  const [tipoDoc, setTipoDoc] = useState<
    'receita' | 'pedido_exame' | 'laudo' | 'atestado' | 'outro'
  >(extractedData.tipo_documento || 'receita')
  const [dataDocumento, setDataDocumento] = useState(
    extractedData.data_documento || extrairDataIso(new Date().toISOString()),
  )

  // Médico
  const [medicoNome, setMedicoNome] = useState(extractedData.medico?.nome || '')
  const [medicoCrm, setMedicoCrm] = useState(extractedData.medico?.crm || '')
  const [medicoEspecialidade, setMedicoEspecialidade] = useState(
    extractedData.medico?.especialidade || '',
  )
  const [medicoSelecionadoId, setMedicoSelecionadoId] = useState('')

  // O que salvar
  const [salvarDocumentoBiblioteca, setSalvarDocumentoBiblioteca] = useState(true)
  const [tituloDocumento, setTituloDocumento] = useState(
    tipoDoc === 'receita'
      ? `Receita Médica - ${dataDocumento}`
      : tipoDoc === 'pedido_exame'
        ? `Pedido de Exames - ${dataDocumento}`
        : `Documento Digitalizado - ${dataDocumento}`,
  )

  // Medicamentos editáveis
  const [medicamentos, setMedicamentos] = useState<OcrMedicamentoExtracted[]>(
    extractedData.medicamentos && extractedData.medicamentos.length > 0
      ? extractedData.medicamentos
      : [],
  )

  // Exames editáveis
  const [exames, setExames] = useState<OcrExameExtracted[]>(
    extractedData.exames && extractedData.exames.length > 0 ? extractedData.exames : [],
  )

  // Texto completo transcrito
  const [transcricao, setTranscricao] = useState(extractedData.texto_completo_extraido || '')
  const [mostrarTranscricao, setMostrarTranscricao] = useState(false)

  useEffect(() => {
    getMedicos(profileId)
      .then((res) => {
        setMedicosExistentes(res)
        // Tentar associar automaticamente por nome se houver médico correspondente
        if (extractedData.medico?.nome) {
          const found = res.find((m) =>
            m.nome.toLowerCase().includes(extractedData.medico!.nome!.toLowerCase()),
          )
          if (found) {
            setMedicoSelecionadoId(found.id)
          }
        }
      })
      .catch(console.warn)
  }, [profileId, extractedData.medico])

  if (!isOpen) return null

  // Helpers para manipulação dos medicamentos
  const handleMedChange = (index: number, field: keyof OcrMedicamentoExtracted, value: any) => {
    const updated = [...medicamentos]
    updated[index] = { ...updated[index], [field]: value }
    setMedicamentos(updated)
  }

  const handleRemoveMed = (index: number) => {
    setMedicamentos(medicamentos.filter((_, i) => i !== index))
  }

  const handleAddMed = () => {
    setMedicamentos([
      ...medicamentos,
      {
        nome: '',
        dosagem: '',
        forma: 'comprimido',
        posologia: '1x ao dia',
        tipo_uso: 'contínuo',
        frequencia: '24 em 24 horas',
        horarios: ['08:00'],
      },
    ])
  }

  // Helpers para exames
  const handleExameChange = (index: number, field: keyof OcrExameExtracted, value: any) => {
    const updated = [...exames]
    updated[index] = { ...updated[index], [field]: value }
    setExames(updated)
  }

  const handleRemoveExame = (index: number) => {
    setExames(exames.filter((_, i) => i !== index))
  }

  const handleAddExame = () => {
    setExames([
      ...exames,
      {
        nome: '',
        tipo: 'Sangue',
      },
    ])
  }

  const handleConfirmar = async () => {
    setSaving(true)
    try {
      // 1. Criar ou vincular médico se informado e não selecionado
      let finalMedicoId = medicoSelecionadoId
      if (!finalMedicoId && medicoNome.trim()) {
        try {
          const newMed = await createMedico(
            {
              nome: medicoNome.trim(),
              crm: medicoCrm.trim() || undefined,
              especialidade: medicoEspecialidade.trim() || 'Clínico Geral',
            },
            profileId,
          )
          finalMedicoId = newMed.id
        } catch (mErr) {
          console.warn('Erro ao auto-cadastrar médico da receita:', mErr)
        }
      }

      // 2. Criar registro do Documento na biblioteca se marcado
      let docIdCreated: string | undefined = undefined
      if (salvarDocumentoBiblioteca) {
        let categoria: CategoriaDocumento = 'Receita'
        if (tipoDoc === 'pedido_exame') categoria = 'Exame — Pedido'
        else if (tipoDoc === 'laudo') categoria = 'Laudo'
        else if (tipoDoc === 'atestado') categoria = 'Atestado'
        else if (tipoDoc === 'outro') categoria = 'Outro'

        const docData = new FormData()
        docData.append('titulo', tituloDocumento.trim() || file.name)
        docData.append('categoria', categoria)
        docData.append('arquivo', file)

        const docRes = await createDocumento(docData, profileId)
        docIdCreated = docRes.id
      }

      // 3. Criar os Medicamentos confirmados
      let medsCriados = 0
      for (const med of medicamentos) {
        if (!med.nome.trim()) continue
        const formData = new FormData()
        formData.append('nome', med.nome.trim())
        if (med.principio_ativo) formData.append('principio_ativo', med.principio_ativo.trim())
        if (med.dosagem) formData.append('dosagem', med.dosagem.trim())
        if (med.forma) formData.append('forma', med.forma)
        if (med.posologia) formData.append('instrucoes_prescricao', med.posologia.trim())
        if (med.frequencia) formData.append('frequencia', med.frequencia.trim())
        formData.append('tipo_uso', med.tipo_uso || 'contínuo')
        formData.append('status', 'em uso')
        if (dataDocumento) formData.append('data_prescricao', dataDocumento)
        formData.append('data_inicio', dataDocumento || extrairDataIso(new Date().toISOString()))
        if (finalMedicoId) formData.append('medico', finalMedicoId)
        if (med.horarios && med.horarios.length > 0) {
          formData.append('horarios', JSON.stringify(med.horarios))
        } else {
          formData.append('horarios', JSON.stringify(['08:00']))
        }

        // Anexar cópia do arquivo da receita ao medicamento
        formData.append('receita_arquivo', file)

        await createMedicamento(formData, profileId)
        medsCriados++
      }

      // 4. Criar os Exames confirmados (se houver)
      let examesCriados = 0
      for (const ex of exames) {
        if (!ex.nome.trim()) continue
        const exPayload: any = {
          nome: ex.nome.trim(),
          tipo: ex.tipo || 'Sangue',
          status: 'Solicitado',
          data_solicitado: dataDocumento || extrairDataIso(new Date().toISOString()),
        }
        if (finalMedicoId) exPayload.medico = finalMedicoId
        if (ex.observacoes) exPayload.observacoes = ex.observacoes

        await createExame(exPayload, profileId)
        examesCriados++
      }

      toast({
        title: 'Leitura confirmada com sucesso!',
        description: `Prontuário atualizado: ${medsCriados} medicamento(s), ${examesCriados} exame(s)${salvarDocumentoBiblioteca ? ' e documento arquivado' : ''}.`,
      })

      onConfirmed()
      onClose()
    } catch (err: any) {
      console.error('Erro ao confirmar dados do OCR:', err)
      const fieldErrors = extractFieldErrors(err)
      let friendlyMessage = getErrorMessage(err)
      if (Object.keys(fieldErrors).length > 0) {
        friendlyMessage = Object.entries(fieldErrors)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ')
      }
      toast({
        title: 'Erro ao salvar registros',
        description: friendlyMessage || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const isPdf = file.name.toLowerCase().endsWith('.pdf')

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#FAF8F5] rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-[#D9E2D4] animate-scale-in my-auto">
        {/* Header com aviso de revisão obrigatória */}
        <div className="p-4 sm:p-6 bg-white rounded-t-3xl border-b border-[#D9E2D4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#DCE9D4] text-[#4C7A5A] flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4C7A5A]">
                  Revisão Obrigatória de OCR
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {quotaRemaining} leitura(s) restante(s) no mês
                </span>
              </div>
              <h2 className="font-serif italic text-2xl font-bold text-[#26362B]">
                Conferir e validar dados do documento
              </h2>
              <p className="text-xs text-[#6B7A6F] flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4C7A5A]" />
                <span className="font-semibold text-[#26362B]">
                  Nada é salvo antes da sua confirmação.
                </span>{' '}
                Confira os campos ao lado da imagem antes de gravar no prontuário de {profileName}.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-full hover:bg-gray-100 text-[#6B7A6F] hover:text-[#26362B] transition self-start sm:self-auto cursor-pointer"
            title="Cancelar e não salvar nada"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo: Lado a Lado (Desktop) ou Empilhado (Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#D9E2D4]">
          {/* Coluna da Esquerda: Imagem Original / Documento */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-[#F3EFEA] flex flex-col overflow-y-auto max-h-[40vh] lg:max-h-[70vh]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#26362B] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#4C7A5A]" />
                Documento Original Anexado
              </span>
              <span className="text-[11px] text-[#6B7A6F] truncate max-w-[180px]">{file.name}</span>
            </div>

            <div className="bg-white rounded-2xl p-2 border border-[#D9E2D4] shadow-inner flex-1 flex items-center justify-center overflow-hidden min-h-[220px]">
              {isPdf ? (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-16 h-16 text-red-600 mx-auto" />
                  <div>
                    <p className="font-semibold text-sm text-[#26362B]">{file.name}</p>
                    <p className="text-xs text-[#6B7A6F]">
                      {(file.size / 1024).toFixed(1)} KB • Documento PDF
                    </p>
                  </div>
                  <a
                    href={filePreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#4C7A5A] text-white text-xs font-semibold shadow hover:bg-[#3F664C] transition"
                  >
                    <span>Abrir PDF em nova aba</span>
                  </a>
                </div>
              ) : (
                <img
                  src={filePreviewUrl}
                  alt="Documento médico original"
                  className="max-h-[550px] w-auto object-contain rounded-xl hover:scale-105 transition duration-300 cursor-zoom-in"
                />
              )}
            </div>

            {/* Transcrição de texto opcional */}
            {transcricao && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setMostrarTranscricao(!mostrarTranscricao)}
                  className="text-xs font-semibold text-[#4C7A5A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  {mostrarTranscricao
                    ? 'Ocultar texto integral extraído'
                    : 'Ver texto integral extraído pela IA'}
                </button>
                {mostrarTranscricao && (
                  <div className="mt-2 p-3 bg-white rounded-xl border border-[#D9E2D4] text-xs text-[#26362B] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {transcricao}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Coluna da Direita: Campos Extraídos e Editáveis */}
          <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto max-h-[50vh] lg:max-h-[70vh] space-y-6">
            {/* Aviso de conferência */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Confira as informações extraídas pela inteligência artificial
                </p>
                <p className="text-[11px] mt-0.5 text-amber-800">
                  Você pode corrigir nomes, dosagens e excluir itens antes de confirmar. Nada será
                  adicionado ao prontuário se você clicar em "Cancelar".
                </p>
              </div>
            </div>

            {/* Cabeçalho do Documento */}
            <div className="bg-white p-4 rounded-2xl border border-[#D9E2D4] space-y-4">
              <h3 className="font-serif italic text-base font-bold text-[#26362B] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#4C7A5A]" />
                Dados Principais do Documento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#26362B] mb-1">
                    Tipo de documento
                  </label>
                  <select
                    value={tipoDoc}
                    onChange={(e: any) => setTipoDoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  >
                    <option value="receita">Receita médica</option>
                    <option value="pedido_exame">Pedido de exame</option>
                    <option value="laudo">Laudo de exame / resultado</option>
                    <option value="atestado">Atestado médico</option>
                    <option value="outro">Outro documento de saúde</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#26362B] mb-1">
                    Data do documento
                  </label>
                  <input
                    type="date"
                    value={dataDocumento}
                    onChange={(e) => setDataDocumento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
              </div>

              {/* Opção de salvar na biblioteca de documentos */}
              <div className="pt-2 border-t border-[#D9E2D4]/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#26362B]">
                  <input
                    type="checkbox"
                    checked={salvarDocumentoBiblioteca}
                    onChange={(e) => setSalvarDocumentoBiblioteca(e.target.checked)}
                    className="rounded text-[#4C7A5A] focus:ring-[#4C7A5A] w-4 h-4"
                  />
                  <span>Arquivar cópia na Biblioteca de Documentos do prontuário</span>
                </label>

                {salvarDocumentoBiblioteca && (
                  <div>
                    <input
                      type="text"
                      value={tituloDocumento}
                      onChange={(e) => setTituloDocumento(e.target.value)}
                      placeholder="Título na biblioteca de documentos"
                      className="w-full px-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-xs text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Profissional / Médico */}
            <div className="bg-white p-4 rounded-2xl border border-[#D9E2D4] space-y-3">
              <h3 className="font-serif italic text-base font-bold text-[#26362B] flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#4C7A5A]" />
                Profissional / Prescritor
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#26362B] mb-1">Nome do médico</label>
                  <input
                    type="text"
                    value={medicoNome}
                    onChange={(e) => setMedicoNome(e.target.value)}
                    placeholder="Ex: Dr. Roberto Guimarães"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#26362B] mb-1">CRM / Registro</label>
                  <input
                    type="text"
                    value={medicoCrm}
                    onChange={(e) => setMedicoCrm(e.target.value)}
                    placeholder="Ex: CRM-SP 123456"
                    className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                  />
                </div>
              </div>

              {medicosExistentes.length > 0 && (
                <div className="text-xs">
                  <label className="block text-[#6B7A6F] mb-1">
                    Ou selecione um médico já cadastrado no prontuário:
                  </label>
                  <select
                    value={medicoSelecionadoId}
                    onChange={(e) => {
                      setMedicoSelecionadoId(e.target.value)
                      const found = medicosExistentes.find((m) => m.id === e.target.value)
                      if (found) {
                        setMedicoNome(found.nome)
                        if (found.crm) setMedicoCrm(found.crm)
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-[#FDFCFB] text-[#26362B] outline-none"
                  >
                    <option value="">-- Cadastrar médico acima como novo --</option>
                    {medicosExistentes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} ({m.especialidade || 'Geral'}) {m.crm ? `• CRM ${m.crm}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Medicamentos Extraídos */}
            <div className="bg-white p-4 rounded-2xl border border-[#D9E2D4] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif italic text-base font-bold text-[#26362B] flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#4C7A5A]" />
                  Medicamentos Identificados ({medicamentos.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddMed}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#4C7A5A] text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar remédio</span>
                </button>
              </div>

              {medicamentos.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#F6F4EF] text-center text-xs text-[#6B7A6F]">
                  Nenhum medicamento identificado automaticamente neste documento. Use o botão acima
                  se desejar adicionar manualmente.
                </div>
              ) : (
                <div className="space-y-4">
                  {medicamentos.map((med, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-[#D9E2D4] bg-[#FAF8F5] space-y-3 relative group"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveMed(idx)}
                        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-red-50 text-red-500 transition cursor-pointer"
                        title="Remover medicamento desta lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs pr-8">
                        {/* Nome do medicamento */}
                        <div className="sm:col-span-6">
                          <label className="block font-semibold text-[#26362B] mb-1">
                            Nome comercial / Princípio ativo <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={med.nome}
                            onChange={(e) => handleMedChange(idx, 'nome', e.target.value)}
                            placeholder="Ex: Losartana Potássica"
                            className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] font-medium outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                          />
                        </div>

                        {/* Dosagem / Concentração */}
                        <div className="sm:col-span-3">
                          <label className="block font-semibold text-[#26362B] mb-1">Dosagem</label>
                          <input
                            type="text"
                            value={med.dosagem || ''}
                            onChange={(e) => handleMedChange(idx, 'dosagem', e.target.value)}
                            placeholder="Ex: 50 mg"
                            className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                          />
                        </div>

                        {/* Forma Farmacêutica */}
                        <div className="sm:col-span-3">
                          <label className="block font-semibold text-[#26362B] mb-1">Forma</label>
                          <select
                            value={med.forma || 'comprimido'}
                            onChange={(e) => handleMedChange(idx, 'forma', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                          >
                            {FORMAS.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Posologia / Instruções */}
                        <div className="sm:col-span-6">
                          <label className="block font-semibold text-[#26362B] mb-1">
                            Posologia / Modo de Tomar
                          </label>
                          <input
                            type="text"
                            value={med.posologia || ''}
                            onChange={(e) => handleMedChange(idx, 'posologia', e.target.value)}
                            placeholder="Ex: Tomar 1 comprimido pela manhã em jejum"
                            className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                          />
                        </div>

                        {/* Frequência */}
                        <div className="sm:col-span-3">
                          <label className="block font-semibold text-[#26362B] mb-1">
                            Frequência
                          </label>
                          <input
                            type="text"
                            value={med.frequencia || ''}
                            onChange={(e) => handleMedChange(idx, 'frequencia', e.target.value)}
                            placeholder="Ex: 12 em 12h ou 1x/dia"
                            className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                          />
                        </div>

                        {/* Tipo de uso */}
                        <div className="sm:col-span-3">
                          <label className="block font-semibold text-[#26362B] mb-1">
                            Tipo de uso
                          </label>
                          <select
                            value={med.tipo_uso || 'contínuo'}
                            onChange={(e) => handleMedChange(idx, 'tipo_uso', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] outline-none focus:ring-2 focus:ring-[#4C7A5A]"
                          >
                            <option value="contínuo">Uso Contínuo</option>
                            <option value="temporário">Uso Temporário</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exames Extraídos (caso o documento tenha pedidos de exame) */}
            {(tipoDoc === 'pedido_exame' || exames.length > 0) && (
              <div className="bg-white p-4 rounded-2xl border border-[#D9E2D4] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif italic text-base font-bold text-[#26362B] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4C7A5A]" />
                    Exames Solicitados ({exames.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddExame}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E7F0E3] hover:bg-[#DCE9D4] text-[#4C7A5A] text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar exame</span>
                  </button>
                </div>

                {exames.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#F6F4EF] text-center text-xs text-[#6B7A6F]">
                    Nenhum exame identificado. Adicione se este documento contiver pedidos
                    laboratoriais ou de imagem.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exames.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl border border-[#D9E2D4] bg-[#FAF8F5] flex items-center justify-between gap-3"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 text-xs">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={ex.nome}
                              onChange={(e) => handleExameChange(idx, 'nome', e.target.value)}
                              placeholder="Nome do exame (ex: Hemograma Completo)"
                              className="w-full px-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] font-medium outline-none"
                            />
                          </div>
                          <div>
                            <select
                              value={ex.tipo || 'Sangue'}
                              onChange={(e) => handleExameChange(idx, 'tipo', e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl border border-[#D9E2D4] bg-white text-[#26362B] outline-none"
                            >
                              <option value="Sangue">Sangue</option>
                              <option value="Imagem">Imagem</option>
                              <option value="Urina">Urina</option>
                              <option value="Cardíaco">Cardíaco</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExame(idx)}
                          className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações com Cancelar vs Confirmar */}
        <div className="p-4 sm:p-6 bg-white rounded-b-3xl border-t border-[#D9E2D4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-[#6B7A6F]">
            <span className="font-semibold text-[#26362B]">Segurança garantida:</span> Se cancelar,
            nenhum dado deste documento será armazenado no prontuário.
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-[#D9E2D4] text-xs font-semibold text-[#6B7A6F] hover:bg-[#F6F4EF] transition cursor-pointer disabled:opacity-50"
            >
              Cancelar (nada será salvo)
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleConfirmar}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#4C7A5A] hover:bg-[#3F664C] text-white text-xs font-semibold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gravando no prontuário...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar e Salvar no Prontuário</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
