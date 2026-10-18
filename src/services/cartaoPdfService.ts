import { createPdfDocument } from '@/services/exportService'
import type { HealthProfile, Medicamento } from '@/types/health'
import { formatarData } from '@/lib/dateUtils'

export interface CartaoDados {
  profile: HealthProfile | null
  nomeTitular: string
  dataNascimento?: string
  tipoSanguineo?: string
  alergias?: string
  condicoesSaude?: string
  contatoEmergenciaNome?: string
  contatoEmergenciaParentesco?: string
  contatoEmergenciaTelefone?: string
  planoSaudeOuSus?: string
  medicamentos: Medicamento[]
  dataAtualizacao?: string
}

// Cores Oficiais da Identidade Visual SeviSaúde (Paleta Suave e Off-white)
const COR_FUNDO_CARD = [253, 252, 251] // #FDFCFB Off-white / creme suave
const COR_BORDA_CARD = [217, 226, 212] // #D9E2D4 Borda sálvia suave
const COR_PRIMARIA = [76, 122, 90] // #4C7A5A Verde SeviSaúde
const COR_PRIMARIA_ESCURA = [38, 54, 43] // #26362B Verde Floresta Profundo
const COR_TEXTO_MUTED = [107, 122, 111] // #6B7A6F Cinza esverdeado
const COR_FUNDO_SECUNDARIO = [246, 244, 239] // #F6F4EF Bege suave
const COR_VERDE_CLARO = [231, 240, 227] // #E7F0E3 Sálvia claro
const COR_ALERTA_BG = [254, 242, 242] // Vermelho clarinho para alergia
const COR_ALERTA_BORDA = [252, 165, 165]
const COR_ALERTA_TEXTO = [153, 27, 27]

/**
 * Desenha o logo simplificado e o texto SeviSaúde no PDF com vetores limpos.
 */
function drawSeviSaudeLogo(doc: any, x: number, y: number, height = 7) {
  // Ícone em fundo verde suave
  doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.roundedRect(x, y, height, height, 1.5, 1.5, 'F')

  // Cruz / coração estilizado em branco no centro
  doc.setFillColor(255, 255, 255)
  const cx = x + height / 2
  const cy = y + height / 2
  // Desenhar duas pílulas brancas cruzadas
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(1)
  doc.line(cx - 1.8, cy, cx + 1.8, cy)
  doc.line(cx, cy - 1.8, cx, cy + 1.8)

  // Nome "SeviSaúde"
  const textX = x + height + 2
  doc.setFont('times', 'italic')
  doc.setFontSize(11)
  doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
  doc.text('Sevi', textX, y + height - 1.6)
  const seviW = doc.getTextWidth('Sevi')
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.text('Saúde', textX + seviW, y + height - 1.6)
}

/**
 * Desenha a Frente do Cartão nas dimensões exatas de 96 mm × 65 mm na posição (originX, originY).
 */
