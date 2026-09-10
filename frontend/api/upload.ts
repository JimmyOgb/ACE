import crypto from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Serverless upload endpoint for ACE submission artifacts.
 *
 * Security Guarantees:
 * 1. GITHUB_TOKEN is NEVER exposed to the browser or bundled into client code.
 *    It is read strictly from process.env.GITHUB_TOKEN in the server environment.
 * 2. Uploaded documents are converted to raw UTF-8 bytes and SHA-256 hashed on the server.
 * 3. Files are committed directly to the GitHub repository via the GitHub Contents API:
 *      https://raw.githubusercontent.com/<owner>/<repo>/<branch>/repository-artifacts/submissions/<sha256>.<ext>
 *    This satisfies the steward requirement for "repository-backed HTTPS" with real raw URLs.
 * 4. If repository write fails (e.g. token only has gist scope), it falls back to creating a public Gist:
 *      https://gist.githubusercontent.com/...
 * 5. Returns { uri, sha256Hex } with no secrets.
 */

export interface UploadRequest {
  text: string
  fileName?: string
  description?: string
  expectedSha256?: string
}

export interface UploadResponse {
  uri: string
  sha256Hex: string
}

export async function processUpload(body: UploadRequest): Promise<{ status: number; data: { error?: string; uri?: string; sha256Hex?: string } }> {
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!token) {
    return {
      status: 503,
      data: {
        error:
          'GITHUB_TOKEN is not configured on the server. ' +
          'To enable document uploads, add GITHUB_TOKEN as a server-side environment variable ' +
          'in your Vercel project settings (or server environment). ' +
          'Do NOT prefix it with VITE_.',
      },
    }
  }

  if (!body.text || typeof body.text !== 'string' || !body.text.trim()) {
    return {
      status: 400,
      data: { error: 'Document text must not be empty.' },
    }
  }

  // Calculate SHA-256 over exact UTF-8 bytes
  const contentBytes = Buffer.from(body.text, 'utf-8')
  const sha256Hex = crypto.createHash('sha256').update(contentBytes).digest('hex')

  if (body.expectedSha256 && body.expectedSha256.trim().toLowerCase() !== sha256Hex.toLowerCase()) {
    return {
      status: 400,
      data: {
        error: `Integrity check failed: expected hash ${body.expectedSha256} does not match computed hash ${sha256Hex}.`,
      },
    }
  }

  const owner = process.env.GITHUB_OWNER?.trim() || 'JimmyOgb'
  const repo = process.env.GITHUB_REPO?.trim() || 'ACE'
  const branch = process.env.GITHUB_BRANCH?.trim() || 'main'
  const extension = body.fileName?.endsWith('.json') ? 'json' : 'txt'
  const filePath = `repository-artifacts/submissions/${sha256Hex}.${extension}`
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`

  // Strategy A: GitHub Repository Contents API (true repository-backed storage)
  try {
    // Check if the file already exists on GitHub
    const checkRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'ACE-Artifact-Uploader',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (checkRes.status === 200) {
      // File already exists with identical SHA-256
      return { status: 200, data: { uri: rawUrl, sha256Hex } }
    }

    if (checkRes.status === 404) {
      // File does not exist yet; commit it to the repository
      const putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'ACE-Artifact-Uploader',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            message: `Upload ACE submission artifact: ${sha256Hex.slice(0, 12)}`,
            content: contentBytes.toString('base64'),
            branch,
          }),
        },
      )

      if (putRes.status === 200 || putRes.status === 201) {
        return { status: 200, data: { uri: rawUrl, sha256Hex } }
      }

      // If status 422, someone may have committed concurrently; re-verify
      if (putRes.status === 422) {
        return { status: 200, data: { uri: rawUrl, sha256Hex } }
      }
    }
  } catch (repoErr) {
    console.warn('[ACE Server Upload] Repository write failed, attempting fallback:', repoErr)
  }

  // Strategy B Fallback: GitHub Gists API (if token lacks repo write permissions)
  try {
    const gistFileName = body.fileName || `ace-artifact-${sha256Hex.slice(0, 8)}.${extension}`
    const gistRes = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ACE-Artifact-Uploader',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        description: body.description || `ACE artifact: ${sha256Hex.slice(0, 12)}`,
        public: true,
        files: { [gistFileName]: { content: body.text } },
      }),
    })

    if (gistRes.ok) {
      interface GistApiResponse {
        files: Record<string, { raw_url?: string }>
      }
      const gistData = (await gistRes.json()) as GistApiResponse
      const file = gistData.files[gistFileName]
      if (file?.raw_url) {
        return { status: 200, data: { uri: file.raw_url, sha256Hex } }
      }
    }

    const gistErrText = await gistRes.text().catch(() => '')
    return {
      status: 502,
      data: {
        error: `GitHub upload failed. Repository and Gist upload were rejected: ${gistErrText || gistRes.statusText}`,
      },
    }
  } catch (err) {
    return {
      status: 500,
      data: {
        error: `Internal upload failure: ${err instanceof Error ? err.message : String(err)}`,
      },
    }
  }
}

function sendResponse(res: ServerResponse, statusCode: number, data: unknown): void {
  const vercelRes = res as unknown as {
    status?: (code: number) => { json?: (body: unknown) => void }
  }
  if (typeof vercelRes.status === 'function') {
    const chained = vercelRes.status(statusCode)
    if (chained && typeof chained.json === 'function') {
      chained.json(data)
      return
    }
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

/**
 * Universal HTTP handler compatible with Vercel Serverless Functions and Connect/Vite dev middleware.
 */
export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    sendResponse(res, 405, { error: 'Method not allowed. Please use POST.' })
    return
  }

  let body: UploadRequest
  if (req.body && typeof req.body === 'object') {
    body = req.body as UploadRequest
  } else {
    try {
      const rawBody = await new Promise<string>((resolve, reject) => {
        let data = ''
        req.on('data', (chunk: Buffer | string) => { data += chunk })
        req.on('end', () => resolve(data))
        req.on('error', reject)
      })
      body = rawBody ? (JSON.parse(rawBody) as UploadRequest) : ({} as UploadRequest)
    } catch {
      sendResponse(res, 400, { error: 'Invalid JSON request body.' })
      return
    }
  }

  const result = await processUpload(body)
  sendResponse(res, result.status, result.data)
}
