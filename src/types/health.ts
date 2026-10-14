export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  created: string
  updated: string
  verified?: boolean
  alergias?: string
  condicoes_saude?: string
  contato_emergencia_nome?: string
  contato_emergencia_telefone?: string
  contato_emergencia_parentesco?: string
  meta?: {
    lembreteMedicamentos?: boolean
    lembreteConsultas?: boolean
    lembreteExames?: boolean
    telefone?: string
    dataNascimento?: string
    [key: string]: any
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
  | 'pomada'
  | 'gotas'
  | 'spray'
  | 'adesivo'
  | 'outro'

export type StatusMedicamento = 'em uso' | 'pausado' | 'suspenso' | 'concluído'
export type TipoUsoMedicamento = 'contínuo' | 'temporário'

export interface Medicamento {
  id: string
  nome: string
  // Campos avançados do prontuário
  principio_ativo?: string
  apresentacao?: string
  concentracao?: string
  dose_prescrita?: string
  unidade_dose?: string
  via_administracao?: string
  frequencia?: string
  instrucoes_prescricao?: string
  tipo_uso?: TipoUsoMedicamento
  data_prescricao?: string
  receita_arquivo?: string // nome do arquivo
  // Campos existentes
  dosagem?: string
  forma?: FormaFarmaceutica
  laboratorio?: string
  medico?: string // id
  expand?: {
    medico?: Medico
  }
  data_inicio?: string
  data_fim?: string
  horarios?: string[] | string // stored as json array e.g. ["08:00", "20:00"]
  observacoes?: string
  status: StatusMedicamento
  userId: string
  created: string
  updated: string
}

export interface AlteracaoMedicamento {
  id: string
  medicamento: string
  campo_alterado?: string
  valor_anterior?: string
  novo_valor?: string
  motivo: string
  usuario_responsavel?: string
  data?: string
  data_hora?: string
  userId?: string
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
  // Registro Pós-consulta estruturado
  motivo_atendimento?: string
  sintomas_relatados?: string
  perguntas_preparadas?: string
  assuntos_tratados?: string
  resumo_orientacoes?: string
  alteracoes_medicamentos_relacionadas?: string
  exames_solicitados_relacionados?: string
  encaminhamentos?: string
  proximos_passos?: string
  data_prevista_retorno?: string
  data_registro_notas?: string
  anexos?: string[] | string
  medicamentos_relacionados_ids?: string[] | string
  exames_relacionados_ids?: string[] | string
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
  | 'Endoscopia/Biópsia'
  | 'Genético'
  | 'Outro'

export type StatusExame = 'Pendente' | 'Agendado' | 'Realizado' | 'Finalizado' | 'Cancelado'

export interface HistoricoStatusExame {
  status: StatusExame
  data: string
  observacao?: string
}

export interface Exame {
  id: string
  nome: string
  tipo: TipoExame
  categoria?: string
  medico: string
  expand?: {
    medico?: Medico
    consulta_relacionada?: Consulta
  }
  data_solicitado: string
  data_realizado?: string
  data_validade?: string
  local_realizacao?: string
  data_hora_agendada?: string
  instrucoes_preparo?: string
  data_disponibilizacao_resultado?: string
  consulta_relacionada?: string // id
  status: StatusExame
  observacoes?: string
  pedido_arquivo?: string
  resultado_arquivo?: string
  pedidos_arquivos?: string[]
  resultados_arquivos?: string[]
  historico_status?: HistoricoStatusExame[] | string
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
