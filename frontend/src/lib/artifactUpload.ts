/**
 * Client-side artifact upload dispatch for ACE.
 *
 * Security & Architecture:
 * - NO GitHub tokens, API keys, or secrets are accessed or exposed here.
 * - All authentication is strictly server-side (/api/upload).
 * - The browser sends the artifact text to the server-side route.
 * - The browser independently computes the SHA-256 hash of the exact UTF-8 bytes.
 * - The server returns { uri, sha256Hex }.
 * - The client verifies that returned sha256Hex matches its local computation
 *   before allowing the URI to be committed on-chain.
 */

export interface ArtifactUploadResult {
  /** Publicly retrievable HTTPS URL for the uploaded content. */
  uri: string
  /** Hex SHA-256 of the exact uploaded bytes (without "sha256:" prefix). */
  sha256Hex: string
}

/**
 * Uploads artifact text to the serverless upload endpoint (/api/upload).
 *
 * @param text The exact plain text content of the document or metadata.
 * @param fileName Suggested file name (e.g. "ace-artifact.txt").
 * @param description Brief description for audit logs.
 * @returns Object containing the public HTTPS URI and verified SHA-256 hex digest.
 */
export async function uploadArtifact(
  text: string,
  fileName: string,
  description: string,
): Promise<ArtifactUploadResult> {
  // Pre-calculate SHA-256 over exact UTF-8 bytes in browser
  const encoder = new TextEncoder()
  const contentBytes = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', contentBytes)
  const expectedSha256 = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('')

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      fileName,
      description,
      expectedSha256,
    }),
  })

  if (!response.ok) {
    let errorMessage = `Upload failed (${response.status})`
    try {
      const errorJson = (await response.json()) as { error?: string; message?: string }
      if (errorJson.error) errorMessage = errorJson.error
      else if (errorJson.message) errorMessage = errorJson.message
    } catch {
      const textError = await response.text().catch(() => '')
      if (textError) errorMessage = textError
    }
    throw new Error(errorMessage)
  }

  const result = (await response.json()) as ArtifactUploadResult
  if (!result.uri || !result.sha256Hex) {
    throw new Error('Upload endpoint returned an invalid response missing uri or sha256Hex.')
  }

  // Fail-closed client verification: verify the server's computed hash matches the browser's
  if (result.sha256Hex.trim().toLowerCase() !== expectedSha256.toLowerCase()) {
    throw new Error(
      `Hash verification failed: server returned SHA-256 ${result.sha256Hex} ` +
      `which does not match client-computed SHA-256 ${expectedSha256}.`,
    )
  }

  return {
    uri: result.uri,
    sha256Hex: result.sha256Hex.trim().toLowerCase(),
  }
}
