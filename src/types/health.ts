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
    onboardingCompleted?: boolean
    [key: string]: any
  }
}

export interface HealthProfile {
  id: string
  user: string // ID do usuário dono da conta
  nome: string
  parentesco?: string // 'titular' | 'filho(a)' | 'pai' | 'mãe' | 'cônjuge' | 'dependente' | etc.
  data_nascimento?: string
  tipo_sanguineo?: string
  alergias?: string
  condicoes_saude?: string
  contato_emergencia_nome?: string
  contato_emergencia_telefone?: string
  contato_emergencia_parentesco?: string
  observacoes?: string
  is_proprio?: boolean
  created: string
  updated: string
}

export interface ProfilePermissions {
  // Medicamentos
  medicamentos_ver: boolean
  medicamentos_editar: boolean
  // Médicos
  medicos_ver: boolean
  medicos_editar: boolean
  // Consultas
  consultas_ver: boolean
  consultas_editar: boolean
  // Exames
  exames_ver: boolean
  exames_editar: boolean
  // Documentos
  documentos_ver: boolean
  documentos_editar: boolean
  // Calendário
  calendario_ver: boolean
  // Cartão de Saúde
  cartao_ver: boolean
  // Notificações e Lembretes por E-mail
  notificacoes_ver?: boolean
}

export interface NotificationPreferences {
  id: string
  user: string
  enabled: boolean
  appointments_enabled: boolean
  exams_enabled: boolean
  days_advance: number
  notify_day_before: boolean
  notify_same_day: boolean
  family_opt_in: boolean
  created: string
  updated: string
}

export interface NotificationJob {
  id: string
  deduplication_key: string
  event_type: 'consulta' | 'exame'
  target_id: string
  trigger_timing: 'advance' | 'day_before' | 'same_day'
  scheduled_date: string
  recipient_email: string
  recipient_user?: string
  profile?: string
  status: 'sent' | 'failed' | 'skipped'
  subject?: string
  error_message?: string
  sent_at?: string
  created: string
  updated: string
}

export type GrantStatus = 'pending' | 'accepted' | 'revoked' | 'declined'

export interface ProfileAccessGrant {
  id: string
  profile: string
  expand?: {
    profile?: HealthProfile
    grantor?: User
    grantee_user?: User
  }
  grantor: string
  grantee_user?: string
  grantee_email: string
  grantee_nome?: string
  parentesco?: string
  status: GrantStatus
  invite_token?: string
  permissions: ProfilePermissions
  created: string
  updated: string
}

export type AccessAuditAction =
  | 'invite_created'
  | 'invite_accepted'
  | 'permissions_updated'
  | 'grant_revoked'
  | 'invite_declined'

export interface AccessAuditLog {
  id: string
  target_profile: string
  executor_user: string
  executor_name: string
  action: AccessAuditAction
  details?: string
  grantee_email?: string
  metadata?: any
  data_hora: string
  created: string
  updated: string
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
  profile?: string
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
  profile?: string
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
  profile?: string
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
  profile?: string
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
  profile?: string
  created: string
  updated: string
}

// ==================== ASSINATURAS, PLANOS E COBRANÇA PIX ====================

export type PlanoKey = 'essencial' | 'completo' | 'familia'
export type SubscriptionStatus = 'trial' | 'ativa' | 'pendente' | 'cancelada' | 'expirada'
export type PaymentStatus = 'aguardando' | 'confirmado' | 'recusado'

export interface PlanDefinition {
  id: PlanoKey
  nome: string
  preco: string
  valorMensal: number
  tagline: string
  badge?: string // "Recomendado" | "Compartilhado"
  badgeColor?: string
  recursos: string[]
  maxProfiles: number
  maxStorageMb: number
  monthlyOcrDocs: number
  isPopular?: boolean
}

export interface Subscription {
  id: string
  user: string
  plano: PlanoKey
  status: SubscriptionStatus
  data_inicio?: string
  data_fim?: string
  trial_ends_at?: string
  is_cortesia: boolean
  data_cortesia_ate?: string
  notas_admin?: string
  created: string
  updated: string
  expand?: {
    user?: User
  }
}

export interface Payment {
  id: string
  user: string
  plano: PlanoKey
  valor: number
  status: PaymentStatus
  referencia?: string
  comprovante?: string
  data_pagamento?: string
  data_confirmacao?: string
  confirmado_por?: string
  notas_recusa?: string
  created: string
  updated: string
  expand?: {
    user?: User
  }
}

export interface AppSetting {
  id: string
  key: string
  value: string
  description?: string
  created: string
  updated: string
}

export interface SubscriptionSummary {
  subscription: Subscription | null
  planConfig: {
    nome: string
    maxProfiles: number
    maxStorageBytes: number
    monthlyOcrLimit: number
  }
  subState: {
    active: boolean
    status: SubscriptionStatus
    isCortesia: boolean
    planKey: PlanoKey
  }
  usage: {
    profileCount: number
    maxProfiles: number
    docCount: number
    estimatedStorageUsedBytes: number
    maxStorageBytes: number
    ocrUsedThisMonth: number
    maxOcrMonthly: number
    daysRemaining: number
  }
  pixConfig: {
    key: string
    beneficiary: string
    configured: boolean
  }
}
