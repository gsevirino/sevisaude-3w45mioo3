import pb from '@/lib/pocketbase/client'
import type {
  Medico,
  Medicamento,
  AlteracaoMedicamento,
  Consulta,
  Exame,
  Documento,
  StatusMedicamento,
  StatusExame,
} from '@/types/health'

export function getFileUrl(collectionNameOrId: string, recordId: string, filename: string): string {
  if (!filename) return ''
  return pb.files.getUrl({ collectionId: collectionNameOrId, id: recordId } as any, filename)
}

// ==================== MEDICOS ====================
export async function getMedicos(profileId?: string): Promise<Medico[]> {
  const filter = profileId ? `profile = "${profileId}"` : undefined
  return pb.collection('medicos').getFullList<Medico>({
    filter,
    sort: 'nome',
  })
}

export async function createMedico(
  data: Omit<Medico, 'id' | 'created' | 'updated' | 'userId'>,
  profileId?: string,
): Promise<Medico> {
  const userId = pb.authStore.model?.id
  return pb
    .collection('medicos')
    .create<Medico>({ ...data, userId, profile: profileId || data.profile })
}

export async function updateMedico(id: string, data: Partial<Medico>): Promise<Medico> {
  return pb.collection('medicos').update<Medico>(id, data)
}

export async function deleteMedico(id: string): Promise<boolean> {
  return pb.collection('medicos').delete(id)
}

// ==================== MEDICAMENTOS ====================
export async function getMedicamentos(profileId?: string): Promise<Medicamento[]> {
  const filter = profileId ? `profile = "${profileId}"` : undefined
  const records = await pb.collection('medicamentos').getFullList<Medicamento>({
    filter,
    sort: '-created',
    expand: 'medico',
  })
  return records.map(normalizeMedicamento)
}

function normalizeMedicamento(m: Medicamento): Medicamento {
  let horarios: any[] = []
  if (Array.isArray(m.horarios)) {
    horarios = m.horarios
  } else if (typeof m.horarios === 'string') {
    try {
      horarios = JSON.parse(m.horarios)
    } catch {
      horarios = []
    }
  }

  // Normalizar status legado caso algum registro antigo ainda venha como 'ativo' / 'encerrado'
  let status: StatusMedicamento = m.status
  if ((status as any) === 'ativo') status = 'em uso'
  if ((status as any) === 'encerrado') status = 'concluído'

  return { ...m, horarios, status }
}

export async function createMedicamento(
  data: FormData | Partial<Medicamento>,
  profileId?: string,
): Promise<Medicamento> {
  const userId = pb.authStore.model?.id
  let created: Medicamento

  if (data instanceof FormData) {
    if (userId && !data.has('userId')) {
      data.append('userId', userId)
    }
    if (profileId && !data.has('profile')) {
      data.append('profile', profileId)
    }
    created = await pb.collection('medicamentos').create<Medicamento>(data, { expand: 'medico' })
  } else {
    const payload = {
      ...data,
      horarios: Array.isArray(data.horarios) ? data.horarios : [],
      status: data.status || 'em uso',
      userId,
      profile: profileId || data.profile,
    }
    created = await pb.collection('medicamentos').create<Medicamento>(payload, { expand: 'medico' })
  }
  return normalizeMedicamento(created)
}

export interface AuditLogPayload {
  campo_alterado?: string
  valor_anterior?: string
  novo_valor?: string
  motivo: string
}

