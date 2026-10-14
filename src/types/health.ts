export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  created: string
  updated: string
  verified?: boolean
  meta?: {
    lembreteMedicamentos?: boolean
    lembreteConsultas?: boolean
    lembreteExames?: boolean
    telefone?: string
    dataNascimento?: string
  }
}

export interface Medico {
  id: string
  nome: string
  especialidade: string
  crm?: string
  telefone?: string
  email?: string
  observacoes?: string
  userId: string
  created: string
  updated: string
}

export type FormaFarmaceutica =
  | 'comprimido'
  | 'cápsula'
  | 'xarope'
  | 'solução'
  | 'injetável'
  | 'creme'
  | 'outro'

export interface Medicamento {
  id: string
  nome: string
  dosagem: string
  forma: FormaFarmaceutica
  laboratorio?: string
  medico?: string // id
  expand?: {
    medico?: Medico
  }
  data_inicio: string
  data_fim?: string
  horarios?: string[] | string // stored as json array e.g. ["08:00", "20:00"]
  observacoes?: string
  status: 'ativo' | 'encerrado'
  userId: string
  created: string
  updated: string
}

export interface AlteracaoMedicamento {
  id: string
  medicamento: string
  motivo: string
  data: string
  created: string
  updated: string
}

export type TipoConsulta = 'Presencial' | 'Teleconsulta' | 'Domiciliar'
export type StatusConsulta = 'Agendada' | 'Realizada' | 'Cancelada'

export interface Consulta {
  id: string
  medico: string
  expand?: {
    medico?: Medico
  }
  data: string
  horario: string
  tipo: TipoConsulta
  local?: string
  status: StatusConsulta
  anotacoes?: string
  userId: string
  created: string
  updated: string
}

export type TipoExame =
  | 'Sangue'
  | 'Imagem'
  | 'Urina'
  | 'Fezes'
  | 'Cardíaco'
  | 'Preventivo'
  | 'Outro'

export type StatusExame = 'Solicitado' | 'Em análise' | 'Concluído'

export interface Exame {
  id: string
  nome: string
  tipo: TipoExame
  medico: string
  expand?: {
    medico?: Medico
  }
  data_solicitado: string
  data_realizado?: string
  status: StatusExame
  observacoes?: string
  pedido_arquivo?: string
  resultado_arquivo?: string
  userId: string
  created: string
  updated: string
}

export type CategoriaDocumento =
  | 'Exame — Pedido'
  | 'Exame — Resultado'
  | 'Receita'
  | 'Laudo'
  | 'Atestado'
  | 'Outro'

export interface Documento {
  id: string
  titulo: string
  categoria: CategoriaDocumento
  exame_ref?: string
  expand?: {
    exame_ref?: Exame
  }
  arquivo: string
  userId: string
  created: string
  updated: string
}
