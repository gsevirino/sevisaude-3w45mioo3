import type { Medicamento, HorarioItem, PeriodicidadeMedicamento } from '@/types/health'

export const DIAS_SEMANA = [
  { value: 'segunda', label: 'Segunda-feira', labelCurto: 'segundas', dayIndex: 1 },
  { value: 'terca', label: 'Terça-feira', labelCurto: 'terças', dayIndex: 2 },
  { value: 'quarta', label: 'Quarta-feira', labelCurto: 'quartas', dayIndex: 3 },
  { value: 'quinta', label: 'Quinta-feira', labelCurto: 'quintas', dayIndex: 4 },
  { value: 'sexta', label: 'Sexta-feira', labelCurto: 'sextas', dayIndex: 5 },
  { value: 'sabado', label: 'Sábado', labelCurto: 'sábados', dayIndex: 6 },
  { value: 'domingo', label: 'Domingo', labelCurto: 'domingos', dayIndex: 0 },
]

export const PERIODICIDADE_OPTIONS: {
  value: PeriodicidadeMedicamento
  label: string
  descricao: string
}[] = [
  {
    value: 'diária',
    label: 'Contínua / Diária',
    descricao: 'Todos os dias ou conforme horários definidos',
  },
  { value: 'semanal', label: 'Semanal', descricao: '1 vez por semana em um dia fixo' },
  { value: 'quinzenal', label: 'Quinzenal', descricao: 'A cada 15 dias (semanas alternadas)' },
  { value: 'mensal', label: 'Mensal', descricao: '1 vez por mês em um dia específico' },
  { value: 'semestral', label: 'Semestral', descricao: 'A cada 6 meses' },
  {
    value: 'temporário',
    label: 'Uso temporário',
    descricao: 'Período determinado (ex.: antibiótico)',
  },
]

/**
 * Normaliza qualquer formato de horários (legado string[], array de objetos, ou string json)
 * para uma lista uniforme de HorarioItem.
 */
export function normalizarHorarios(raw: any): HorarioItem[] {
  if (!raw) return []

  let list = raw
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw)
    } catch {
      return []
    }
  }

  if (!Array.isArray(list)) return []

  const result: HorarioItem[] = []

  for (const item of list) {
    if (typeof item === 'string') {
      const trimmed = item.trim()
      if (trimmed) {
        result.push({ hora: trimmed, quantidade: null })
      }
    } else if (item && typeof item === 'object') {
      const hora = typeof item.hora === 'string' ? item.hora.trim() : ''
      if (hora) {
        let qtd: number | null = null
        if (
          typeof item.quantidade === 'number' &&
          !Number.isNaN(item.quantidade) &&
          item.quantidade > 0
        ) {
          qtd = item.quantidade
        } else if (typeof item.quantidade === 'string' && item.quantidade.trim() !== '') {
          const parsed = Number(item.quantidade.replace(',', '.'))
          if (!Number.isNaN(parsed) && parsed > 0) {
            qtd = parsed
          }
        }
        result.push({ hora, quantidade: qtd })
      }
    }
  }

  // Ordenar por horário
  return result.sort((a, b) => a.hora.localeCompare(b.hora))
}

/**
 * Formata um HorarioItem como texto amigável:
 * ex.: "08:00" ou "08:00 · 4 comprimidos"
 */
export function formatarChipHorario(item: HorarioItem, unidade?: string): string {
  if (!item.quantidade) {
    return item.hora
  }
  const unit = unidade ? ` ${unidade}${item.quantidade > 1 ? plurallizarUnidade(unidade) : ''}` : ''
  return `${item.hora} · ${item.quantidade}${unit}`
}

function plurallizarUnidade(unidade: string): string {
  const u = unidade.toLowerCase().trim()
  if (u.endsWith('s')) return ''
  if (u.endsWith('m')) return '' // ex: 10 ml
  if (u === 'gota') return 's'
  if (u === 'comprimido') return 's'
  if (u === 'cápsula') return 's'
  if (u === 'dose') return 's'
  if (u === 'ampola') return 's'
  if (u === 'adesivo') return 's'
  return 's'
}

/**
 * Formata a periodicidade de forma legível:
 * ex.: "Semanal · às segundas", "Mensal · dia 15", "Semestral · 10/03"
 */