export async function updateMedicamento(
  id: string,
  data: FormData | Partial<Medicamento>,
  auditLog?: AuditLogPayload | string,
  profileId?: string,
): Promise<Medicamento> {
  let updated: Medicamento
  if (data instanceof FormData) {
    updated = await pb
      .collection('medicamentos')
      .update<Medicamento>(id, data, { expand: 'medico' })
  } else {
    updated = await pb
      .collection('medicamentos')
      .update<Medicamento>(id, data, { expand: 'medico' })
  }

  // Registrar auditoria imutável detalhada
  if (auditLog) {
    try {
      const userId = pb.authStore.model?.id
      const userName = pb.authStore.model?.name || pb.authStore.model?.email || 'Usuário'
      const nowIso = new Date().toISOString()
      const nowDate = nowIso.split('T')[0]
      const profId = profileId || updated.profile

      if (typeof auditLog === 'string') {
        if (auditLog.trim().length > 0) {
          await pb.collection('alteracoes_medicamentos').create({
            medicamento: id,
            motivo: auditLog.trim(),
            campo_alterado: 'Medicamento',
            usuario_responsavel: userName,
            data: nowDate,
            data_hora: nowIso,
            userId,
            profile: profId,
          })
        }
      } else if (auditLog.motivo && auditLog.motivo.trim().length > 0) {
        await pb.collection('alteracoes_medicamentos').create({
          medicamento: id,
          motivo: auditLog.motivo.trim(),
          campo_alterado: auditLog.campo_alterado || 'Posologia / Tratamento',
          valor_anterior: auditLog.valor_anterior || '',
          novo_valor: auditLog.novo_valor || '',
          usuario_responsavel: userName,
          data: nowDate,
          data_hora: nowIso,
          userId,
          profile: profId,
        })
      }
    } catch (e) {
      console.error('Erro ao salvar alteração de medicamento na auditoria', e)
    }
  }

  return normalizeMedicamento(updated)
}

export async function deleteMedicamento(id: string): Promise<boolean> {
  return pb.collection('medicamentos').delete(id)
}

export async function getAlteracoesMedicamento(
  medicamentoId: string,
): Promise<AlteracaoMedicamento[]> {
  return pb.collection('alteracoes_medicamentos').getFullList<AlteracaoMedicamento>({
    filter: `medicamento = "${medicamentoId}"`,
    sort: '-created',
  })
}

// ==================== CONSULTAS ====================
export async function getConsultas(profileId?: string): Promise<Consulta[]> {
  const filter = profileId ? `profile = "${profileId}"` : undefined
  const records = await pb.collection('consultas').getFullList<Consulta>({
    filter,
    sort: '-data',
    expand: 'medico',
  })
  return records.map(normalizeConsulta)
}

function normalizeConsulta(c: Consulta): Consulta {
  let anexos: string[] = []
  if (Array.isArray(c.anexos)) {
    anexos = c.anexos
  } else if (typeof c.anexos === 'string' && c.anexos) {
    try {
      anexos = JSON.parse(c.anexos)
    } catch {
      anexos = [c.anexos]
    }
  }

  let medsRel: string[] = []
  if (Array.isArray(c.medicamentos_relacionados_ids)) {
    medsRel = c.medicamentos_relacionados_ids
  } else if (typeof c.medicamentos_relacionados_ids === 'string') {
    try {
      medsRel = JSON.parse(c.medicamentos_relacionados_ids)
    } catch {
      medsRel = []
    }
  }

  let examesRel: string[] = []
  if (Array.isArray(c.exames_relacionados_ids)) {
    examesRel = c.exames_relacionados_ids
  } else if (typeof c.exames_relacionados_ids === 'string') {
    try {
      examesRel = JSON.parse(c.exames_relacionados_ids)
    } catch {
      examesRel = []
    }
  }

  return {
    ...c,
    anexos,
    medicamentos_relacionados_ids: medsRel,
    exames_relacionados_ids: examesRel,
  }
}

export async function createConsulta(
  data: FormData | Partial<Consulta>,
  profileId?: string,
): Promise<Consulta> {
  const userId = pb.authStore.model?.id
  let created: Consulta
  if (data instanceof FormData) {
    if (userId && !data.has('userId')) {
      data.append('userId', userId)
    }
    if (profileId && !data.has('profile')) {
      data.append('profile', profileId)
    }
    created = await pb.collection('consultas').create<Consulta>(data, { expand: 'medico' })
  } else {
    created = await pb
      .collection('consultas')
      .create<Consulta>(
        { ...data, userId, profile: profileId || data.profile },
        { expand: 'medico' },
      )
  }
  return normalizeConsulta(created)
}