export function drawCartaoFrente(doc: any, originX: number, originY: number, dados: CartaoDados) {
  const w = 96
  const h = 65

  // Fundo off-white com cantos arredondados (raio 3 mm)
  doc.setFillColor(COR_FUNDO_CARD[0], COR_FUNDO_CARD[1], COR_FUNDO_CARD[2])
  doc.setDrawColor(COR_BORDA_CARD[0], COR_BORDA_CARD[1], COR_BORDA_CARD[2])
  doc.setLineWidth(0.4)
  doc.roundedRect(originX, originY, w, h, 3, 3, 'FD')

  // Faixa decorativa sutil no topo interno (verde suave)
  doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.roundedRect(originX + 2, originY + 2, w - 4, 1.2, 0.6, 0.6, 'F')

  // 1. Cabeçalho: Logo SeviSaúde (esquerda) + Badge Tipo/Cartão ou Plano (direita)
  const headerY = originY + 5.5
  drawSeviSaudeLogo(doc, originX + 5, headerY, 6)

  // Tag do cabeçalho à direita: Plano / SUS ou "CARTÃO DE SAÚDE"
  const planoText = dados.planoSaudeOuSus?.trim() || 'SUS / Particular'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  const planoW = doc.getTextWidth(planoText) + 4
  const badgeX = originX + w - 5 - planoW
  doc.setFillColor(COR_VERDE_CLARO[0], COR_VERDE_CLARO[1], COR_VERDE_CLARO[2])
  doc.setDrawColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.setLineWidth(0.2)
  doc.roundedRect(badgeX, headerY - 0.5, planoW, 4.5, 1.2, 1.2, 'FD')
  doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
  doc.text(planoText, badgeX + 2, headerY + 2.7)

  // Linha sutil separando cabeçalho
  doc.setDrawColor(COR_BORDA_CARD[0], COR_BORDA_CARD[1], COR_BORDA_CARD[2])
  doc.setLineWidth(0.25)
  doc.line(originX + 5, originY + 13, originX + w - 5, originY + 13)

  // 2. Identificação do Titular
  let curY = originY + 16.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
  doc.text('TITULAR DO PRONTUÁRIO', originX + 5, curY)

  curY += 4.5
  doc.setFont('times', 'italic')
  doc.setFontSize(12)
  doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
  const titularNome = dados.nomeTitular || 'Paciente SeviSaúde'
  // Encurtar se for muito longo para não sobrepor
  const titularNomeTrunc = doc.splitTextToSize(titularNome, w - 10)[0]
  doc.text(titularNomeTrunc, originX + 5, curY)

  // Metadados do titular: Nascimento e Tipo Sanguíneo em linha horizontal
  curY += 4
  const dataNascStr = dados.dataNascimento ? formatarData(dados.dataNascimento) : 'Não informada'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
  doc.text(`Nasc.: ${dataNascStr}`, originX + 5, curY)

  // Tipo Sanguíneo em destaque ao lado da data
  if (dados.tipoSanguineo?.trim()) {
    const tsX = originX + 46
    doc.setFillColor(COR_VERDE_CLARO[0], COR_VERDE_CLARO[1], COR_VERDE_CLARO[2])
    doc.setDrawColor(COR_BORDA_CARD[0], COR_BORDA_CARD[1], COR_BORDA_CARD[2])
    doc.setLineWidth(0.2)
    doc.roundedRect(tsX, curY - 3, 20, 4.2, 1, 1, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
    doc.text(`SANGUE: ${dados.tipoSanguineo.trim()}`, tsX + 2, curY)
  }

  // 3. Box de Alergias
  curY += 2
  const alergiasTexto = dados.alergias?.trim() || 'Nenhuma alergia conhecida relatada'
  const temAlergiaCadastrada = Boolean(
    dados.alergias?.trim() && !dados.alergias.toLowerCase().includes('nenhum'),
  )

  const temCondicoes = Boolean(dados.condicoesSaude?.trim())
  // Se houver condições a renderizar abaixo, mantém a caixa de alergias mais compacta
  const boxAlergiaH = temCondicoes ? 8.5 : 9.5
  if (temAlergiaCadastrada) {
    doc.setFillColor(COR_ALERTA_BG[0], COR_ALERTA_BG[1], COR_ALERTA_BG[2])
    doc.setDrawColor(COR_ALERTA_BORDA[0], COR_ALERTA_BORDA[1], COR_ALERTA_BORDA[2])
  } else {
    doc.setFillColor(COR_FUNDO_SECUNDARIO[0], COR_FUNDO_SECUNDARIO[1], COR_FUNDO_SECUNDARIO[2])
    doc.setDrawColor(COR_BORDA_CARD[0], COR_BORDA_CARD[1], COR_BORDA_CARD[2])
  }
  doc.setLineWidth(0.25)
  doc.roundedRect(originX + 5, curY, w - 10, boxAlergiaH, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.2)
  if (temAlergiaCadastrada) {
    doc.setTextColor(COR_ALERTA_TEXTO[0], COR_ALERTA_TEXTO[1], COR_ALERTA_TEXTO[2])
    doc.text('! ALERGIAS E REAÇÕES ADVERSAS:', originX + 7, curY + 2.8)
  } else {
    doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
    doc.text('ALERGIAS A MEDICAMENTOS:', originX + 7, curY + 2.8)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.8)
  if (temAlergiaCadastrada) {
    doc.setTextColor(COR_ALERTA_TEXTO[0], COR_ALERTA_TEXTO[1], COR_ALERTA_TEXTO[2])
  } else {
    doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
  }
  const alergiasLinhas = doc.splitTextToSize(alergiasTexto, w - 14)
  doc.text(alergiasLinhas[0] || 'Nenhuma', originX + 7, curY + 6.0)
  if (alergiasLinhas[1] && boxAlergiaH >= 9.5) {
    doc.text(alergiasLinhas[1], originX + 7, curY + 8.4)
  }

  curY += boxAlergiaH + 1.2

  // 4. Bloco de Condições de Saúde na ÍNTEGRA (sem corte nem truncamento)
  const footerY = originY + 53.5
  if (temCondicoes) {
    const condicoesStr = dados.condicoesSaude!.trim()
    const prefixo = 'Condições: '
    const maxWidth = w - 10 // 86 mm

    // Ajuste dinâmico de tamanho de fonte para acomodar lista longa sem sobrepor o rodapé
    let condFontSize = 5.6
    let condLineLeading = 2.4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(condFontSize)
    let fullLines = doc.splitTextToSize(`${prefixo}${condicoesStr}`, maxWidth)
    let maxLinesAllowed = Math.floor((footerY - curY - 0.5) / condLineLeading)

    if (fullLines.length > maxLinesAllowed) {
      condFontSize = 5.0
      condLineLeading = 2.1
      doc.setFontSize(condFontSize)
      fullLines = doc.splitTextToSize(`${prefixo}${condicoesStr}`, maxWidth)
      maxLinesAllowed = Math.floor((footerY - curY - 0.5) / condLineLeading)
    }

    if (fullLines.length > maxLinesAllowed) {
      condFontSize = 4.5
      condLineLeading = 1.9
      doc.setFontSize(condFontSize)
      fullLines = doc.splitTextToSize(`${prefixo}${condicoesStr}`, maxWidth)
    }

    // Renderizar todas as linhas com prefixo "Condições:" em negrito
    fullLines.forEach((line: string, idx: number) => {
      const lineY = curY + idx * condLineLeading + 2
      if (idx === 0) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
        doc.text(prefixo, originX + 5, lineY)
        const prefixWidth = doc.getTextWidth(prefixo)
        const resto = line.slice(prefixo.length)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
        doc.text(resto, originX + 5 + prefixWidth, lineY)
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
        doc.text(line, originX + 5, lineY)
      }
    })
  }

  // 5. Rodapé da Frente: Contato de Emergência
  doc.setFillColor(COR_FUNDO_SECUNDARIO[0], COR_FUNDO_SECUNDARIO[1], COR_FUNDO_SECUNDARIO[2])
  doc.setDrawColor(COR_BORDA_CARD[0], COR_BORDA_CARD[1], COR_BORDA_CARD[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(originX + 5, footerY, w - 10, 9.5, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.text('CONTATO DE EMERGÊNCIA:', originX + 7, footerY + 3.3)

  const emergNome = dados.contatoEmergenciaNome?.trim() || 'A definir'
  const emergParentesco = dados.contatoEmergenciaParentesco?.trim()
    ? ` (${dados.contatoEmergenciaParentesco.trim()})`
    : ''
  const emergTel = dados.contatoEmergenciaTelefone?.trim() || '—'

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
  const emergNomeTrunc = doc.splitTextToSize(`${emergNome}${emergParentesco}`, 48)[0]
  doc.text(emergNomeTrunc, originX + 7, footerY + 7.2)

  // Telefone em destaque à direita
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.text(emergTel, originX + w - 7, footerY + 7.2, { align: 'right' })

  // Pequeno indicador discreto no canto inferior "Frente"
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.5)
  doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
  doc.text('Frente • 96x65 mm', originX + w - 5, originY + h - 1.2, { align: 'right' })
}

/**
 * Desenha o Verso do Cartão nas dimensões exatas de 96 mm × 65 mm na posição (originX, originY).
 * Exibe lista compacta de medicamentos SOMENTE COM O NOME de cada medicamento,
 * sem dose/concentração, sem quantidade, sem periodicidade e sem horários,
 * garantindo que toda a lista caiba sem overflow na área útil do verso.
 */
export function drawCartaoVerso(doc: any, originX: number, originY: number, dados: CartaoDados) {
  const w = 96
  const h = 65

  // Fundo off-white com cantos arredondados (raio 3 mm)
  doc.setFillColor(COR_FUNDO_CARD[0], COR_FUNDO_CARD[1], COR_FUNDO_CARD[2])
  doc.setDrawColor(COR_BORDA_CARD[0], COR_BORDA_CARD[1], COR_BORDA_CARD[2])
  doc.setLineWidth(0.4)
  doc.roundedRect(originX, originY, w, h, 3, 3, 'FD')

  // Faixa decorativa sutil no topo interno (verde sálvia)
  doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.roundedRect(originX + 2, originY + 2, w - 4, 1.2, 0.6, 0.6, 'F')

  // 1. Cabeçalho do Verso
  const headerY = originY + 6.5
  const countMeds = dados.medicamentos.length
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
  doc.text(`MEDICAMENTOS EM USO (${countMeds})`, originX + 5, headerY)

  // Subtítulo / etiqueta à direita
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
  doc.text('Somente nomes', originX + w - 5, headerY, { align: 'right' })

  // Linha separadora
  doc.setDrawColor(COR_BORDA_CARD[0], COR_BORDA_CARD[1], COR_BORDA_CARD[2])
  doc.setLineWidth(0.25)
  doc.line(originX + 5, originY + 8.5, originX + w - 5, originY + 8.5)

  // 2. Lista de Medicamentos em Uso (SOMENTE O NOME)
  // Área disponível: de listStartY = originY + 10.5 até footerY = originY + 56
  // Altura útil = ~45 mm. Largura total = 86 mm (margens 5 mm cada lado)
  const listStartY = originY + 10.5
  const footerY = originY + 56

  if (countMeds === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.5)
    doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
    doc.text('Nenhum medicamento com status "em uso" selecionado.', originX + 5, listStartY + 10)
  } else if (countMeds <= 10) {
    // 1 COLUNA: nomes limpos, quebram linha se longos, zebrado suave para até 10 itens
    const availH = footerY - listStartY - 1.5
    // Definir tamanho da fonte e altura por linha
    const fontSize = countMeds <= 5 ? 7.2 : countMeds <= 8 ? 6.4 : 5.8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fontSize)

    const maxItemH = availH / countMeds
    const itemHeight = Math.min(Math.max(maxItemH, 3.8), countMeds <= 4 ? 8.5 : 5.5)

    dados.medicamentos.forEach((m, idx) => {
      const itemY = listStartY + idx * itemHeight

      // Fundo zebrado sutil
      if (idx % 2 === 0) {
        doc.setFillColor(COR_FUNDO_SECUNDARIO[0], COR_FUNDO_SECUNDARIO[1], COR_FUNDO_SECUNDARIO[2])
        doc.roundedRect(originX + 4.5, itemY - 0.8, w - 9, itemHeight - 0.4, 0.8, 0.8, 'F')
      }

      // Marcador verde
      doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
      doc.circle(originX + 6.8, itemY + itemHeight / 2 - 0.3, 0.65, 'F')

      // Nome do medicamento (somente nome, sem dosagem nem horários)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fontSize)
      doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
      // Largura disponível para o texto: w - 16 = 80 mm
      const lines = doc.splitTextToSize(m.nome.trim(), w - 16)
      if (lines.length > 1 && itemHeight >= 6) {
        doc.text(lines[0], originX + 9, itemY + 2.2)
        doc.setFont('helvetica', 'normal')
        doc.text(lines[1], originX + 9, itemY + 4.8)
      } else {
        doc.text(lines[0] || m.nome, originX + 9, itemY + itemHeight / 2 + 0.8)
      }
    })
  } else {
    // 2 COLUNAS: para acomodar 11 até 24+ medicamentos com total tranquilidade
    const colW = (w - 10 - 4) / 2 // (96 - 10 - 4) / 2 = 41 mm
    const col1X = originX + 5
    const col2X = originX + 5 + colW + 4
    const half = Math.ceil(countMeds / 2)
    const availH = footerY - listStartY - 1
    const rowH = Math.min(Math.max(availH / half, 3.2), 4.4)
    const fontSize = countMeds > 18 ? 4.8 : 5.4

    dados.medicamentos.forEach((m, idx) => {
      const isCol2 = idx >= half
      const rowIdx = isCol2 ? idx - half : idx
      const colX = isCol2 ? col2X : col1X
      const itemY = listStartY + rowIdx * rowH

      // Fundo sutil alternado por linha
      if (rowIdx % 2 === 0) {
        doc.setFillColor(COR_FUNDO_SECUNDARIO[0], COR_FUNDO_SECUNDARIO[1], COR_FUNDO_SECUNDARIO[2])
        doc.roundedRect(colX - 0.5, itemY - 0.5, colW, rowH - 0.3, 0.6, 0.6, 'F')
      }

      // Marcador
      doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
      doc.circle(colX + 1.6, itemY + rowH / 2 - 0.2, 0.5, 'F')

      // Nome do medicamento
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fontSize)
      doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
      const lines = doc.splitTextToSize(m.nome.trim(), colW - 4.5)
      doc.text(lines[0] || m.nome, colX + 3.4, itemY + rowH / 2 + 0.8)
    })
  }

  // 3. Rodapé do Verso
  doc.setDrawColor(COR_BORDA_CARD[0], COR_BORDA_CARD[1], COR_BORDA_CARD[2])
  doc.setLineWidth(0.25)
  doc.line(originX + 5, footerY, originX + w - 5, footerY)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(4.8)
  doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
  doc.text(
    'Confira sempre as informações com prescrições médicas atuais.',
    originX + 5,
    footerY + 3.2,
  )

  const hoje = dados.dataAtualizacao || new Date().toLocaleDateString('pt-BR')
  doc.text(`Atualizado em: ${hoje} • sevisaude.com.br`, originX + 5, footerY + 6.2)

  // Pequeno indicador discreto no canto inferior "Verso"
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(4.5)
  doc.text('Verso • 96x65 mm', originX + w - 5, originY + h - 1.2, { align: 'right' })
}

