/**
 * Utilitários centrais de formatação de datas e horários para o padrão pt-BR.
 *
 * Padrão do app SeviSaúde:
 * - Datas: DD/MM/AAAA
 * - Horários: HH:mm (24h)
 * - Data e hora: DD/MM/AAAA às HH:mm (ou customizado)
 *
 * Proteções contra bugs de fuso e strings do PocketBase:
 * - O PocketBase armazena campos date como 'YYYY-MM-DD 00:00:00.000Z' ou 'YYYY-MM-DDTHH:mm:ss.sssZ'.
 * - Uma divisão ingênua como `iso.split('T')[0]` falha quando o separador é espaço (' '), deixando '24 00:00:00.000Z/10/2026'.
 * - Conversões ingênuas com `new Date('YYYY-MM-DD')` subtraem fuso no Brasil (UTC-3), tornando o dia anterior.
 * - Estas funções extraem componentes YYYY, MM, DD diretamente sem deslocamento de fuso.
 */

/**
 * Extrai o componente de data no formato 'YYYY-MM-DD' de qualquer string de data
 * (seja 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss.sssZ', 'YYYY-MM-DD HH:mm:ss.sssZ' ou 'DD/MM/YYYY').
 */
export function extrairDataIso(valor?: string | null): string {
  if (!valor) return ''
  const trimmed = valor.trim()
  if (!trimmed) return ''

  // Formato ISO: YYYY-MM-DD...
  const matchIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (matchIso) {
    const [, ano, mes, dia] = matchIso
    return `${ano}-${mes}-${dia}`
  }

  // Formato BR: DD/MM/YYYY
  const matchBr = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (matchBr) {
    const [, dia, mes, ano] = matchBr
    return `${ano}-${mes}-${dia}`
  }

  // Tenta extrair partes separadas por T ou espaço
  const clean = trimmed.split(/[T\s]/)[0]
  const partes = clean.split('-')
  if (partes.length === 3 && partes[0].length === 4) {
    return clean
  }

  return ''
}

/**
 * Formata qualquer valor de data para o padrão brasileiro: DD/MM/AAAA.
 * Se o valor for inválido ou vazio, retorna string vazia ''.
 * Garante que datas "só dia" não sofram deslocamento de fuso.
 */
export function formatarData(valor?: string | Date | null): string {
  if (!valor) return ''

  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return ''
    const dia = String(valor.getDate()).padStart(2, '0')
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const ano = valor.getFullYear()
    return `${dia}/${mes}/${ano}`
  }

  const trimmed = String(valor).trim()
  if (!trimmed) return ''

  // Caso 1: YYYY-MM-DD no início (ex.: '2026-10-24 00:00:00.000Z', '2026-10-24T00:00:00Z', '2026-10-24')
  const matchIso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (matchIso) {
    const [, ano, mes, dia] = matchIso
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
  }

  // Caso 2: DD/MM/YYYY já formatado
  const matchBr = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchBr) {
    const [, dia, mes, ano] = matchBr
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
  }

  // Caso de fallback: parsing via Date
  try {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      // Se tiver padrão ISO com Z, usar métodos UTC para não deslocar quando hora for 00:00:00
      if (trimmed.includes('00:00:00') || !trimmed.includes(':')) {
        const dia = String(d.getUTCDate()).padStart(2, '0')
        const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
        const ano = d.getUTCFullYear()
        return `${dia}/${mes}/${ano}`
      }
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      const ano = d.getFullYear()
      return `${dia}/${mes}/${ano}`
    }
  } catch {
    // Retorna vazio em caso de erro
  }

  return ''
}

/**
 * Formata um horário para HH:mm em 24 horas.
 * Aceita '14:00', '14:00:00', '9:30', ou ISO com hora.
 */
export function formatarHora(valor?: string | null): string {
  if (!valor) return ''
  const trimmed = valor.trim()
  if (!trimmed) return ''

  // Padrão HH:mm ou HH:mm:ss
  const matchTime = trimmed.match(/(\d{1,2}):(\d{2})/)
  if (matchTime) {
    const [, hora, minuto] = matchTime
    return `${hora.padStart(2, '0')}:${minuto}`
  }

  return trimmed
}

/**
 * Formata data e horário completos: DD/MM/AAAA às HH:mm (ou formato customizado).
 * Trata tanto ISO timestamps reais (com hora e minuto além de 00:00) quanto combinações de data + campo horário.
 */
export function formatarDataHora(
  valor?: string | Date | null,
  horarioSeparado?: string | null,
): string {
  if (!valor) return ''

  const dataStr = formatarData(valor)
  if (!dataStr) return ''

  // Se foi fornecido horário separado explícito
  if (horarioSeparado) {
    const horaStr = formatarHora(horarioSeparado)
    if (horaStr) return `${dataStr} às ${horaStr}`
    return dataStr
  }

  // Se o próprio valor possui componente de hora não-nulo
  if (typeof valor === 'string') {
    const trimmed = valor.trim()

    // Verifica se possui horário dentro da string (ex: '2026-10-09 07:30' ou '15/10/2026 às 08:30')
    const matchHoraEmbutida = trimmed.match(/(?:T|\s+|às\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    if (matchHoraEmbutida) {
      const [, hora, minuto] = matchHoraEmbutida
      // Se não for meia-noite cravada UTC de campo apenas de data (00:00:00)
      if (hora !== '00' || minuto !== '00') {
        return `${dataStr} às ${hora.padStart(2, '0')}:${minuto}`
      }
    }
  } else if (valor instanceof Date && !isNaN(valor.getTime())) {
    const h = valor.getHours()
    const m = valor.getMinutes()
    if (h !== 0 || m !== 0) {
      const hora = String(h).padStart(2, '0')
      const minuto = String(m).padStart(2, '0')
      return `${dataStr} às ${hora}:${minuto}`
    }
  }

  return dataStr
}

/**
 * Formata um timestamp de auditoria/criação em data e hora local do usuário: DD/MM/AAAA às HH:mm.
 */
export function formatarTimestampLocal(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return formatarData(iso)

    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ano = d.getFullYear()
    const hora = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')

    return `${dia}/${mes}/${ano} às ${hora}:${min}`
  } catch {
    return formatarData(iso)
  }
}

/**
 * Aliases compatíveis para facilitar substituição direta nos arquivos existentes
 */
export const formatDate = formatarData
export const formatDateTime = formatarTimestampLocal
