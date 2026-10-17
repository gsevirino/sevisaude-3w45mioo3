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
 * Redimensiona e comprime uma imagem no navegador antes do envio via OCR
 * Mantém resolução otimizada para leitura (largura/altura máxima de 1800px) e qualidade JPEG 0.85
 * Isso reduz arquivos pesados de 5-10MB tirados por câmeras modernas para 300KB-800KB,
 * evitando rejeição por tamanho no gateway de IA e acelerando drasticamente o upload.
 */
export async function optimizeImageForOcr(file: File): Promise<string> {
  // Se for PDF, não redimensiona no canvas — retorna Data URL direto
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return fileToDataUrl(file)
  }

  // Se não for imagem suportada, retorna direto
  if (!file.type.startsWith('image/')) {
    return fileToDataUrl(file)
  }

  return new Promise((resolve, reject) => {
    const rawUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(rawUrl)
      try {
        const MAX_DIMENSION = 1800
        let width = img.width
        let height = img.height

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width)
            width = MAX_DIMENSION
          } else {
            width = Math.round((width * MAX_DIMENSION) / height)
            height = MAX_DIMENSION
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          // Fallback para conversão direta
          fileToDataUrl(file).then(resolve).catch(reject)
          return
        }

        // Fundo branco caso haja transparência (PNG/WebP)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve(optimizedDataUrl)
      } catch (err) {
        // Fallback em caso de erro no canvas
        fileToDataUrl(file).then(resolve).catch(reject)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(rawUrl)
      fileToDataUrl(file).then(resolve).catch(reject)
    }
    img.src = rawUrl
  })
}

/**
 * Processa a imagem/PDF através do endpoint backend seguro de OCR
 */
export async function processDocumentOcr(file: File, profileId: string): Promise<OcrProcessResult> {
  const fileDataUrl = await optimizeImageForOcr(file)

  const payload = {
    profileId,
    fileDataUrl,
    fileName: file.name,
  }

  try {
    const res = await pb.send<OcrProcessResult>('/backend/v1/sevisaude/ocr/processar', {
      method: 'POST',
      body: payload,
    })
    return res
  } catch (err: any) {
    // Tratar mensagens de erro amigáveis para o usuário em português
    const backendMsg = err?.data?.error || err?.response?.error || err?.message || ''
    if (backendMsg.includes('limite mensal') || err?.status === 429) {
      throw new Error(
        backendMsg ||
          'Você atingiu o limite mensal de documentos lidos via OCR do seu plano. Faça upgrade para o Sevi Família ou aguarde a renovação.',
      )
    }
    if (
      backendMsg.includes('plano') &&
      (backendMsg.includes('disponível') || err?.status === 403)
    ) {
      throw new Error(backendMsg)
    }
    if (err?.status === 502 || backendMsg.includes('inteligência artificial')) {
      throw new Error(
        'O serviço de inteligência artificial não conseguiu ler a imagem neste momento. Sua cota NÃO foi consumida. Tente reenviar ou use uma foto mais nítida e bem iluminada.',
      )
    }
    throw new Error(
      backendMsg || 'Falha ao processar o documento com OCR. Sua cota NÃO foi consumida.',
    )
  }
}
