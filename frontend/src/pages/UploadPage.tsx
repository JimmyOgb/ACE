import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { ErrorState } from '../components/PageState'
import { useRubrics, useSubmitForEvaluation } from '../hooks/useAceQueries'
import { shortId } from '../lib/format'
import { useAce } from '../providers/AceContext'

const emptyForm = {
  title: '',
  abstract_commitment: '',
  artifact_uri: '',
  artifact_hash: '',
  rubric_id: '',
  evaluation_type: 'academic_review',
  metadata_uri: '',
  metadata_hash: '',
}

export function UploadPage() {
  const [form, setForm] = useState(emptyForm)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const { account, connectWallet, isConnecting } = useAce()
  const rubrics = useRubrics()
  const submit = useSubmitForEvaluation()

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTransactionHash(null)
    const hash = await submit.mutateAsync(form)
    setTransactionHash(hash)
    setForm(emptyForm)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-sm font-semibold text-brand">New evaluation</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Submit academic work</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Register immutable artifact and metadata commitments for consensus evaluation.</p>
      </div>

      {transactionHash && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Submission transaction sent</p>
          <p className="mt-1 break-all font-mono text-xs">{transactionHash}</p>
          <Link to="/" className="mt-3 inline-block font-semibold underline">Return to dashboard</Link>
        </div>
      )}
      {submit.isError && <div className="mb-6"><ErrorState error={submit.error} /></div>}

      <form className="card space-y-6 p-5 sm:p-7" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="label">Title</span><input className="field" required value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Research paper or project title" /></label>
          <label className="sm:col-span-2"><span className="label">Abstract commitment</span><textarea className="field min-h-24 resize-y" required value={form.abstract_commitment} onChange={(event) => update('abstract_commitment', event.target.value)} placeholder="Hash or commitment to the abstract" /></label>
          <label><span className="label">Artifact URI</span><input className="field" required type="url" value={form.artifact_uri} onChange={(event) => update('artifact_uri', event.target.value)} placeholder="ipfs://… or https://…" /></label>
          <label><span className="label">Artifact hash</span><input className="field font-mono" required value={form.artifact_hash} onChange={(event) => update('artifact_hash', event.target.value)} placeholder="sha256:…" /></label>
          <label><span className="label">Rubric</span>
            <select className="field" required value={form.rubric_id} onChange={(event) => update('rubric_id', event.target.value)}>
              <option value="">Select a rubric</option>
              {rubrics.data?.map((rubric) => <option key={rubric.rubric_id} value={rubric.rubric_id}>{rubric.name} · {shortId(rubric.rubric_id, 5)}</option>)}
            </select>
            {rubrics.isError && <span className="mt-1 block text-xs text-red-600">Could not load rubrics. Enter the identifier below.</span>}
          </label>
          <label><span className="label">Rubric ID override</span><input className="field font-mono" value={form.rubric_id} onChange={(event) => update('rubric_id', event.target.value)} placeholder="rubric identifier" /></label>
          <label><span className="label">Evaluation type</span><input className="field" required value={form.evaluation_type} onChange={(event) => update('evaluation_type', event.target.value)} /></label>
          <div />
          <label><span className="label">Metadata URI</span><input className="field" required type="url" value={form.metadata_uri} onChange={(event) => update('metadata_uri', event.target.value)} placeholder="ipfs://… or https://…" /></label>
          <label><span className="label">Metadata hash</span><input className="field font-mono" required value={form.metadata_hash} onChange={(event) => update('metadata_hash', event.target.value)} placeholder="sha256:…" /></label>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted">The contract stores commitments and URIs; artifact contents remain off-chain.</p>
          {account ? (
            <button className="button-primary shrink-0" disabled={submit.isPending}>{submit.isPending ? 'Submitting…' : 'Submit for evaluation'}</button>
          ) : (
            <button type="button" className="button-primary shrink-0" onClick={() => void connectWallet()} disabled={isConnecting}>{isConnecting ? 'Connecting…' : 'Connect wallet to submit'}</button>
          )}
        </div>
      </form>
    </div>
  )
}