export async function updateConsulta(
  id: string,
  data: FormData | Partial<Consulta>,
): Promise<Consulta> {
  let updated: Consulta
  if (data instanceof FormData) {
    updated = await pb.collection('consultas').update<Consulta>(id, data, { expand: 'medico' })
  } else {
    updated = await pb.collection('consultas').update<Consulta>(id, data, { expand: 'medico' })
  }
  return normalizeConsulta(updated)
}

export async function deleteConsulta(id: string): Promise<boolean> {
  return pb.collection('consultas').delete(id)
}

// ==================== EXAMES ====================
export async function getExames(profileId?: string): Promise<Exame[]> {
  const filter = profileId ? `profile = "${profileId}"` : undefined
  const records = await pb.collection('exames').getFullList<Exame>({
    filter,
    sort: '-data_solicitado',
    expand: 'medico,consulta_relacionada',
  })
  return records.map(normalizeExame)
}

function normalizeExame(e: Exame): Exame {
  let historico: any[] = []
  if (Array.isArray(e.historico_status)) {
    historico = e.historico_status
  } else if (typeof e.historico_status === 'string') {
    try {
      historico = JSON.parse(e.historico_status)
    } catch {
      historico = []
    }
  }

  // Normalizar status legado caso algum registro venha com Solicitado / Em análise / Concluído
  let status: StatusExame = e.status
  if ((status as any) === 'Solicitado') status = 'Pendente'
  if ((status as any) === 'Em análise') status = 'Realizado'
  if ((status as any) === 'Concluído') status = 'Finalizado'

  let pedidosArquivos: string[] = []
  if (Array.isArray(e.pedidos_arquivos)) pedidosArquivos = e.pedidos_arquivos
  else if (e.pedido_arquivo) pedidosArquivos = [e.pedido_arquivo]

  let resultadosArquivos: string[] = []
  if (Array.isArray(e.resultados_arquivos)) resultadosArquivos = e.resultados_arquivos
  else if (e.resultado_arquivo) resultadosArquivos = [e.resultado_arquivo]

  return {
    ...e,
    status,
    pedidos_arquivos: pedidosArquivos,
    resultados_arquivos: resultadosArquivos,
    historico_status: historico,
  }
}

export async function createExame(
  formDataOrObj: FormData | Partial<Exame>,
  profileId?: string,
): Promise<Exame> {
  const userId = pb.authStore.model?.id
  let created: Exame
  if (formDataOrObj instanceof FormData) {
    if (userId && !formDataOrObj.has('userId')) {
      formDataOrObj.append('userId', userId)
    }
    if (profileId && !formDataOrObj.has('profile')) {
      formDataOrObj.append('profile', profileId)
    }
    created = await pb.collection('exames').create<Exame>(formDataOrObj, {
      expand: 'medico,consulta_relacionada',
    })
  } else {
    created = await pb
      .collection('exames')
      .create<Exame>(
        { ...formDataOrObj, userId, profile: profileId || formDataOrObj.profile },
        { expand: 'medico,consulta_relacionada' },
      )
  }
  return normalizeExame(created)
}

export async function updateExame(
  id: string,
  formDataOrObj: FormData | Partial<Exame>,
): Promise<Exame> {
  const updated = await pb.collection('exames').update<Exame>(id, formDataOrObj as any, {
    expand: 'medico,consulta_relacionada',
  })
  return normalizeExame(updated)
}

export async function deleteExame(id: string): Promise<boolean> {
  return pb.collection('exames').delete(id)
}

// ==================== DOCUMENTOS ====================
export async function getDocumentos(profileId?: string): Promise<Documento[]> {
  const filter = profileId ? `profile = "${profileId}"` : undefined
  return pb.collection('documentos').getFullList<Documento>({
    filter,
    sort: '-created',
    expand: 'exame_ref',
  })
}

export async function createDocumento(formData: FormData, profileId?: string): Promise<Documento> {
  const userId = pb.authStore.model?.id
  if (userId && !formData.has('userId')) {
    formData.append('userId', userId)
  }
  if (profileId && !formData.has('profile')) {
    formData.append('profile', profileId)
  }
  return pb.collection('documentos').create<Documento>(formData, { expand: 'exame_ref' })
}

export async function deleteDocumento(id: string): Promise<boolean> {
  return pb.collection('documentos').delete(id)
}