/**
 * Desenha cruzes de corte e marcas milimétricas nos 4 cantos de uma área retangular.
 */
function drawCropMarks(doc: any, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(180, 190, 180)
  doc.setLineWidth(0.2)
  const arm = 4 // 4 mm de braço de corte
  const gap = 1 // 1 mm de folga do contorno

  // Canto superior-esquerdo
  doc.line(x - gap - arm, y, x - gap, y)
  doc.line(x, y - gap - arm, x, y - gap)

  // Canto superior-direito
  doc.line(x + w + gap, y, x + w + gap + arm, y)
  doc.line(x + w, y - gap - arm, x + w, y - gap)

  // Canto inferior-esquerdo
  doc.line(x - gap - arm, y + h, x - gap, y + h)
  doc.line(x, y + h + gap, x, y + h + gap + arm)

  // Canto inferior-direito
  doc.line(x + w + gap, y + h, x + w + gap + arm, y + h)
  doc.line(x + w, y + h + gap, x + w, y + h + gap + arm)
}

/**
 * GERAÇÃO 1: Folha A4 para Impressão com Frente e Verso e Linha de Dobra/Corte (96 mm × 65 mm cada).
 * Perfeito para imprimir em folha A4 comum, recortar na linha de corte e dobrar ao meio para plastificar.
 */
