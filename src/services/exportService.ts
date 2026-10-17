import jsPDF from 'jspdf'
import * as autoTableModule from 'jspdf-autotable'

// Interop ESM/CJS resiliente para jspdf-autotable em bundlers como Vite/Rollup
const autoTable: any =
  (autoTableModule as any).default ?? (autoTableModule as any).autoTable ?? autoTableModule

import {
  formatarData,
  formatarHora,
  formatarDataHora,
  formatarTimestampLocal,
} from '@/lib/dateUtils'
import {
  normalizarHorarios,
  formatarChipHorario,
  formatarPeriodicidadeLegivel,
} from '@/lib/medicamentoUtils'
import type {
  HealthProfile,
  Medicamento,
  AlteracaoMedicamento,
  Consulta,
  Exame,
  Medico,
  Documento,
} from '@/types/health'

// Cores Oficiais da Marca SeviSaúde
export const BRAND_PRIMARY: [number, number, number] = [64, 145, 108] // #40916C (Verde Médio Oficial)
export const BRAND_DARK: [number, number, number] = [27, 67, 50] // #1B4332 (Verde Floresta Oficial)
export const BRAND_LIGHT: [number, number, number] = [231, 240, 227] // #E7F0E3 (Fundo Suave)
export const TEXT_MAIN: [number, number, number] = [38, 54, 43] // #26362B (Texto Principal)
export const TEXT_MUTED: [number, number, number] = [107, 122, 111] // #6B7A6F (Texto Secundário)

export interface ExportDataPayload {
  profile: HealthProfile
  medicamentos?: Medicamento[]
  alteracoesMedicamentos?: AlteracaoMedicamento[]
  consultas?: Consulta[]
  exames?: Exame[]
  medicos?: Medico[]
  documentos?: Documento[]
  geradoPorNome?: string
  alergias?: string
  condicoesSaude?: string
}

/**
 * Sanitiza texto para uso seguro no nome de arquivo
 */