export function formatarPeriodicidadeLegivel(
  periodicidade?: PeriodicidadeMedicamento,
  diaRef?: string,
): string | null {
  if (!periodicidade || periodicidade === 'diária') {
    return null
  }

  if (periodicidade === 'semanal') {
    if (!diaRef) return 'Semanal'
    const diaObj = DIAS_SEMANA.find((d) => d.value === diaRef)
    const diaNome = diaObj ? diaObj.labelCurto : diaRef
    return `Semanal · às ${diaNome}`
  }

  if (periodicidade === 'quinzenal') {
    if (!diaRef) return 'Quinzenal'
    const diaObj = DIAS_SEMANA.find((d) => d.value === diaRef)
    const diaNome = diaObj ? diaObj.labelCurto : diaRef
    return `Quinzenal · às ${diaNome}`
  }

  if (periodicidade === 'mensal') {
    if (!diaRef) return 'Mensal'
    return `Mensal · dia ${diaRef}`
  }

  if (periodicidade === 'semestral') {
    if (!diaRef) return 'Semestral'
    // diaRef pode ser YYYY-MM-DD ou DD/MM
    if (diaRef.includes('-')) {
      const parts = diaRef.split('-')
      if (parts.length === 3) {
        return `Semestral · ${parts[2]}/${parts[1]}`
      }
    }
    return `Semestral · ${diaRef}`
  }

  if (periodicidade === 'temporário') {
    return 'Uso temporário'
  }

  return periodicidade
}

/**
 * Verifica se um medicamento deve ser tomado no dia de hoje (`targetDate`),
 * considerando sua periodicidade estruturada e data de início.
 */
export function medicamentoTomaHoje(med: Medicamento, targetDate: Date = new Date()): boolean {
  if (med.status !== 'em uso') return false

  const p = med.periodicidade || 'diária'

  // Diária ou uso contínuo sem periodicidade específica marcada
  if (p === 'diária') return true

  if (p === 'temporário') {
    // Se tiver data_inicio / data_fim, checa se hoje está no intervalo
    const targetYmd = formatarDataYmd(targetDate)
    const inicioYmd = med.data_inicio ? med.data_inicio.slice(0, 10) : ''
    const fimYmd = med.data_fim ? med.data_fim.slice(0, 10) : ''
    if (inicioYmd && targetYmd < inicioYmd) return false
    if (fimYmd && targetYmd > fimYmd) return false
    return true
  }

  const diaRef = med.dia_referencia?.trim()

  if (p === 'semanal') {
    if (!diaRef) return false // Sem dia de referência definido, não assume hoje
    const diaObj = DIAS_SEMANA.find((d) => d.value === diaRef)
    if (!diaObj) return false
    return targetDate.getDay() === diaObj.dayIndex
  }

  if (p === 'quinzenal') {
    if (!diaRef) return false
    const diaObj = DIAS_SEMANA.find((d) => d.value === diaRef)
    if (!diaObj) return false
    if (targetDate.getDay() !== diaObj.dayIndex) return false

    // Checagem de semana par/ímpar a partir da data de início (ou do epoch)
    const baseDate = med.data_inicio
      ? new Date(med.data_inicio.slice(0, 10) + 'T12:00:00')
      : new Date('2026-01-01T12:00:00')
    const diffMs = targetDate.getTime() - baseDate.getTime()
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
    // A cada 2 semanas (semana par em relação à data base)
    return Math.abs(diffWeeks) % 2 === 0
  }

  if (p === 'mensal') {
    if (!diaRef) return false
    const diaNum = Number.parseInt(diaRef, 10)
    if (Number.isNaN(diaNum)) return false
    return targetDate.getDate() === diaNum
  }

  if (p === 'semestral') {
    if (!diaRef) return false
    let refDay = 0
    let refMonth = 0 // 0-indexed
    if (diaRef.includes('-')) {
      const parts = diaRef.split('-')
      if (parts.length >= 3) {
        refDay = Number.parseInt(parts[2], 10)
        refMonth = Number.parseInt(parts[1], 10) - 1
      }
    } else if (diaRef.includes('/')) {
      const parts = diaRef.split('/')
      if (parts.length >= 2) {
        refDay = Number.parseInt(parts[0], 10)
        refMonth = Number.parseInt(parts[1], 10) - 1
      }
    }

    if (!refDay || Number.isNaN(refDay)) return false

    // Semestral: cai no mesmo dia do mês, a cada 6 meses (refMonth e refMonth + 6)
    const currentDay = targetDate.getDate()
    const currentMonth = targetDate.getMonth()

    if (currentDay !== refDay) return false
    return currentMonth % 6 === refMonth % 6
  }

  return true
}

function formatarDataYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
