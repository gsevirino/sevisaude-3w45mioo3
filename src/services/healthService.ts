import pb from '@/lib/pocketbase/client'
import type {
  Medico,
  Medicamento,
  AlteracaoMedicamento,
  Consulta,
  Exame,
  Documento,
} from '@/types/health'

export function getFileUrl(collectionNameOrId: string, recordId: string, filename: string): string {
  if (!filename) return ''
  return pb.files.getUrl({ collectionId: collectionNameOrId, id: recordId } as any, filename)
}

// ==================== MEDICOS ====================
export async function getMedicos(): Promise<Medico[]> {
  return pb.collection('medicos').getFullList<Medico>({
    sort: 'nome',
  })
}

export async function createMedico(
  data: Omit<Medico, 'id' | 'created' | 'updated' | 'userId'>,
): Promise<Medico> {
  const userId = pb.authStore.model?.id
  return pb.collection('medicos').create<Medico>({ ...data, userId })
}

export async function updateMedico(id: string, data: Partial<Medico>): Promise<Medico> {
  return pb.collection('medicos').update<Medico>(id, data)
}

export async function deleteMedico(id: string): Promise<boolean> {
  return pb.collection('medicos').delete(id)
}

// ==================== MEDICAMENTOS ====================
export async function getMedicamentos(): Promise<Medicamento[]> {
  const records = await pb.collection('medicamentos').getFullList<Medicamento>({
    sort: '-created',
    expand: 'medico',
  })
  return records.map(normalizeMedicamento)
}

function normalizeMedicamento(m: Medicamento): Medicamento {
  let horarios: string[] = []
  if (Array.isArray(m.horarios)) {
    horarios = m.horarios
  } else if (typeof m.horarios === 'string') {
    try {
      horarios = JSON.parse(m.horarios)
    } catch {
      horarios = []
    }
  }
  return { ...m, horarios }
}

export async function createMedicamento(
  data: Omit<Medicamento, 'id' | 'created' | 'updated' | 'userId'>,
): Promise<Medicamento> {
  const userId = pb.authStore.model?.id
  const payload = {
    ...data,
    horarios: Array.isArray(data.horarios) ? data.horarios : [],
    userId,
  }
  const created = await pb
    .collection('medicamentos')
    .create<Medicamento>(payload, { expand: 'medico' })
  return normalizeMedicamento(created)
}

export async function updateMedicamento(
  id: string,
  data: Partial<Medicamento>,
  motivoAlteracao?: string,
): Promise<Medicamento> {
  const payload = { ...data }
  if (payload.horarios && Array.isArray(payload.horarios)) {
    // keep array for pb json field
  }
  const updated = await pb
    .collection('medicamentos')
    .update<Medicamento>(id, payload, { expand: 'medico' })

  if (motivoAlteracao && motivoAlteracao.trim().length > 0) {
    try {
      await pb.collection('alteracoes_medicamentos').create({
        medicamento: id,
        motivo: motivoAlteracao.trim(),
        data: new Date().toISOString().split('T')[0],
      })
    } catch (e) {
      console.error('Erro ao salvar alteração de medicamento', e)
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
export async function getConsultas(): Promise<Consulta[]> {
  return pb.collection('consultas').getFullList<Consulta>({
    sort: '-data',
    expand: 'medico',
  })
}

export async function createConsulta(
  data: Omit<Consulta, 'id' | 'created' | 'updated' | 'userId'>,
): Promise<Consulta> {
  const userId = pb.authStore.model?.id
  return pb.collection('consultas').create<Consulta>({ ...data, userId }, { expand: 'medico' })
}

export async function updateConsulta(id: string, data: Partial<Consulta>): Promise<Consulta> {
  return pb.collection('consultas').update<Consulta>(id, data, { expand: 'medico' })
}

export async function deleteConsulta(id: string): Promise<boolean> {
  return pb.collection('consultas').delete(id)
}

// ==================== EXAMES ====================
export async function getExames(): Promise<Exame[]> {
  return pb.collection('exames').getFullList<Exame>({
    sort: '-data_solicitado',
    expand: 'medico',
  })
}

export async function createExame(formData: FormData): Promise<Exame> {
  const userId = pb.authStore.model?.id
  if (userId && !formData.has('userId')) {
    formData.append('userId', userId)
  }
  return pb.collection('exames').create<Exame>(formData, { expand: 'medico' })
}

export async function updateExame(
  id: string,
  formDataOrObj: FormData | Partial<Exame>,
): Promise<Exame> {
  return pb.collection('exames').update<Exame>(id, formDataOrObj as any, { expand: 'medico' })
}

export async function deleteExame(id: string): Promise<boolean> {
  return pb.collection('exames').delete(id)
}

// ==================== DOCUMENTOS ====================
export async function getDocumentos(): Promise<Documento[]> {
  return pb.collection('documentos').getFullList<Documento>({
    sort: '-created',
    expand: 'exame_ref',
  })
}

export async function createDocumento(formData: FormData): Promise<Documento> {
  const userId = pb.authStore.model?.id
  if (userId && !formData.has('userId')) {
    formData.append('userId', userId)
  }
  return pb.collection('documentos').create<Documento>(formData, { expand: 'exame_ref' })
}

export async function deleteDocumento(id: string): Promise<boolean> {
  return pb.collection('documentos').delete(id)
}