export function sanitizeFilename(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Retorna o carimbo de data atual em YYYY-MM-DD para nome de arquivos
 */
export function getDataArquivo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Desenha o cabeçalho oficial do SeviSaúde em cada página de PDF
 */
function drawHeader(
  doc: jsPDF,
  profile: HealthProfile,
  tituloDocumento: string,
  dataGeracaoStr: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Faixa superior decorativa verde floresta
  doc.setFillColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2])
  doc.rect(0, 0, pageWidth, 28, 'F')

  // Faixa secundária verde suave
  doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2])
  doc.rect(0, 28, pageWidth, 2, 'F')

  // Marca "SeviSaúde" e slogan
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Sevi', 14, 13)
  const seviWidth = doc.getTextWidth('Sevi')
  doc.setTextColor(116, 198, 157) // #74C69D tom claro
  doc.text('Saúde', 14 + seviWidth, 13)

  doc.setTextColor(220, 233, 212)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Sua jornada de saúde, conectada. • sevisaude.com.br', 14, 20)

  // Título e Data de Geração alinhados à direita
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(tituloDocumento, pageWidth - 14, 12, { align: 'right' })

  doc.setTextColor(220, 233, 212)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Gerado em: ${dataGeracaoStr}`, pageWidth - 14, 19, { align: 'right' })

  // Bloco de Identificação do Titular
  doc.setFillColor(246, 244, 239) // #F6F4EF
  doc.setDrawColor(217, 226, 212) // #D9E2D4
  doc.roundedRect(14, 34, pageWidth - 28, 18, 2, 2, 'FD')

  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('TITULAR DO PRONTUÁRIO', 18, 40)

  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const titularNome = profile.nome || 'Paciente'
  const parentesco = profile.parentesco ? ` (${profile.parentesco})` : ''
  doc.text(`${titularNome}${parentesco}`, 18, 47)

  // Metadados do titular à direita
  const dataNasc = profile.data_nascimento ? formatarData(profile.data_nascimento) : 'Não informada'
  const tipoSang = profile.tipo_sanguineo || '—'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2])
  doc.text(`Nascimento: ${dataNasc}   |   Tipo Sanguíneo: ${tipoSang}`, pageWidth - 18, 45, {
    align: 'right',
  })
}

/**
 * Desenha o rodapé obrigatório em todas as páginas com numeração
 */
function applyFooters(doc: jsPDF) {
  const totalPages = (doc.internal.pages.length - 1) as number
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Linha divisória
    doc.setDrawColor(217, 226, 212)
    doc.setLineWidth(0.5)
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)

    // Aviso legal de não-prontuário clínico oficial
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2])
    doc.text(
      'Documento gerado pelo SeviSaúde — confira as informações com suas prescrições e documentos oficiais. Não substitui prontuário médico.',
      14,
      pageHeight - 9,
    )

    // Paginação
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 9, {
      align: 'right',
    })
  }
}

// ============================================================================
// 1. PDF: RESUMO GERAL DE SAÚDE (OVERVIEW COMPLETO)
// ============================================================================
export function exportarResumoGeralPDF(data: ExportDataPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dataGeracao = formatarDataHora(now)
  const pageWidth = doc.internal.pageSize.getWidth()

  drawHeader(doc, data.profile, 'Resumo Geral de Saúde', dataGeracao)

  let startY = 56

  // Box 1: Alergias e Condições Clínicas
  const alergiasTexto =
    data.alergias || data.profile.alergias || 'Nenhuma alergia conhecida a medicamentos.'
  const condicoesTexto =
    data.condicoesSaude || data.profile.condicoes_saude || 'Nenhuma condição crônica registrada.'
  const emergNome = data.profile.contato_emergencia_nome || 'Não cadastrado'
  const emergTel = data.profile.contato_emergencia_telefone || '—'
  const emergParentesco = data.profile.contato_emergencia_parentesco
    ? ` (${data.profile.contato_emergencia_parentesco})`
    : ''

  autoTable(doc, {
    startY: startY,
    head: [['Alergias e Reações', 'Condições Crônicas', 'Contato de Emergência']],
    body: [
      [alergiasTexto, condicoesTexto, `${emergNome}${emergParentesco}\nTelefone: ${emergTel}`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_DARK,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: TEXT_MAIN,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60 },
      2: { cellWidth: 62 },
    },
    margin: { left: 14, right: 14 },
  })

  // @ts-expect-error autoTable adds lastAutoTable to doc
  startY = (doc.lastAutoTable.finalY as number) + 6

  // Seção 2: Medicamentos em Uso
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2])
  doc.text('Medicamentos em Uso Ativo', 14, startY)
  startY += 2

  const medsEmUso = (data.medicamentos || []).filter((m) => m.status === 'em uso')
  const medsRows =
    medsEmUso.length > 0
      ? medsEmUso.map((m) => {
          const dose = m.dose_prescrita
            ? `${m.dose_prescrita} ${m.unidade_dose || ''}`
            : m.concentracao || m.dosagem || '—'
          const normHorarios = normalizarHorarios(m.horarios)
          const horarios =
            normHorarios.length > 0
              ? normHorarios
                  .map((h) => formatarChipHorario(h, m.unidade_dose || m.forma || ''))
                  .join(', ')
              : '—'
          const pLegivel = formatarPeriodicidadeLegivel(m.periodicidade, m.dia_referencia)
          const freqTotal = [pLegivel, m.frequencia].filter(Boolean).join(' • ') || '—'
          return [m.nome, m.principio_ativo || '—', dose, freqTotal, horarios, m.tipo_uso || '—']
        })
      : [['Nenhum medicamento com status "em uso" cadastrado.', '', '', '', '', '']]

  autoTable(doc, {
    startY: startY,
    head: [
      [
        'Medicamento',
        'Princípio Ativo',
        'Dosagem/Dose',
        'Periodicidade / Freq',
        'Horários (Qtd)',
        'Tipo',
      ],
    ],
    body: medsRows,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_MAIN,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [246, 248, 245],
    },
    margin: { left: 14, right: 14 },
  })

  // @ts-expect-error autoTable adds lastAutoTable to doc
  startY = (doc.lastAutoTable.finalY as number) + 6

  // Seção 3: Próximas Consultas Agendadas
  if (startY > 230) {
    doc.addPage()
    drawHeader(doc, data.profile, 'Resumo Geral de Saúde (continuação)', dataGeracao)
    startY = 56
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2])
  doc.text('Próximas Consultas Agendadas', 14, startY)
  startY += 2

  const consultasAgendadas = (data.consultas || []).filter((c) => c.status === 'Agendada')
  const consultRows =
    consultasAgendadas.length > 0
      ? consultasAgendadas.map((c) => {
          const aut = c.numero_autorizacao
            ? `${c.numero_autorizacao}${c.validade_autorizacao ? ` (até ${formatarData(c.validade_autorizacao)})` : ''}`
            : '—'
          return [
            formatarData(c.data),
            formatarHora(c.horario) || '—',
            c.expand?.medico?.nome || 'Médico não informado',
            c.expand?.medico?.especialidade || '—',
            c.tipo,
            c.local || '—',
            aut,
          ]
        })
      : [['Nenhuma consulta agendada encontrada.', '', '', '', '', '', '']]

  autoTable(doc, {
    startY: startY,
    head: [['Data', 'Horário', 'Profissional', 'Especialidade', 'Tipo', 'Local', 'Autorização']],
    body: consultRows,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_MAIN,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [246, 248, 245],
    },
    margin: { left: 14, right: 14 },
  })

  // @ts-expect-error autoTable adds lastAutoTable to doc
  startY = (doc.lastAutoTable.finalY as number) + 6

  // Seção 4: Exames Pendentes ou Agendados
  if (startY > 230) {
    doc.addPage()
    drawHeader(doc, data.profile, 'Resumo Geral de Saúde (continuação)', dataGeracao)
    startY = 56
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2])
  doc.text('Exames Pendentes e Agendados', 14, startY)
  startY += 2

  const examesAbertos = (data.exames || []).filter(
    (e) => e.status === 'Pendente' || e.status === 'Agendado',
  )
  const examesRows =
    examesAbertos.length > 0
      ? examesAbertos.map((e) => {
          const aut = e.numero_autorizacao
            ? `${e.numero_autorizacao}${e.validade_autorizacao ? ` (até ${formatarData(e.validade_autorizacao)})` : ''}`
            : '—'
          return [
            e.nome,
            e.tipo,
            e.status,
            formatarData(e.data_solicitado),
            e.data_hora_agendada ? formatarDataHora(e.data_hora_agendada) : 'Não agendado',
            e.local_realizacao || '—',
            aut,
          ]
        })
      : [['Nenhum exame pendente ou agendado no momento.', '', '', '', '', '', '']]

  autoTable(doc, {
    startY: startY,
    head: [['Exame', 'Tipo', 'Status', 'Solicitado em', 'Agendamento', 'Local', 'Autorização']],
    body: examesRows,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_MAIN,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [246, 248, 245],
    },
    margin: { left: 14, right: 14 },
  })

  applyFooters(doc)

  const filename = `sevisaude-resumo-saude-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.pdf`
  doc.save(filename)
}

// ============================================================================
// 2. PDF: LISTA ATUAL DE MEDICAMENTOS (RECEITUÁRIO / PRONTUÁRIO)
// ============================================================================
export function exportarMedicamentosPDF(data: ExportDataPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dataGeracao = formatarDataHora(now)

  drawHeader(doc, data.profile, 'Medicamentos em Uso e Histórico', dataGeracao)

  const meds = data.medicamentos || []
  const rows =
    meds.length > 0
      ? meds.map((m) => {
          const dose = m.dose_prescrita
            ? `${m.dose_prescrita} ${m.unidade_dose || ''}`
            : m.concentracao || m.dosagem || '—'
          const normHorarios = normalizarHorarios(m.horarios)
          const horarios =
            normHorarios.length > 0
              ? normHorarios
                  .map((h) => formatarChipHorario(h, m.unidade_dose || m.forma || ''))
                  .join(', ')
              : '—'
          const medico = m.expand?.medico?.nome || '—'
          const datas = `Início: ${formatarData(m.data_inicio) || '—'}${
            m.data_fim ? `\nFim: ${formatarData(m.data_fim)}` : ''
          }`
          const instrucoes =
            [m.instrucoes_prescricao, m.observacoes].filter(Boolean).join(' | ') || '—'
          const pLegivel = formatarPeriodicidadeLegivel(m.periodicidade, m.dia_referencia)
          const freqTotal = [pLegivel, m.frequencia].filter(Boolean).join('\n') || '—'

          return [
            m.nome,
            `${dose}\n${m.forma || ''}`,
            m.status,
            freqTotal,
            horarios,
            datas,
            medico,
            instrucoes,
          ]
        })
      : [['Nenhum medicamento registrado.', '', '', '', '', '', '', '']]

  autoTable(doc, {
    startY: 56,
    head: [
      [
        'Medicamento',
        'Dosagem / Forma',
        'Status',
        'Periodicidade / Freq',
        'Horários e Qtd',
        'Período',
        'Prescritor',
        'Instruções',
      ],
    ],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: TEXT_MAIN,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 22 },
      2: { cellWidth: 16 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 30 },
    },
    alternateRowStyles: {
      fillColor: [246, 248, 245],
    },
    margin: { left: 14, right: 14 },
  })

  applyFooters(doc)

  const filename = `sevisaude-medicamentos-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.pdf`
  doc.save(filename)
}

// ============================================================================
// 3. PDF: HISTÓRICO COMPLETO DE ALTERAÇÕES DE MEDICAMENTOS (TRILHA IMUTÁVEL)
// ============================================================================
export function exportarHistoricoMedicamentosPDF(data: ExportDataPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dataGeracao = formatarDataHora(now)

  drawHeader(doc, data.profile, 'Histórico de Alterações de Medicamentos', dataGeracao)

  // Mapa de id do medicamento para o nome
  const medsMap = new Map<string, string>()
  ;(data.medicamentos || []).forEach((m) => medsMap.set(m.id, m.nome))

  const historico = data.alteracoesMedicamentos || []
  const rows =
    historico.length > 0
      ? historico.map((h) => {
          const medNome = medsMap.get(h.medicamento) || 'Medicamento'
          const dataAlteracao = h.data_hora
            ? formatarTimestampLocal(h.data_hora)
            : formatarData(h.data) || '—'
          const campo = h.campo_alterado || 'Alteração de dados'
          const anterior = h.valor_anterior || '—'
          const novo = h.novo_valor || '—'
          const responsavel = h.usuario_responsavel || 'Usuário'

          return [
            dataAlteracao,
            medNome,
            campo,
            anterior,
            novo,
            h.motivo || 'Motivo não informado',
            responsavel,
          ]
        })
      : [['Nenhuma alteração registrada no histórico.', '', '', '', '', '', '']]

  autoTable(doc, {
    startY: 56,
    head: [
      [
        'Data / Hora',
        'Medicamento',
        'Campo Alterado',
        'Valor Anterior',
        'Novo Valor',
        'Motivo Registrado',
        'Responsável',
      ],
    ],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: TEXT_MAIN,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 28 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 33 },
      6: { cellWidth: 20 },
    },
    alternateRowStyles: {
      fillColor: [246, 248, 245],
    },
    margin: { left: 14, right: 14 },
  })

  applyFooters(doc)

  const filename = `sevisaude-historico-medicamentos-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.pdf`
  doc.save(filename)
}

// ============================================================================
// 4. PDF: CONSULTAS E REGISTRO PÓS-CONSULTA ESTRUTURADO
// ============================================================================
export function exportarConsultasPDF(data: ExportDataPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dataGeracao = formatarDataHora(now)

  drawHeader(doc, data.profile, 'Histórico de Consultas e Pós-Consulta', dataGeracao)

  const consultas = data.consultas || []
  let startY = 56

  if (consultas.length === 0) {
    autoTable(doc, {
      startY: startY,
      head: [['Status']],
      body: [['Nenhuma consulta registrada para este titular.']],
      theme: 'grid',
      margin: { left: 14, right: 14 },
    })
  } else {
    // Para consultas, renderizamos uma tabela de visão geral e detalhamento dos pós-consultas estruturados
    const resumoRows = consultas.map((c) => {
      const aut = c.numero_autorizacao
        ? `${c.numero_autorizacao}${c.validade_autorizacao ? ` (até ${formatarData(c.validade_autorizacao)})` : ''}`
        : '—'
      return [
        formatarData(c.data),
        formatarHora(c.horario) || '—',
        c.status,
        c.expand?.medico?.nome || 'Médico não informado',
        c.expand?.medico?.especialidade || '—',
        c.tipo,
        c.local || '—',
        aut,
        c.motivo_atendimento || c.anotacoes || '—',
      ]
    })

    autoTable(doc, {
      startY: startY,
      head: [
        [
          'Data',
          'Horário',
          'Status',
          'Profissional',
          'Especialidade',
          'Tipo',
          'Local',
          'Autorização',
          'Motivo / Anotação',
        ],
      ],
      body: resumoRows,
      theme: 'striped',
      headStyles: {
        fillColor: BRAND_PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: TEXT_MAIN,
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { cellWidth: 17 },
        1: { cellWidth: 13 },
        2: { cellWidth: 16 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
        6: { cellWidth: 20 },
        7: { cellWidth: 24 },
        8: { cellWidth: 26 },
      },
      margin: { left: 14, right: 14 },
    })

    // @ts-expect-error autoTable adds lastAutoTable to doc
    startY = (doc.lastAutoTable.finalY as number) + 8

    // Detalhamento dos Registros Pós-Consulta estruturados
    const comRegistroPos = consultas.filter(
      (c) =>
        c.resumo_orientacoes ||
        c.assuntos_tratados ||
        c.exames_solicitados_relacionados ||
        c.alteracoes_medicamentos_relacionadas ||
        c.proximos_passos,
    )

    if (comRegistroPos.length > 0) {
      if (startY > 220) {
        doc.addPage()
        drawHeader(doc, data.profile, 'Histórico de Consultas (continuação)', dataGeracao)
        startY = 56
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2])
      doc.text('Registros Pós-Consulta Estruturados', 14, startY)
      startY += 3

      const posRows = comRegistroPos.map((c) => {
        const medico = c.expand?.medico?.nome || 'Profissional'
        const cabecalho = `${formatarData(c.data)} • ${medico} (${c.tipo})`
        const detalhes = [
          c.motivo_atendimento ? `• Motivo: ${c.motivo_atendimento}` : '',
          c.sintomas_relatados ? `• Sintomas relatados: ${c.sintomas_relatados}` : '',
          c.assuntos_tratados ? `• Assuntos tratados: ${c.assuntos_tratados}` : '',
          c.resumo_orientacoes ? `• Orientações: ${c.resumo_orientacoes}` : '',
          c.alteracoes_medicamentos_relacionadas
            ? `• Ajustes em medicamentos: ${c.alteracoes_medicamentos_relacionadas}`
            : '',
          c.exames_solicitados_relacionados
            ? `• Exames solicitados: ${c.exames_solicitados_relacionados}`
            : '',
          c.proximos_passos ? `• Próximos passos: ${c.proximos_passos}` : '',
          c.data_prevista_retorno
            ? `• Retorno previsto: ${formatarData(c.data_prevista_retorno)}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')

        return [cabecalho, detalhes]
      })

      autoTable(doc, {
        startY: startY,
        head: [['Consulta', 'Resumo Estruturado / Conduta / Orientações']],
        body: posRows,
        theme: 'grid',
        headStyles: {
          fillColor: BRAND_DARK,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: TEXT_MAIN,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 132 },
        },
        margin: { left: 14, right: 14 },
      })
    }
  }

  applyFooters(doc)

  const filename = `sevisaude-consultas-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.pdf`
  doc.save(filename)
}

