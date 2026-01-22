import { ref } from 'vue'
import {
  DownloadError,
  DownloadOptions,
  classifyDownloadError,
  detectFileType,
  extractFileName,
  getErrorMessage,
  isValidBlob,
  sanitizeFileName,
  triggerFileDownload
} from '../utils/download'

/**
 * Composable para gerenciar downloads de arquivos com tratamento de erro robusto
 */
export const useFileDownload = () => {
  const isDownloading = ref(false)
  const downloadProgress = ref(0)
  const lastError = ref<DownloadError | null>(null)

  const resetState = () => {
    isDownloading.value = false
    downloadProgress.value = 0
    lastError.value = null
  }

  /**
   * Executa o download de um arquivo blob
   */
  const downloadFile = (blob: Blob, fileName: string, options?: DownloadOptions) => {
    try {
      if (!isValidBlob(blob)) {
        throw new Error('Arquivo inválido ou vazio.')
      }

      const sanitized = sanitizeFileName(fileName, 'download')
      triggerFileDownload(blob, sanitized)

      resetState()
      return true
    } catch (error) {
      lastError.value = getErrorMessage(error, 'Falha ao fazer download do arquivo.')
      throw error
    }
  }

  /**
   * Baixa um arquivo a partir de um URL ou resposta Axios
   */
  const downloadFromResponse = (
    response: any,
    defaultFileName: string,
    options?: DownloadOptions
  ): boolean => {
    try {
      const contentType = response.headers?.['content-type']
      const contentDisposition = response.headers?.['content-disposition']

      // Extrair nome do arquivo do header ou usar padrão
      const fileName = extractFileName(contentDisposition, defaultFileName)

      // Criar blob
      const blob = new Blob([response.data], { type: contentType || 'application/octet-stream' })

      // Adicionar extensão se necessário
      const fileType = detectFileType(contentType, fileName)
      const finalFileName = fileName.endsWith(fileType) ? fileName : `${fileName}${fileType}`

      return downloadFile(blob, finalFileName, options)
    } catch (error) {
      lastError.value = getErrorMessage(error, 'Falha ao processar download.')
      throw error
    }
  }

  /**
   * Trata erro de download e retorna mensagem amigável
   */
  const handleDownloadError = (error: unknown, context: string = 'download'): DownloadError => {
    const errorInfo = getErrorMessage(error, `Falha ao executar ${context}.`)
    lastError.value = errorInfo
    return errorInfo
  }

  /**
   * Classifica tipo de erro para tratamento específico
   */
  const getErrorType = () => {
    return lastError.value ? classifyDownloadError(lastError.value) : 'unknown'
  }

  return {
    isDownloading,
    downloadProgress,
    lastError,
    downloadFile,
    downloadFromResponse,
    handleDownloadError,
    getErrorType,
    resetState
  }
}
