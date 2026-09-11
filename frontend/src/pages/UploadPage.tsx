import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ErrorState } from '../components/PageState'
import { useEvaluationProfiles, useLatestProfile, useRubrics, useSubmissions, useSubmitForEvaluation } from '../hooks/useAceQueries'
import { createPlainTextDocument, extractDocument, sha256Hex, type ExtractedDocument } from '../lib/documents'
import { loadSavedEvaluationProfileIds } from '../lib/evaluationProfiles'
import { shortId } from '../lib/format'
import { uploadArtifact } from '../lib/artifactUpload'
import { saveUploadIntent } from '../lib/uploadIntent'
import { useAce } from '../providers/AceContext'

type InputMode = 'paste' | 'upload'

interface ValidationErrors {
  document?: string
  profile?: string
  rubric?: string
  title?: string
}

export function UploadPage() {
  const navigate = useNavigate()
  const { account, connectWallet, isConnecting } = useAce()
  const [mode, setMode] = useState<InputMode>('upload')
  const [title, setTitle] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [document, setDocument] = useState<ExtractedDocument | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [profileIds] = useState(() => loadSavedEvaluationProfileIds())
  const [profileId, setProfileId] = useState('')
  const [rubricId, setRubricId] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const rubrics = useRubrics()
  const submissions = useSubmissions()
  const latestProfile = useLatestProfile(account)
  const profileQueries = useEvaluationProfiles(profileIds)
  const submit = useSubmitForEvaluation()

  const validRubrics = useMemo(() => {
    return (rubrics.data ?? []).filter((r) => Boolean(r.description_uri && r.description_uri.startsWith('https://')))
  }, [rubrics.data])

  const selectedRubric = (rubrics.data ?? []).find((rubric) => rubric.rubric_id === rubricId)
  const previewText = mode === 'paste' ? pastedText.trim() : document?.text ?? ''

  const loadedProfiles = useMemo(() => {
    const list = profileQueries.flatMap((query) => query.data ? [query.data] : [])
    if (latestProfile.data && !list.some((p) => p.profile_id === latestProfile.data!.profile_id)) {
      list.unshift(latestProfile.data)
    }
    return list
  }, [profileQueries, latestProfile.data])

  const profilesLoading = latestProfile.isPending || profileQueries.some((query) => query.isPending)
  const profileLoadErrors = profileQueries.filter((query) => query.isError)

  useEffect(() => {
    if (!profileId) {
      if (latestProfile.data) {
        setProfileId(latestProfile.data.profile_id)
      } else if (loadedProfiles.length > 0) {
        setProfileId(loadedProfiles[0].profile_id)
      }
    }
  }, [profileId, latestProfile.data, loadedProfiles])

  useEffect(() => {
    if (!rubricId && validRubrics.length > 0) {
      setRubricId(validRubrics[0].rubric_id)
    }
  }, [rubricId, validRubrics])

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setDocument(null)
    setDocumentError(null)
    if (file.size > 20 * 1024 * 1024) {
      setDocumentError('The document must be 20 MB or smaller.')
      return
    }
    setIsExtracting(true)
    try {
      const extracted = await extractDocument(file)
      setDocument(extracted)
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ''))
      setErrors((current) => ({ ...current, document: undefined }))
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : 'The document could not be read.')
    } finally {
      setIsExtracting(false)
    }
  }

  function validate() {
    const next: ValidationErrors = {}
    if (!title.trim()) next.title = 'Enter a title.'
    if (!previewText) next.document = 'Upload a document or paste its text.'
    if (!profileId) next.profile = 'Select an evaluation profile.'
    if (!rubricId) next.rubric = 'Select a rubric.'
    if (selectedRubric && (!selectedRubric.description_uri || !selectedRubric.description_uri.startsWith('https://'))) {
      next.rubric = 'Selected rubric must use a verified public HTTPS criteria URI.'
    }
    if (profileId && !loadedProfiles.some((profile) => profile.profile_id === profileId)) {
      next.profile = 'Wait for the selected profile to load successfully.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTransactionHash(null)
    setUploadError(null)
    if (!validate()) return

    setIsUploading(true)
    try {
      const source = mode === 'paste' ? createPlainTextDocument(pastedText) : document!
      const trimmedTitle = title.trim()

      // Upload extracted artifact text via serverless endpoint (/api/upload).
      // The server commits the exact UTF-8 bytes to the repository via GitHub Contents API
      // and returns a real repository-backed HTTPS URL (raw.githubusercontent.com).
      // Both client and server verify the exact SHA-256 hash before on-chain commitment.
      const artifactFileName = `ace-artifact-${Date.now()}.txt`
      const [artifactUpload, textDigest] = await Promise.all([
        uploadArtifact(
          source.text,
          artifactFileName,
          `ACE artifact: ${trimmedTitle}`,
        ),
        sha256Hex(source.text),
      ])

      const metadata = JSON.stringify({
        file_name: source.fileName,
        mime_type: source.mimeType,
        text_length: source.text.length,
        evaluation_profile_id: profileId,
        artifact_uri: artifactUpload.uri,
      })
      // Upload metadata JSON via serverless endpoint to get a real HTTPS URI.
      const metadataFileName = `ace-metadata-${Date.now()}.json`
      const metadataUpload = await uploadArtifact(
        metadata,
        metadataFileName,
        `ACE metadata: ${trimmedTitle}`,
      )

      const hash = await submit.mutateAsync({
        title: trimmedTitle,
        abstract_commitment: `sha256:${textDigest}`,
        // Real HTTPS raw repository URL — retrievable by gl.nondet.web.get()
        artifact_uri: artifactUpload.uri,
        artifact_hash: `sha256:${artifactUpload.sha256Hex}`,
        rubric_id: rubricId,
        evaluation_type: selectedRubric?.evaluation_type ?? 'academic_review',
        // Real HTTPS raw repository URL for metadata
        metadata_uri: metadataUpload.uri,
        metadata_hash: `sha256:${metadataUpload.sha256Hex}`,
      })

      saveUploadIntent({
        artifactHash: `sha256:${artifactUpload.sha256Hex}`,
        createdAt: new Date().toISOString(),
        existingSubmissionIds: submissions.data?.map((item) => item.submission_id) ?? [],
        profileId,
        title: trimmedTitle,
        transactionHash: hash,
      })
      setTransactionHash(hash)
      window.setTimeout(() => navigate(`/submissions/progress/${encodeURIComponent(hash)}`), 900)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Submission failed.')
    } finally {
      setIsUploading(false)
    }
  }


  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand">New evaluation</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Upload academic work</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Extract text locally, review it, then register immutable commitments through the ACE SDK.</p>
      </div>

      {transactionHash && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Transaction submitted. Opening progress…</p>
          <p className="mt-1 break-all font-mono text-xs">{transactionHash}</p>
        </div>
      )}
      {uploadError && <ErrorState error={new Error(uploadError)} />}
      {submit.isError && <ErrorState error={submit.error} />}

      <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <section className="card p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-brand">Step 1</p><h2 className="mt-1 text-lg font-semibold">Add your document</h2></div><span className="text-xs text-muted">TXT, PDF or DOCX · 20 MB max</span></div>
          <div className="mt-5 inline-flex rounded-xl bg-paper p-1">
            {(['upload', 'paste'] as const).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setErrors((current) => ({ ...current, document: undefined })) }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === item ? 'bg-white text-brand shadow-sm' : 'text-muted'}`}>{item === 'upload' ? 'Upload file' : 'Paste text'}</button>)}
          </div>
          {mode === 'upload' ? (
            <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper/60 px-5 text-center transition hover:border-brand/40 hover:bg-brand-soft/30">
              <span className="font-semibold">{isExtracting ? 'Extracting document text…' : document ? document.fileName : 'Choose a document'}</span>
              <span className="mt-1 text-xs text-muted">Text is extracted in your browser and is not uploaded to a third party.</span>
              <input className="sr-only" type="file" accept=".txt,.md,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => void handleFile(event)} disabled={isExtracting} />
            </label>
          ) : (
            <textarea className="field mt-5 min-h-52 resize-y" value={pastedText} onChange={(event) => { setPastedText(event.target.value); setErrors((current) => ({ ...current, document: undefined })) }} placeholder="Paste the full document text here…" />
          )}
          {(documentError || errors.document) && <p className="mt-2 text-sm text-red-600">{documentError ?? errors.document}</p>}
        </section>

        <section className="card p-5 sm:p-7">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-brand">Step 2</p><h2 className="mt-1 text-lg font-semibold">Review extracted text</h2></div>
          <div className="mt-5 max-h-80 min-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-paper p-4 text-sm leading-6 text-ink">
            {isExtracting ? 'Extracting text…' : previewText || 'Your extracted text preview will appear here.'}
          </div>
          {previewText && <p className="mt-2 text-right text-xs text-muted">{previewText.length.toLocaleString()} characters</p>}
        </section>

        <section className="card p-5 sm:p-7">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-brand">Step 3</p><h2 className="mt-1 text-lg font-semibold">Evaluation settings</h2></div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="label">Submission title</span><input className="field" value={title} onChange={(event) => { setTitle(event.target.value); setErrors((current) => ({ ...current, title: undefined })) }} placeholder="Research paper or project title" />{errors.title && <span className="mt-1 block text-xs text-red-600">{errors.title}</span>}</label>
            <div>
              <label><span className="label">Evaluation profile</span><select className="field" value={profileId} onChange={(event) => { setProfileId(event.target.value); setErrors((current) => ({ ...current, profile: undefined })) }} disabled={profilesLoading && loadedProfiles.length === 0}><option value="">{profilesLoading ? 'Loading profiles…' : 'Select a profile'}</option>{loadedProfiles.map((profile) => <option key={profile.profile_id} value={profile.profile_id}>{profile.display_name} · {shortId(profile.profile_id, 5)}</option>)}</select></label>
              {profileIds.length === 0 && !latestProfile.data && loadedProfiles.length === 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">No evaluation profile found.</p>
                  <p className="mt-1 text-xs text-amber-700">
                    You need a profile before submitting.{' '}
                    <Link className="font-semibold underline hover:text-amber-900" to="/setup">
                      Create Profile →
                    </Link>
                  </p>
                </div>
              )}

              {errors.profile && <span className="mt-1 block text-xs text-red-600">{errors.profile}</span>}
              {profileLoadErrors.length > 0 && <span className="mt-1 block text-xs text-amber-700">One or more profile IDs could not be loaded.</span>}
            </div>
            <label><span className="label">Rubric</span><select className="field" value={rubricId} onChange={(event) => { setRubricId(event.target.value); setErrors((current) => ({ ...current, rubric: undefined })) }} disabled={rubrics.isPending}><option value="">{rubrics.isPending ? 'Loading rubrics…' : validRubrics.length === 0 ? 'No HTTPS rubric found' : 'Select a rubric'}</option>{validRubrics.map((rubric) => <option key={rubric.rubric_id} value={rubric.rubric_id}>{rubric.name} · {shortId(rubric.rubric_id, 5)}</option>)}</select>{errors.rubric && <span className="mt-1 block text-xs text-red-600">{errors.rubric}</span>}{rubrics.isError && <span className="mt-1 block text-xs text-red-600">Rubrics could not be loaded.</span>}</label>
          </div>
        </section>

        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold">Ready to submit?</p><p className="mt-1 text-xs leading-5 text-muted">The selected profile is retained for the evaluation stage after registration.</p></div>
          {account ? <button className="button-primary min-w-40" disabled={submit.isPending || isUploading || isExtracting || Boolean(transactionHash)}>{isUploading ? 'Uploading artifact…' : submit.isPending ? 'Submitting…' : transactionHash ? 'Redirecting…' : 'Submit document'}</button> : <button type="button" className="button-primary min-w-40" onClick={() => void connectWallet()} disabled={isConnecting}>{isConnecting ? 'Connecting…' : 'Connect wallet'}</button>}
        </div>
      </form>
    </div>
  )
}
