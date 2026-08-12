import type { createClient } from "genlayer-js";
import type { GenLayerClient, GenLayerChain, GenLayerTransaction, TransactionHash, TransactionStatus } from "genlayer-js/types";
/** A GenLayer-compatible hexadecimal account or contract address. */
export type Address = `0x${string}`;
/** The TypeScript representation used for an ABI `int`. */
export type AbiInt = bigint;
/** Configuration accepted by the installed GenLayer client factory. */
export type GenLayerClientConfig = NonNullable<Parameters<typeof createClient>[0]>;
/** Configuration for independent read and wallet-backed write clients. */
export interface AceClientConfig {
    /** Configuration for the client used by read operations. */
    read?: GenLayerClientConfig;
    /** Configuration for the client used by write operations. Defaults to `read`. */
    write?: GenLayerClientConfig;
}
/** Provider-neutral GenLayer clients used by the ACE contract wrapper. */
export interface AceClient {
    /** Client used for readonly contract calls and receipt polling. */
    read: GenLayerClient<GenLayerChain>;
    /** Client used to submit state-changing transactions. */
    write: GenLayerClient<GenLayerChain>;
}
/** Options applied to a readonly ACE call. */
export interface ReadOptions {
    /** Use the JSON-safe GenLayer decoder. Enabled by default. */
    jsonSafeReturn?: boolean;
    /** Number of rate-limit retries for this read. */
    retryAttempts?: number;
    /** Maximum time spent retrying transient read failures. */
    retryWindowMs?: number;
}
/** Options applied to an ACE write transaction. */
export interface WriteOptions {
    /** Native token value sent with the call. All current ABI methods are non-payable. */
    value?: bigint;
    /** Request leader-only execution when supported by the network. */
    leaderOnly?: boolean;
    /** Maximum number of consensus rotations allowed for the transaction. */
    consensusMaxRotations?: number;
}
/** Options used while waiting for a submitted transaction. */
export interface WaitForTransactionOptions {
    /** Transaction status at which polling should stop. */
    status?: TransactionStatus;
    /** Polling interval in milliseconds. */
    interval?: number;
    /** Maximum number of polling attempts. */
    retries?: number;
}
/** Result of submitting any state-changing ACE method. */
export type WriteTransactionResult = TransactionHash;
/** A finalized or in-progress GenLayer transaction receipt. */
export type AceTransaction = GenLayerTransaction;
/** ABI return value for `get_submission` and entries from `list_submissions`. */
export interface Submission {
    submission_id: string;
    schema_version: string;
    requester: Address;
    title: string;
    abstract_commitment: string;
    artifact_uri: string;
    artifact_hash: string;
    metadata_uri: string;
    metadata_hash: string;
    rubric_id: string;
    evaluation_type: string;
    status: string;
    created_at: string;
    updated_at: string;
    review_window_ends_at: string;
    challenge_window_ends_at: string;
    student_id: string;
    institution_id: string;
    course_id: string;
    evaluation_profile_id: string;
}
/** ABI return value for `get_rubric` and entries from `list_rubrics`. */
export interface Rubric {
    rubric_id: string;
    schema_version: string;
    name: string;
    description_uri: string;
    description_hash: string;
    evaluation_type: string;
    criteria_hash: string;
    minimum_score: AbiInt;
    maximum_score: AbiInt;
    passing_threshold: AbiInt;
    required_evaluator_count: AbiInt;
    allow_open_review: boolean;
    status: string;
    created_at: string;
    supersedes_rubric_id: string;
    criteria_count: AbiInt;
}
/** ABI return value for `get_profile`. */
export interface EvaluationProfile {
    profile_id: string;
    owner: Address;
    display_name: string;
    profile_uri: string;
    profile_hash: string;
    capabilities_hash: string;
    reputation_basis_points: AbiInt;
    status: string;
    created_at: string;
    updated_at: string;
}
/** ABI return value for `get_evaluation_report`. */
export interface EvaluationReport {
    report_id: string;
    schema_version: string;
    submission_id: string;
    rubric_id: string;
    evaluator: Address;
    profile_id: string;
    criterion_scores_hash: string;
    total_score: AbiInt;
    recommendation: string;
    confidence_basis_points: AbiInt;
    summary_uri: string;
    summary_hash: string;
    model_metadata_uri: string;
    model_metadata_hash: string;
    conflict_disclosures_hash: string;
    status: string;
    submitted_at: string;
    consensus_confidence_basis_points: AbiInt;
    consensus_summary_hash: string;
}
/** ABI return value for `get_consensus_result`. */
export interface ConsensusResult {
    consensus_result_id: string;
    schema_version: string;
    submission_id: string;
    rubric_id: string;
    evaluation_profile_id: string;
    report_ids_hash: string;
    decision: string;
    confidence_basis_points: AbiInt;
    summary_hash: string;
    method_id: string;
    status: string;
    created_at: string;
    finalized_at: string;
}
export interface CreateConsensusResultArgs {
    submission_id: string;
    evaluation_profile_id: string;
    report_ids: string[];
    report_ids_hash: string;
    decision: string;
    confidence_basis_points: AbiInt;
    summary_hash: string;
    method_id: string;
    status: string;
    finalized_at: string;
}
export interface CreateEvaluationReportArgs {
    submission_id: string;
    profile_id: string;
    criterion_scores_hash: string;
    total_score: AbiInt;
    recommendation: string;
    confidence_basis_points: AbiInt;
    summary_uri: string;
    summary_hash: string;
    model_metadata_uri: string;
    model_metadata_hash: string;
    conflict_disclosures_hash: string;
}
export interface CreateProfileArgs {
    display_name: string;
    profile_uri: string;
    profile_hash: string;
    capabilities_hash: string;
}
export interface CreateRubricArgs {
    name: string;
    description_uri: string;
    description_hash: string;
    evaluation_type: string;
    criteria_hash: string;
    minimum_score: AbiInt;
    maximum_score: AbiInt;
    passing_threshold: AbiInt;
    required_evaluator_count: AbiInt;
    allow_open_review: boolean;
    criteria_count: AbiInt;
    supersedes_rubric_id: string;
}
/** Arguments for `register_rubric`, whose ABI matches `create_rubric`. */
export type RegisterRubricArgs = CreateRubricArgs;
export interface EvaluateSubmissionArgs {
    submission_id: string;
    profile_id: string;
}
export interface SubmissionIdArgs {
    submission_id: string;
}
export interface SubmitForEvaluationArgs {
    title: string;
    abstract_commitment: string;
    artifact_uri: string;
    artifact_hash: string;
    rubric_id: string;
    evaluation_type: string;
    metadata_uri: string;
    metadata_hash: string;
}
export interface PaginationArgs {
    offset: AbiInt;
    limit: AbiInt;
}
export interface ListReportsArgs extends PaginationArgs {
    submission_id: string;
}
/** Exact readonly method names present in the ACE ABI. */
export type AceReadMethodName = "get_consensus_result" | "get_evaluation_report" | "get_latest_profile_id" | "get_profile" | "get_rubric" | "get_submission" | "list_reports" | "list_rubrics" | "list_submissions";
/** Exact state-changing method names present in the ACE ABI. */
export type AceWriteMethodName = "create_consensus_result" | "create_evaluation_report" | "create_profile" | "create_rubric" | "evaluate_submission" | "finalize_submission" | "freeze_submission" | "mark_under_review" | "register_rubric" | "submit_for_evaluation";
/** ABI-declared execution return types for state-changing methods. */
export interface AceWriteAbiReturnMap {
    create_consensus_result: string;
    create_evaluation_report: string;
    create_profile: string;
    create_rubric: string;
    evaluate_submission: string;
    finalize_submission: null;
    freeze_submission: null;
    mark_under_review: null;
    register_rubric: string;
    submit_for_evaluation: string;
}
//# sourceMappingURL=types.d.ts.map