// ============================================================================
// 5. PDF: EXAMES E STATUS (5 ESTADOS DO PROMPT MESTRE)
// ============================================================================
export function exportarExamesPDF(data: ExportDataPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dataGeracao = formatarDataHora(now)

  drawHeader(doc, data.profile, 'Histórico de Exames e Status', dataGeracao)

  const exames = data.exames || []
  const rows =
    exames.length > 0
      ? exames.map((e) => {
          const medico = e.expand?.medico?.nome || '—'
          const datas = [
            `Solicitado: ${formatarData(e.data_solicitado)}`,
            e.data_hora_agendada ? `Agendado: ${formatarDataHora(e.data_hora_agendada)}` : '',
            e.data_realizado ? `Realizado: ${formatarData(e.data_realizado)}` : '',
            e.data_disponibilizacao_resultado
              ? `Resultado: ${formatarData(e.data_disponibilizacao_resultado)}`
              : '',
          ]
            .filter(Boolean)
            .join('\n')

          const observacoes =
            [e.instrucoes_preparo, e.observacoes].filter(Boolean).join(' | ') || '—'

          const aut = e.numero_autorizacao
            ? `${e.numero_autorizacao}${e.validade_autorizacao ? ` (até ${formatarData(e.validade_autorizacao)})` : ''}`
            : '—'

          return [
            e.nome,
            e.tipo,
            e.status,
            datas,
            aut,
            e.local_realizacao || '—',
            medico,
            observacoes,
          ]
        })
      : [['Nenhum exame cadastrado.', '', '', '', '', '', '', '']]

  autoTable(doc, {
    startY: 56,
    head: [
      [
        'Exame',
        'Tipo',
        'Status (5 estados)',
        'Datas de Acompanhamento',
        'Autorização',
        'Local',
        'Médico Solicitante',
        'Preparo / Observações',
      ],
    ],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: TEXT_MAIN,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 28 },
      4: { cellWidth: 24 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
      7: { cellWidth: 26 },
    },
    alternateRowStyles: {
      fillColor: [246, 248, 245],
    },
    margin: { left: 14, right: 14 },
  })

  applyFooters(doc)

  const filename = `sevisaude-exames-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.pdf`
  doc.save(filename)
}

