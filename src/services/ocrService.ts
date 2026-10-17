import pb from '@/lib/pocketbase/client'
import type { FormaFarmaceutica, TipoUsoMedicamento, TipoExame } from '@/types/health'

export interface OcrMedicoExtracted {
  nome?: string
  crm?: string
  especialidade?: string
}

export interface OcrMedicamentoExtracted {
  nome: string
  principio_ativo?: string
  dosagem?: string
  forma?: FormaFarmaceutica
  posologia?: string
  frequencia?: string
  tipo_uso?: TipoUsoMedicamento
  horarios?: string[]
}

export interface OcrExameExtracted {
  nome: string
  tipo?: TipoExame
  observacoes?: string
}

export interface OcrExtractedData {
  tipo_documento: 'receita' | 'pedido_exame' | 'laudo' | 'atestado' | 'outro'
  medico?: OcrMedicoExtracted | null
  data_documento?: string
  medicamentos?: OcrMedicamentoExtracted[]
  exames?: OcrExameExtracted[]
  texto_completo_extraido?: string
  confianca?: 'alta' | 'media' | 'baixa'
  observacoes_leitura?: string
}

export interface OcrProcessResult {
  success: boolean
  data: OcrExtractedData
  quota: {
    usedThisMonth: number
    maxMonthly: number
    remainingThisMonth: number
  }
}

/**
 * Converte um File (imagem ou pdf) em Data URL base64 para envio à IA
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

/**
 * Processa a imagem/PDF através do endpoint backend seguro de OCR
 */
export async function processDocumentOcr(file: File, profileId: string): Promise<OcrProcessResult> {
  const fileDataUrl = await fileToDataUrl(file)

  const payload = {
    profileId,
    fileDataUrl,
    fileName: file.name,
  }

  const res = await pb.send<OcrProcessResult>('/backend/v1/sevisaude/ocr/processar', {
    method: 'POST',
    body: payload,
  })

  return res
}
