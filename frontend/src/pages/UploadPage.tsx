import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { ErrorState } from '../components/PageState'
import { useEvaluationProfiles, useRubrics, useSubmissions, useSubmitForEvaluation } from '../hooks/useAceQueries'
import { createPlainTextDocument, extractDocument, sha256Hex, type ExtractedDocument } from '../lib/documents'
import { shortId } from '../lib/format'
import { saveUploadIntent } from '../lib/uploadIntent'
import { useAce } from '../providers/AceContext'

type InputMode = 'paste' | 'upload'

interface ValidationErrors {
  document?: string
  profile?: string
  rubric?: string
  title?: string
}

const configuredProfileIds = (import.meta.env.VITE_ACE_EVALUATION_PROFILE_IDS as string | undefined)
  ?.split(',')
  .map((id) => id.trim())
  .filter(Boolean) ?? []

export function UploadPage() {
  const navigate = useNavigate()
  const { account, connectWallet, isConnecting } = useAce()
  const [mode, setMode] = useState<InputMode>('upload')
  const [title, setTitle] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [document, setDocument] = useState<ExtractedDocument | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [profileIds, setProfileIds] = useState(configuredProfileIds)
  const [profileInput, setProfileInput] = useState('')
  const [profileId, setProfileId] = useState('')
  const [rubricId, setRubricId] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  const rubrics = useRubrics()
  const submissions = useSubmissions()
  const profileQueries = useEvaluationProfiles(profileIds)
  const submit = useSubmitForEvaluation()
  const selectedRubric = rubrics.data?.find((rubric) => rubric.rubric_id === rubricId)
  const previewText = mode === 'paste' ? pastedText.trim() : document?.text ?? ''

  const loadedProfiles = useMemo(
    () => profileQueries.flatMap((query) => query.data ? [query.data] : []),
    [profileQueries],
  )
  const profilesLoading = profileQueries.some((query) => query.isPending)
  const profileLoadErrors = profileQueries.filter((query) => query.isError)

  function addProfileId() {
    const value = profileInput.trim()
    if (!value) return
    setProfileIds((current) => current.includes(value) ? current : [...current, value])
    setProfileId(value)
    setProfileInput('')
  }

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
    if (profileId && !loadedProfiles.some((profile) => profile.profile_id === profileId)) {
      next.profile = 'Wait for the selected profile to load successfully.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTransactionHash(null)
    if (!validate()) return

    try {
      const source = mode === 'paste' ? createPlainTextDocument(pastedText) : document!
      const [artifactDigest, textDigest] = await Promise.all([
        sha256Hex(source.bytes),
        sha256Hex(source.text),
      ])
      const metadata = JSON.stringify({
        file_name: source.fileName,
        mime_type: source.mimeType,
        text_length: source.text.length,
        evaluation_profile_id: profileId,
      })
      const metadataDigest = await sha256Hex(metadata)
      const hash = await submit.mutateAsync({
        title: title.trim(),
        abstract_commitment: `sha256:${textDigest}`,
        artifact_uri: `urn:sha256:${artifactDigest}`,
        artifact_hash: `sha256:${artifactDigest}`,
        rubric_id: rubricId,
        evaluation_type: selectedRubric?.evaluation_type ?? 'academic_review',
        metadata_uri: `data:application/json,${encodeURIComponent(metadata)}`,
        metadata_hash: `sha256:${metadataDigest}`,
      })

      saveUploadIntent({
        artifactHash: `sha256:${artifactDigest}`,
        createdAt: new Date().toISOString(),
        existingSubmissionIds: submissions.data?.map((item) => item.submission_id) ?? [],
        profileId,
        title: title.trim(),
        transactionHash: hash,
      })
      setTransactionHash(hash)
      window.setTimeout(() => navigate(`/submissions/progress/${encodeURIComponent(hash)}`), 900)
    } catch {
      // TanStack Query and the extraction panels render the actionable error.
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
              <div className="mt-2 flex gap-2"><input className="field mt-0 min-w-0 font-mono" value={profileInput} onChange={(event) => setProfileInput(event.target.value)} placeholder="Load profile by ID" /><button className="button-secondary shrink-0" type="button" onClick={addProfileId}>Load</button></div>
              {errors.profile && <span className="mt-1 block text-xs text-red-600">{errors.profile}</span>}
              {profileLoadErrors.length > 0 && <span className="mt-1 block text-xs text-amber-700">One or more profile IDs could not be loaded.</span>}
            </div>
            <label><span className="label">Rubric</span><select className="field" value={rubricId} onChange={(event) => { setRubricId(event.target.value); setErrors((current) => ({ ...current, rubric: undefined })) }} disabled={rubrics.isPending}><option value="">{rubrics.isPending ? 'Loading rubrics…' : 'Select a rubric'}</option>{rubrics.data?.map((rubric) => <option key={rubric.rubric_id} value={rubric.rubric_id}>{rubric.name} · {shortId(rubric.rubric_id, 5)}</option>)}</select>{errors.rubric && <span className="mt-1 block text-xs text-red-600">{errors.rubric}</span>}{rubrics.isError && <span className="mt-1 block text-xs text-red-600">Rubrics could not be loaded.</span>}</label>
          </div>
        </section>

        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold">Ready to submit?</p><p className="mt-1 text-xs leading-5 text-muted">The selected profile is retained for the evaluation stage after registration.</p></div>
          {account ? <button className="button-primary min-w-40" disabled={submit.isPending || isExtracting || Boolean(transactionHash)}>{submit.isPending ? 'Submitting…' : transactionHash ? 'Redirecting…' : 'Submit document'}</button> : <button type="button" className="button-primary min-w-40" onClick={() => void connectWallet()} disabled={isConnecting}>{isConnecting ? 'Connecting…' : 'Connect wallet'}</button>}
        </div>
      </form>
    </div>
  )
}