// ============================================================================
// 6. PDF: MÉDICOS E PROFISSIONAIS
// ============================================================================
export function exportarMedicosPDF(data: ExportDataPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dataGeracao = formatarDataHora(now)

  drawHeader(doc, data.profile, 'Profissionais de Saúde e Médicos', dataGeracao)

  const medicos = data.medicos || []
  const rows =
    medicos.length > 0
      ? medicos.map((m) => [
          m.nome,
          m.especialidade,
          m.crm || '—',
          m.telefone || '—',
          m.email || '—',
          m.observacoes || '—',
        ])
      : [['Nenhum profissional cadastrado para este titular.', '', '', '', '', '']]

  autoTable(doc, {
    startY: 56,
    head: [['Nome', 'Especialidade', 'Registro (CRM/CRN)', 'Telefone', 'E-mail', 'Observações']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_MAIN,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 24 },
      3: { cellWidth: 26 },
      4: { cellWidth: 32 },
      5: { cellWidth: 30 },
    },
    alternateRowStyles: {
      fillColor: [246, 248, 245],
    },
    margin: { left: 14, right: 14 },
  })

  applyFooters(doc)

  const filename = `sevisaude-medicos-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.pdf`
  doc.save(filename)
}

// ============================================================================
// 7. PDF: DOCUMENTOS DE SAÚDE (LISTA E METADADOS)
// ============================================================================
export function exportarDocumentosPDF(data: ExportDataPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dataGeracao = formatarDataHora(now)

  drawHeader(doc, data.profile, 'Inventário de Documentos de Saúde', dataGeracao)

  const documentos = data.documentos || []
  const rows =
    documentos.length > 0
      ? documentos.map((d) => [
          d.titulo,
          d.categoria,
          d.expand?.exame_ref?.nome || '—',
          formatarTimestampLocal(d.created),
          d.arquivo ? 'Sim (anexado)' : 'Não',
        ])
      : [['Nenhum documento arquivado para este titular.', '', '', '', '']]

  autoTable(doc, {
    startY: 56,
    head: [['Título do Documento', 'Categoria', 'Exame Relacionado', 'Data de Upload', 'Anexo']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: TEXT_MAIN,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40 },
      2: { cellWidth: 42 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20 },
    },
    alternateRowStyles: {
      fillColor: [246, 248, 245],
    },
    margin: { left: 14, right: 14 },
  })

  applyFooters(doc)

  const filename = `sevisaude-documentos-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.pdf`
  doc.save(filename)
}

