import { AxiosError } from 'axios'

/**
 * Serviço centralizado para downloads de relatórios e arquivos
 * Garante:
 * - Tratamento correto de blobs
 * - Headers apropriados
 * - Tratamento de erros consistente
 */

export interface DownloadOptions {
  fileName?: string
  context?: string
  onProgress?: (progress: number) => void
}

export interface DownloadError {
  status?: number
  message: string
  context?: string
}

export const getErrorMessage = (error: unknown, defaultMessage: string): DownloadError => {
  if (error instanceof AxiosError) {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || defaultMessage

    if (status === 401) {
      return {
        status: 401,
        message: 'Sua sessão expirou. Faça login novamente.'
      }
    }

    if (status === 403) {
      return {
        status: 403,
        message: 'Você não tem permissão para acessar este recurso.'
      }
    }

    if (status === 404) {
      return {
        status: 404,
        message: 'Relatório não encontrado.'
      }
    }

    if (status === 409) {
      return {
        status: 409,
        message: 'Relatório ainda está em processamento. Aguarde alguns instantes e tente novamente.'
      }
    }

    if (status && status >= 500) {
      return {
        status,
        message: 'Erro no servidor ao gerar relatório. Tente novamente mais tarde.'
      }
    }

    return {
      status,
      message: typeof message === 'string' ? message : defaultMessage
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message || defaultMessage
    }
  }

  return {
    message: defaultMessage
  }
}

/**
 * Baixa um arquivo usando blob e simula um clique de download
 */
export const triggerFileDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Valida se o blob é válido e contém dados
 */
export const isValidBlob = (blob: Blob | undefined | null): blob is Blob => {
  return blob instanceof Blob && blob.size > 0
}

/**
 * Detecta tipo de erro comum em downloads
 */
export const classifyDownloadError = (error: DownloadError): 'auth' | 'permission' | 'notfound' | 'processing' | 'server' | 'unknown' => {
  if (error.status === 401) return 'auth'
  if (error.status === 403) return 'permission'
  if (error.status === 404) return 'notfound'
  if (error.status === 409) return 'processing'
  if (error.status && error.status >= 500) return 'server'
  return 'unknown'
}

/**
 * Normaliza nome de arquivo para download
 */
export const sanitizeFileName = (fileName: string, fallback: string = 'download'): string => {
  if (!fileName || typeof fileName !== 'string') return fallback

  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 255) || fallback
}

/**
 * Extrai nome do arquivo da header Content-Disposition
 */
export const extractFileName = (contentDisposition: string | null | undefined, fallback: string = 'download'): string => {
  if (!contentDisposition) return fallback

  const match = contentDisposition.match(/filename="?([^";\n]+)"?/i)
  return match ? match[1] : fallback
}

/**
 * Detecta tipo de arquivo do blob ou content-type
 */
export const detectFileType = (contentType: string | undefined, fileName: string): string => {
  if (contentType) {
    if (contentType.includes('pdf')) return '.pdf'
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '.xlsx'
    if (contentType.includes('csv')) return '.csv'
  }

  const ext = fileName?.split('.')?.pop()?.toLowerCase()
  if (ext && ['pdf', 'xlsx', 'csv', 'doc', 'docx'].includes(ext)) {
    return ext.startsWith('.') ? ext : `.${ext}`
  }

  return ''
}
