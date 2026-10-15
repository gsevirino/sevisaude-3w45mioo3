import pb from '@/lib/pocketbase/client'
import type {
  PlanDefinition,
  PlanoKey,
  Subscription,
  Payment,
  PaymentStatus,
  SubscriptionSummary,
  AppSetting,
} from '@/types/health'

export const PLANS_CONFIG: Record<PlanoKey, PlanDefinition> = {
  essencial: {
    id: 'essencial',
    nome: 'Sevi Essencial',
    preco: 'R$ 9,90/mês',
    valorMensal: 9.9,
    tagline: 'Para quem quer organizar a própria saúde.',
    recursos: [
      '1 perfil de saúde',
      'Cadastro de medicamentos e histórico de alterações',
      'Registro de consultas, exames e resultados',
      'Calendário e lembretes por e-mail',
      'Carteira de saúde para impressão',
      'Armazenamento e anexos básicos (100 MB)',
    ],
    maxProfiles: 1,
    maxStorageMb: 100,
    monthlyOcrDocs: 0,
  },
  completo: {
    id: 'completo',
    nome: 'Sevi Completo',
    preco: 'R$ 19,90/mês',
    valorMensal: 19.9,
    tagline: 'Para quem quer manter o histórico organizado e digitalizar documentos.',
    badge: 'Recomendado',
    badgeColor: 'bg-[#4C7A5A] text-white',
    isPopular: true,
    recursos: [
      'Tudo do Essencial',
      'Até 3 perfis de saúde',
      'Armazenamento ampliado de documentos (1 GB)',
      'Leitura de receitas e pedidos por OCR (10 processos/mês, com revisão obrigatória)',
      'Exportação do histórico em PDF',
      'Compartilhamento controlado com pessoas autorizadas',
    ],
    maxProfiles: 3,
    maxStorageMb: 1024,
    monthlyOcrDocs: 10,
  },
  familia: {
    id: 'familia',
    nome: 'Sevi Família',
    preco: 'R$ 34,90/mês',
    valorMensal: 34.9,
    tagline: 'Para quem organiza a própria saúde e ajuda a cuidar da família.',
    badge: 'Compartilhado',
    badgeColor: 'bg-[#26362B] text-white',
    recursos: [
      'Tudo do Completo',
      'Até 5 perfis de saúde, incluindo o titular',
      'Histórico separado para cada pessoa',
      'Convites e permissões individuais para familiares autorizados',
      'Calendário e acompanhamento das pendências da família',
      'Armazenamento compartilhado ampliado (2 GB)',
      'Cota de leitura de receitas por OCR (30 processos/mês)',
    ],
    maxProfiles: 5,
    maxStorageMb: 2048,
    monthlyOcrDocs: 30,
  },
}

export const ADMIN_EMAIL = 'gislaine.sevirino@gmail.com'

/**
 * Obtém o resumo consolidado da assinatura do usuário atual via endpoint backend
 */
export async function getMySubscriptionSummary(): Promise<SubscriptionSummary | null> {
  try {
    const res = await pb.send<SubscriptionSummary>('/backend/v1/sevisaude/my-subscription', {
      method: 'GET',
    })
    return res
  } catch (err) {
    console.warn('Erro ao obter resumo de assinatura via backend:', err)
    return null
  }
}

/**
 * Carrega o registro direto de subscription
 */
export async function getMySubscription(): Promise<Subscription | null> {
  const userId = pb.authStore.model?.id
  if (!userId) return null
  try {
    const sub = await pb
      .collection('subscriptions')
      .getFirstListItem<Subscription>(`user = "${userId}"`)
    return sub
  } catch {
    return null
  }
}

/**
 * Carrega pagamentos do usuário
 */
export async function getMyPayments(): Promise<Payment[]> {
  const userId = pb.authStore.model?.id
  if (!userId) return []
  try {
    return await pb.collection('payments').getFullList<Payment>({
      filter: `user = "${userId}"`,
      sort: '-created',
    })
  } catch {
    return []
  }
}

/**
 * Cria uma solicitação de pagamento PIX manual informada pelo usuário
 */
export async function createPaymentRequest(params: {
  plano: PlanoKey
  valor: number
  referencia?: string
  comprovanteFile?: File | null
}): Promise<Payment> {
  const userId = pb.authStore.model?.id
  if (!userId) throw new Error('Usuário não autenticado')

  const formData = new FormData()
  formData.append('user', userId)
  formData.append('plano', params.plano)
  formData.append('valor', String(params.valor))
  formData.append('status', 'aguardando')
  if (params.referencia) {
    formData.append('referencia', params.referencia.trim())
  }
  if (params.comprovanteFile) {
    formData.append('comprovante', params.comprovanteFile)
  }
  formData.append('data_pagamento', new Date().toISOString().split('T')[0])

  return pb.collection('payments').create<Payment>(formData)
}

/**
 * Obter a chave PIX das configurações do sistema
 */
export async function getPixSettings(): Promise<{ key: string; beneficiary: string }> {
  try {
    const settings = await pb.collection('app_settings').getFullList<AppSetting>()
    const pixKey = settings.find((s) => s.key === 'pix_key')?.value || ''
    const pixBeneficiary = settings.find((s) => s.key === 'pix_beneficiary_name')?.value || ''
    return { key: pixKey, beneficiary: pixBeneficiary }
  } catch {
    return { key: '', beneficiary: '' }
  }
}

// ==================== AÇÕES ADMINISTRATIVAS (EXCLUSIVAS DA DONA) ====================

/**
 * Carrega todos os pagamentos pendentes ou recentes para o painel de administração
 */
export async function getAdminPayments(statusFilter?: PaymentStatus): Promise<Payment[]> {
  const filter = statusFilter ? `status = "${statusFilter}"` : undefined
  return pb.collection('payments').getFullList<Payment>({
    filter,
    sort: '-created',
    expand: 'user',
  })
}

/**
 * Carrega todas as assinaturas cadastradas para o painel de administração
 */
export async function getAdminSubscriptions(): Promise<Subscription[]> {
  return pb.collection('subscriptions').getFullList<Subscription>({
    sort: '-created',
    expand: 'user',
  })
}

/**
 * Confirma ou recusa um pagamento PIX recebido
 */
export async function adminConfirmPayment(
  paymentId: string,
  action: 'confirm' | 'refuse',
  notasRecusa?: string,
): Promise<{ success: boolean; message: string }> {
  return pb.send<{ success: boolean; message: string }>(
    '/backend/v1/sevisaude/admin/confirm-payment',
    {
      method: 'POST',
      body: {
        paymentId,
        action,
        notasRecusa,
      },
    },
  )
}

/**
 * Concede ou altera cortesia para uma conta
 */
export async function adminSetCortesia(params: {
  userId: string
  plano: PlanoKey
  isCortesia: boolean
  dataCortesiaAte: string
  notas?: string
}): Promise<{ success: boolean; message: string }> {
  return pb.send<{ success: boolean; message: string }>(
    '/backend/v1/sevisaude/admin/set-cortesia',
    {
      method: 'POST',
      body: params,
    },
  )
}

/**
 * Atualiza a chave PIX administrativa
 */
export async function adminUpdatePixSettings(
  pixKey: string,
  pixBeneficiary: string,
): Promise<{ success: boolean; message: string }> {
  return pb.send<{ success: boolean; message: string }>(
    '/backend/v1/sevisaude/admin/update-pix-settings',
    {
      method: 'POST',
      body: {
        pixKey,
        pixBeneficiary,
      },
    },
  )
}