export function exportarCartaoSaudeA4(
  dados: CartaoDados,
  nomeArquivo = 'cartao-saude-96x65mm.pdf',
) {
  const doc = createPdfDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth() // 210 mm
  const cardW = 96
  const cardH = 65

  // Cabeçalho da página A4 com instruções para a usuária
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(COR_PRIMARIA_ESCURA[0], COR_PRIMARIA_ESCURA[1], COR_PRIMARIA_ESCURA[2])
  doc.text('SeviSaúde — Cartão de Saúde Físico', 15, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
  doc.text(
    'Tamanho oficial da carteirinha: exatamente 96 mm × 65 mm (formato carteirinha plastificada).',
    15,
    23,
  )
  doc.text(
    'Dica de impressão: selecione "Tamanho real" ou "Escala 100%" (não use "Ajustar à página").',
    15,
    27,
  )

  // Posicionar Frente e Verso verticalmente empilhados para facilitar dobrar ou recortar
  const startX = (pageW - cardW) / 2 // centralizado: (210 - 96) / 2 = 57 mm
  const frenteY = 35
  const versoY = frenteY + cardH + 12 // folga de 12 mm com linha guia de corte

  // Rótulo Frente
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.text('FRENTE (96 mm × 65 mm)', startX, frenteY - 2.5)

  // Desenhar Frente
  drawCartaoFrente(doc, startX, frenteY, dados)
  drawCropMarks(doc, startX, frenteY, cardW, cardH)

  // Linha tracejada divisória / guia de recorte entre frente e verso
  const midY = frenteY + cardH + 6
  doc.setDrawColor(180, 190, 180)
  doc.setLineWidth(0.3)
  if (typeof doc.setLineDashPattern === 'function') {
    doc.setLineDashPattern([2, 2], 0)
  }
  doc.line(startX - 5, midY, startX + cardW + 5, midY)
  if (typeof doc.setLineDashPattern === 'function') {
    doc.setLineDashPattern([], 0) // reset
  }
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
  doc.text('--- Linha de recorte / dobra ---', pageW / 2, midY - 1, { align: 'center' })

  // Rótulo Verso
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.text('VERSO (96 mm × 65 mm)', startX, versoY - 2.5)

  // Desenhar Verso
  drawCartaoVerso(doc, startX, versoY, dados)
  drawCropMarks(doc, startX, versoY, cardW, cardH)

  // Régua de calibração milimétrica de 50 mm para a usuária conferir com régua física se quiser
  const rulerX = startX
  const rulerY = versoY + cardH + 15
  doc.setDrawColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2])
  doc.setLineWidth(0.5)
  doc.line(rulerX, rulerY, rulerX + 50, rulerY)
  doc.line(rulerX, rulerY - 2, rulerX, rulerY + 2)
  doc.line(rulerX + 25, rulerY - 1.5, rulerX + 25, rulerY + 1.5)
  doc.line(rulerX + 50, rulerY - 2, rulerX + 50, rulerY + 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(COR_TEXTO_MUTED[0], COR_TEXTO_MUTED[1], COR_TEXTO_MUTED[2])
  doc.text(
    'Teste de calibração: a linha acima mede exatamente 50 mm (5 cm) quando impressa corretamente.',
    rulerX,
    rulerY + 5,
  )

  doc.save(nomeArquivo)
}

/**
 * GERAÇÃO 2: PDF no Formato Físico Direto da Carteirinha (Página 1: Frente 96×65 mm, Página 2: Verso 96×65 mm).
 * Ideal para gráficas rápidas, impressão em impressora térmica ou cartão plástico PVC.
 */
export function exportarCartaoSaudeDireto(
  dados: CartaoDados,
  nomeArquivo = 'carteirinha-sevisaude-96x65mm.pdf',
) {
  // Criar documento no formato exato 96 mm x 65 mm paisagem
  const doc = createPdfDocument({
    orientation: 'landscape',
    unit: 'mm',
    format: [65, 96],
  })

  // Página 1: Frente (ocupa 0 a 96 mm e 0 a 65 mm)
  drawCartaoFrente(doc, 0, 0, dados)

  // Página 2: Verso
  doc.addPage([65, 96], 'landscape')
  drawCartaoVerso(doc, 0, 0, dados)

  doc.save(nomeArquivo)
}
