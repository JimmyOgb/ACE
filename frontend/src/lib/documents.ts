const PDF_TYPE = 'application/pdf'
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const TEXT_TYPES = new Set(['text/plain', 'text/markdown'])

export interface ExtractedDocument {
  bytes: ArrayBuffer
  fileName: string
  mimeType: string
  text: string
}

function normalizedText(value: string) {
  return value.replace(/\r\n/g, '\n').split(String.fromCharCode(0)).join('').trim()
}

async function extractPdf(bytes: ArrayBuffer) {
  const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return pages.join('\n\n')
}

export async function extractDocument(file: File): Promise<ExtractedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const bytes = await file.arrayBuffer()
  let text: string

  if (file.type === PDF_TYPE || extension === 'pdf') {
    text = await extractPdf(bytes)
  } else if (file.type === DOCX_TYPE || extension === 'docx') {
    const { default: mammoth } = await import('mammoth')
    const result = await mammoth.extractRawText({ arrayBuffer: bytes })
    text = result.value
  } else if (TEXT_TYPES.has(file.type) || extension === 'txt' || extension === 'md') {
    text = new TextDecoder().decode(bytes)
  } else {
    throw new Error('Unsupported document type. Upload a TXT, PDF, or DOCX file.')
  }

  const cleanText = normalizedText(text)
  if (!cleanText) throw new Error('No readable text could be extracted from this document.')
  return { bytes, fileName: file.name, mimeType: file.type || `application/${extension ?? 'octet-stream'}`, text: cleanText }
}

export function createPlainTextDocument(text: string): ExtractedDocument {
  const cleanText = normalizedText(text)
  if (!cleanText) throw new Error('Paste some document text before continuing.')
  return {
    bytes: new TextEncoder().encode(cleanText).buffer,
    fileName: 'pasted-document.txt',
    mimeType: 'text/plain',
    text: cleanText,
  }
}

export async function sha256Hex(value: ArrayBuffer | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