// ============================================================================
// 8. PDF: EXPORTAÇÃO COMPLETA (DOSSIÊ INTEGRAL DE SAÚDE)
// ============================================================================
export function exportarDossieCompletoPDF(data: ExportDataPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dataGeracao = formatarDataHora(now)

  drawHeader(doc, data.profile, 'Dossiê Completo de Saúde', dataGeracao)

  let startY = 56

  // 1. Perfil Clínico
  const alergiasTexto =
    data.alergias || data.profile.alergias || 'Nenhuma alergia conhecida a medicamentos.'
  const condicoesTexto =
    data.condicoesSaude || data.profile.condicoes_saude || 'Nenhuma condição crônica registrada.'
  const emergNome = data.profile.contato_emergencia_nome || 'Não cadastrado'
  const emergTel = data.profile.contato_emergencia_telefone || '—'

  autoTable(doc, {
    startY,
    head: [['Alergias e Reações', 'Condições Crônicas', 'Contato de Emergência']],
    body: [[alergiasTexto, condicoesTexto, `${emergNome}\nTelefone: ${emergTel}`]],
    theme: 'grid',
    headStyles: {
      fillColor: BRAND_DARK,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
    margin: { left: 14, right: 14 },
  })
  // @ts-expect-error autoTable adds lastAutoTable to doc
  startY = (doc.lastAutoTable.finalY as number) + 6

  // 2. Medicamentos
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2])
  doc.text('1. Medicamentos Cadastrados', 14, startY)
  startY += 2

  const meds = data.medicamentos || []
  const medsRows =
    meds.length > 0
      ? meds.map((m) => [
          m.nome,
          m.dose_prescrita
            ? `${m.dose_prescrita} ${m.unidade_dose || ''}`
            : m.concentracao || m.dosagem || '—',
          m.status,
          m.frequencia || '—',
          Array.isArray(m.horarios) ? m.horarios.join(', ') : '—',
          m.expand?.medico?.nome || '—',
        ])
      : [['Nenhum medicamento registrado.', '', '', '', '', '']]

  autoTable(doc, {
    startY,
    head: [['Medicamento', 'Dose', 'Status', 'Frequência', 'Horários', 'Médico']],
    body: medsRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_PRIMARY, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  })
  // @ts-expect-error autoTable adds lastAutoTable to doc
  startY = (doc.lastAutoTable.finalY as number) + 6

  // 3. Consultas
  if (startY > 230) {
    doc.addPage()
    drawHeader(doc, data.profile, 'Dossiê Completo (continuação)', dataGeracao)
    startY = 56
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2])
  doc.text('2. Consultas Médicas', 14, startY)
  startY += 2

  const consultas = data.consultas || []
  const consultRows =
    consultas.length > 0
      ? consultas.map((c) => {
          const aut = c.numero_autorizacao
            ? `${c.numero_autorizacao}${c.validade_autorizacao ? ` (até ${formatarData(c.validade_autorizacao)})` : ''}`
            : '—'
          return [
            formatarData(c.data),
            formatarHora(c.horario) || '—',
            c.status,
            c.expand?.medico?.nome || '—',
            c.tipo,
            aut,
            c.motivo_atendimento || c.anotacoes || '—',
          ]
        })
      : [['Nenhuma consulta registrada.', '', '', '', '', '', '']]

  autoTable(doc, {
    startY,
    head: [
      ['Data', 'Horário', 'Status', 'Profissional', 'Tipo', 'Autorização', 'Motivo / Anotação'],
    ],
    body: consultRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_PRIMARY, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  })
  // @ts-expect-error autoTable adds lastAutoTable to doc
  startY = (doc.lastAutoTable.finalY as number) + 6

  // 4. Exames
  if (startY > 230) {
    doc.addPage()
    drawHeader(doc, data.profile, 'Dossiê Completo (continuação)', dataGeracao)
    startY = 56
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2])
  doc.text('3. Exames e Diagnósticos', 14, startY)
  startY += 2

  const exames = data.exames || []
  const examesRows =
    exames.length > 0
      ? exames.map((e) => {
          const aut = e.numero_autorizacao
            ? `${e.numero_autorizacao}${e.validade_autorizacao ? ` (até ${formatarData(e.validade_autorizacao)})` : ''}`
            : '—'
          return [
            e.nome,
            e.tipo,
            e.status,
            formatarData(e.data_solicitado),
            e.data_realizado ? formatarData(e.data_realizado) : '—',
            e.local_realizacao || '—',
            aut,
          ]
        })
      : [['Nenhum exame registrado.', '', '', '', '', '', '']]

  autoTable(doc, {
    startY,
    head: [['Exame', 'Tipo', 'Status', 'Solicitado', 'Realizado', 'Local', 'Autorização']],
    body: examesRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_PRIMARY, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  })

  applyFooters(doc)

  const filename = `sevisaude-dossie-completo-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.pdf`
  doc.save(filename)
}

// ============================================================================
// EXPORTAÇÕES CSV (DADOS TABULARES)
// ============================================================================

/**
 * Utilitário para baixar string CSV com encoding UTF-8 (BOM incluso para compatibilidade com Excel)
 */
function downloadCsv(content: string, filename: string): void {
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

export function exportarMedicamentosCSV(data: ExportDataPayload): void {
  const header = [
    'Nome',
    'Princípio Ativo',
    'Dose Prescrita',
    'Unidade Dose',
    'Concentração',
    'Forma Farmacêutica',
    'Periodicidade',
    'Dia de Referência',
    'Frequência',
    'Horários (com quantidades)',
    'Tipo de Uso',
    'Status',
    'Data Início',
    'Data Fim',
    'Médico Prescritor',
    'Instruções',
    'Observações',
  ]

  const lines = [header.map(escapeCsvCell).join(';')]
  ;(data.medicamentos || []).forEach((m) => {
    const normHorarios = normalizarHorarios(m.horarios)
    const horarios =
      normHorarios.length > 0
        ? normHorarios
            .map((h) => formatarChipHorario(h, m.unidade_dose || m.forma || ''))
            .join(', ')
        : ''
    const pLegivel =
      formatarPeriodicidadeLegivel(m.periodicidade, m.dia_referencia) || m.periodicidade || ''
    lines.push(
      [
        m.nome,
        m.principio_ativo || '',
        m.dose_prescrita || '',
        m.unidade_dose || '',
        m.concentracao || m.dosagem || '',
        m.forma || '',
        pLegivel,
        m.dia_referencia || '',
        m.frequencia || '',
        horarios,
        m.tipo_uso || '',
        m.status,
        formatarData(m.data_inicio),
        formatarData(m.data_fim),
        m.expand?.medico?.nome || '',
        m.instrucoes_prescricao || '',
        m.observacoes || '',
      ]
        .map(escapeCsvCell)
        .join(';'),
    )
  })

  const filename = `sevisaude-medicamentos-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.csv`
  downloadCsv(lines.join('\r\n'), filename)
}

export function exportarHistoricoMedicamentosCSV(data: ExportDataPayload): void {
  const medsMap = new Map<string, string>()
  ;(data.medicamentos || []).forEach((m) => medsMap.set(m.id, m.nome))

  const header = [
    'Data/Hora',
    'Medicamento',
    'Campo Alterado',
    'Valor Anterior',
    'Novo Valor',
    'Motivo da Alteração',
    'Usuário Responsável',
  ]

  const lines = [header.map(escapeCsvCell).join(';')]
  ;(data.alteracoesMedicamentos || []).forEach((h) => {
    const medNome = medsMap.get(h.medicamento) || 'Medicamento'
    const dt = h.data_hora ? formatarTimestampLocal(h.data_hora) : formatarData(h.data)
    lines.push(
      [
        dt,
        medNome,
        h.campo_alterado || '',
        h.valor_anterior || '',
        h.novo_valor || '',
        h.motivo || '',
        h.usuario_responsavel || '',
      ]
        .map(escapeCsvCell)
        .join(';'),
    )
  })

  const filename = `sevisaude-historico-medicamentos-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.csv`
  downloadCsv(lines.join('\r\n'), filename)
}

export function exportarConsultasCSV(data: ExportDataPayload): void {
  const header = [
    'Data',
    'Horário',
    'Status',
    'Profissional',
    'Especialidade',
    'CRM',
    'Tipo',
    'Local',
    'Número da Autorização',
    'Validade da Autorização',
    'Motivo do Atendimento',
    'Sintomas Relatados',
    'Assuntos Tratados',
    'Resumo de Orientações',
    'Alterações de Medicamentos',
    'Exames Solicitados',
    'Próximos Passos',
    'Data Prevista de Retorno',
    'Anotações Gerais',
  ]

  const lines = [header.map(escapeCsvCell).join(';')]
  ;(data.consultas || []).forEach((c) => {
    lines.push(
      [
        formatarData(c.data),
        formatarHora(c.horario),
        c.status,
        c.expand?.medico?.nome || '',
        c.expand?.medico?.especialidade || '',
        c.expand?.medico?.crm || '',
        c.tipo,
        c.local || '',
        c.numero_autorizacao || '',
        formatarData(c.validade_autorizacao),
        c.motivo_atendimento || '',
        c.sintomas_relatados || '',
        c.assuntos_tratados || '',
        c.resumo_orientacoes || '',
        c.alteracoes_medicamentos_relacionadas || '',
        c.exames_solicitados_relacionados || '',
        c.proximos_passos || '',
        formatarData(c.data_prevista_retorno),
        c.anotacoes || '',
      ]
        .map(escapeCsvCell)
        .join(';'),
    )
  })

  const filename = `sevisaude-consultas-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.csv`
  downloadCsv(lines.join('\r\n'), filename)
}

export function exportarExamesCSV(data: ExportDataPayload): void {
  const header = [
    'Nome do Exame',
    'Tipo',
    'Status',
    'Data Solicitado',
    'Data/Hora Agendada',
    'Data Realizado',
    'Data Disponibilização Resultado',
    'Número da Autorização',
    'Validade da Autorização',
    'Médico Solicitante',
    'Local de Realização',
    'Instruções de Preparo',
    'Observações',
  ]

  const lines = [header.map(escapeCsvCell).join(';')]
  ;(data.exames || []).forEach((e) => {
    lines.push(
      [
        e.nome,
        e.tipo,
        e.status,
        formatarData(e.data_solicitado),
        e.data_hora_agendada ? formatarDataHora(e.data_hora_agendada) : '',
        formatarData(e.data_realizado),
        formatarData(e.data_disponibilizacao_resultado),
        e.numero_autorizacao || '',
        formatarData(e.validade_autorizacao),
        e.expand?.medico?.nome || '',
        e.local_realizacao || '',
        e.instrucoes_preparo || '',
        e.observacoes || '',
      ]
        .map(escapeCsvCell)
        .join(';'),
    )
  })

  const filename = `sevisaude-exames-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.csv`
  downloadCsv(lines.join('\r\n'), filename)
}

export function exportarMedicosCSV(data: ExportDataPayload): void {
  const header = ['Nome', 'Especialidade', 'CRM / Registro', 'Telefone', 'E-mail', 'Observações']

  const lines = [header.map(escapeCsvCell).join(';')]
  ;(data.medicos || []).forEach((m) => {
    lines.push(
      [m.nome, m.especialidade, m.crm || '', m.telefone || '', m.email || '', m.observacoes || '']
        .map(escapeCsvCell)
        .join(';'),
    )
  })

  const filename = `sevisaude-medicos-${sanitizeFilename(data.profile.nome)}-${getDataArquivo()}.csv`
  downloadCsv(lines.join('\r\n'), filename)
}
