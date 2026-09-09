import { TransactionStatus, type CalldataEncodable, type TransactionHash } from "genlayer-js/types";

import type {
  AceClient,
  AceTransaction,
  Address,
  ConsensusResult,
  CreateConsensusResultArgs,
  CreateEvaluationReportArgs,
  CreateProfileArgs,
  CreateRubricArgs,
  EvaluateSubmissionArgs,
  EvaluationProfile,
  EvaluationReport,
  ListReportsArgs,
  PaginationArgs,
  ReadOptions,
  RegisterRubricArgs,
  Rubric,
  Submission,
  SubmissionIdArgs,
  SubmitForEvaluationArgs,
  WaitForTransactionOptions,
  WriteOptions,
  WriteTransactionResult,
} from "./types.js";
import {
  decodeConsensusResult,
  decodeEvaluationProfile,
  decodeEvaluationReport,
  decodeRubric,
  decodeRubricArray,
  decodeStringArray,
  decodeSubmission,
  decodeSubmissionArray,
  orderedAbiArgs,
} from "./utils.js";
import { isStudionetTransportError, isStudionetRateLimitError, TransactionStatusUnavailableError, withStudionetRetry } from "./rpc.js";

const PARAMS = {
  create_consensus_result: ["submission_id", "evaluation_profile_id", "report_ids", "report_ids_hash", "decision", "confidence_basis_points", "summary_hash", "method_id", "status", "finalized_at"],
  create_evaluation_report: ["submission_id", "profile_id", "criterion_scores_hash", "total_score", "recommendation", "confidence_basis_points", "summary_uri", "summary_hash", "model_metadata_uri", "model_metadata_hash", "conflict_disclosures_hash"],
  create_profile: ["display_name", "profile_uri", "profile_hash", "capabilities_hash"],
  create_rubric: ["name", "description_uri", "description_hash", "evaluation_type", "criteria_hash", "minimum_score", "maximum_score", "passing_threshold", "required_evaluator_count", "allow_open_review", "criteria_count", "supersedes_rubric_id"],
  evaluate_submission: ["submission_id", "profile_id"],
  finalize_submission: ["submission_id"],
  freeze_submission: ["submission_id"],
  get_consensus_result: ["consensus_result_id"],
  get_evaluation_report: ["report_id"],
  get_latest_profile_id: ["owner"],
  get_profile: ["profile_id"],
  get_rubric: ["rubric_id"],
  get_submission: ["submission_id"],
  list_reports: ["submission_id", "offset", "limit"],
  list_rubrics: ["offset", "limit"],
  list_submissions: ["offset", "limit"],
  mark_under_review: ["submission_id"],
  register_rubric: ["name", "description_uri", "description_hash", "evaluation_type", "criteria_hash", "minimum_score", "maximum_score", "passing_threshold", "required_evaluator_count", "allow_open_review", "criteria_count", "supersedes_rubric_id"],
  submit_for_evaluation: ["title", "abstract_commitment", "artifact_uri", "artifact_hash", "rubric_id", "evaluation_type", "metadata_uri", "metadata_hash"],
} as const;

/** Studionet deployment address. */
export const ACE_DEPLOYED_CONTRACT_ADDRESS: Address = '0x5B837123100078EB312cdcEbD1af675c6A8234be';

/** Polling interval in milliseconds for transaction finalization (5 seconds). */
export const ACE_FINALIZATION_INTERVAL_MS = 5000;

/**
 * Number of retry cycles for transaction finalization polling (36 retries * 5s = 180s total window).
 * GenLayer consensus transactions execute LLM calls across multiple validators during propose/commit/reveal stages,
 * requiring up to 2-3 minutes to reach FINALIZED status.
 */
export const ACE_FINALIZATION_RETRIES = 36;

function calldataRecord(value: object): Record<string, CalldataEncodable> {
  return value as Record<string, CalldataEncodable>;
}

/** Strongly typed, provider-neutral wrapper for every public ACE ABI method. */
export class AcademicConsensusEngineContract {
  /** Creates a contract wrapper bound to a GenLayer client pair and address. */
  constructor(
    readonly client: AceClient,
    readonly address: Address,
  ) {}

  private async read(functionName: string, args: CalldataEncodable[], options: ReadOptions = {}): Promise<unknown> {
    return withStudionetRetry(() => this.client.read.readContract({
      address: this.address,
      functionName,
      args,
      jsonSafeReturn: options.jsonSafeReturn ?? true,
    }), options.retryAttempts ?? 5, options.retryWindowMs ?? 45_000, functionName === "get_profile" ? "[ACE] profile RPC retry" : undefined);
  }

  private async write(functionName: string, args: CalldataEncodable[], options: WriteOptions = {}): Promise<WriteTransactionResult> {
    // Let GenLayerJS switch MetaMask to its official Studionet before every write.
    try {
      await this.client.write.connect("studionet");
    } catch {
      // Switched and verified by frontend ensureStudionetNetwork
    }
    const result: unknown = await this.client.write.writeContract({
      address: this.address,
      functionName,
      args,
      value: options.value ?? 0n,
      ...(options.leaderOnly === undefined ? {} : { leaderOnly: options.leaderOnly }),
      ...(options.consensusMaxRotations === undefined ? {} : { consensusMaxRotations: options.consensusMaxRotations }),
    });
    return result as TransactionHash;
  }

  /** Submits `create_consensus_result` and returns its transaction hash. */
  create_consensus_result(args: CreateConsensusResultArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("create_consensus_result", orderedAbiArgs(calldataRecord(args), PARAMS.create_consensus_result), options);
  }

  /** Submits `create_evaluation_report` and returns its transaction hash. */
  create_evaluation_report(args: CreateEvaluationReportArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("create_evaluation_report", orderedAbiArgs(calldataRecord(args), PARAMS.create_evaluation_report), options);
  }

  /** Submits `create_profile` and returns its transaction hash. */
  create_profile(args: CreateProfileArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("create_profile", orderedAbiArgs(calldataRecord(args), PARAMS.create_profile), options);
  }

  /** Submits `create_rubric` and returns its transaction hash. */
  create_rubric(args: CreateRubricArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("create_rubric", orderedAbiArgs(calldataRecord(args), PARAMS.create_rubric), options);
  }

  /** Submits `evaluate_submission` and returns its transaction hash. */
  evaluate_submission(args: EvaluateSubmissionArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("evaluate_submission", orderedAbiArgs(calldataRecord(args), PARAMS.evaluate_submission), options);
  }

  /** Submits `finalize_submission` and returns its transaction hash. */
  finalize_submission(args: SubmissionIdArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("finalize_submission", orderedAbiArgs(calldataRecord(args), PARAMS.finalize_submission), options);
  }

  /** Submits `freeze_submission` and returns its transaction hash. */
  freeze_submission(args: SubmissionIdArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("freeze_submission", orderedAbiArgs(calldataRecord(args), PARAMS.freeze_submission), options);
  }

  /** Reads and validates `get_consensus_result`. */
  async get_consensus_result(consensus_result_id: string, options?: ReadOptions): Promise<ConsensusResult> {
    const value = await this.read("get_consensus_result", [consensus_result_id], options);
    return decodeConsensusResult(value);
  }

  /** Reads and validates `get_evaluation_report`. */
  async get_evaluation_report(report_id: string, options?: ReadOptions): Promise<EvaluationReport> {
    const value = await this.read("get_evaluation_report", [report_id], options);
    return decodeEvaluationReport(value);
  }

  /** Reads and validates `get_profile`. */
  async get_profile(profile_id: string, options?: ReadOptions): Promise<EvaluationProfile> {
    const value = await this.read("get_profile", [profile_id], options);
    return decodeEvaluationProfile(value);
  }

  /** Reads the most recently created profile ID for an owner. */
  async getLatestProfileId(owner: Address, options?: ReadOptions): Promise<string> {
    const value = await this.read("get_latest_profile_id", [owner], options);
    if (typeof value !== "string") throw new TypeError("get_latest_profile_id must return a string");
    return value;
  }

  /** Reads the most recently created profile ID for an owner (alias for getLatestProfileId). */
  async get_latest_profile_id(owner: Address, options?: ReadOptions): Promise<string> {
    return this.getLatestProfileId(owner, options);
  }

  /** Reads and validates `get_rubric`. */
  async get_rubric(rubric_id: string, options?: ReadOptions): Promise<Rubric> {
    const value = await this.read("get_rubric", [rubric_id], options);
    return decodeRubric(value);
  }

  /** Reads and validates `get_submission`. */
  async get_submission(submission_id: string, options?: ReadOptions): Promise<Submission> {
    const value = await this.read("get_submission", [submission_id], options);
    return decodeSubmission(value);
  }

  /** Reads report identifiers from `list_reports`. */
  async list_reports(args: ListReportsArgs, options?: ReadOptions): Promise<string[]> {
    const value = await this.read("list_reports", orderedAbiArgs(calldataRecord(args), PARAMS.list_reports), options);
    return decodeStringArray(value);
  }


  /** Reads a page of rubrics from `list_rubrics`. */
  async list_rubrics(args: PaginationArgs, options?: ReadOptions): Promise<Rubric[]> {
    const value = await this.read("list_rubrics", orderedAbiArgs(calldataRecord(args), PARAMS.list_rubrics), options);
    return decodeRubricArray(value);
  }

  /** Reads a page of submissions from `list_submissions`. */
  async list_submissions(args: PaginationArgs, options?: ReadOptions): Promise<Submission[]> {
    const value = await this.read("list_submissions", orderedAbiArgs(calldataRecord(args), PARAMS.list_submissions), options);
    return decodeSubmissionArray(value);
  }

  /** Submits `mark_under_review` and returns its transaction hash. */
  mark_under_review(args: SubmissionIdArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("mark_under_review", orderedAbiArgs(calldataRecord(args), PARAMS.mark_under_review), options);
  }

  /** Submits `register_rubric` and returns its transaction hash. */
  register_rubric(args: RegisterRubricArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("register_rubric", orderedAbiArgs(calldataRecord(args), PARAMS.register_rubric), options);
  }

  /** Submits `submit_for_evaluation` and returns its transaction hash. */
  submit_for_evaluation(args: SubmitForEvaluationArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.write("submit_for_evaluation", orderedAbiArgs(calldataRecord(args), PARAMS.submit_for_evaluation), options);
  }

  /** Submits `submit_for_evaluation` and returns its transaction hash (alias for submit_for_evaluation). */
  submit_submission(args: SubmitForEvaluationArgs, options?: WriteOptions): Promise<WriteTransactionResult> {
    return this.submit_for_evaluation(args, options);
  }

  /** Waits for a submitted ACE transaction using the configured read client. */
  async waitForTransaction(hash: WriteTransactionResult, options: WaitForTransactionOptions = {}): Promise<AceTransaction> {
    const status = options.status ?? TransactionStatus.FINALIZED;
    const startedAt = Date.now();
    const maxWaitMs = Math.max(60_000, (options.interval ?? ACE_FINALIZATION_INTERVAL_MS) * (options.retries ?? ACE_FINALIZATION_RETRIES) * 2);
    const maxDelayMs = 30_000;
    let attempt = 0;
    let lastError: unknown;

    while (Date.now() - startedAt < maxWaitMs) {
      try {
        // Keep each underlying RPC call short. Backoff between calls prevents
        // a temporary Studionet outage from becoming an RPC storm.
        return await this.client.read.waitForTransactionReceipt({
          hash,
          status,
          interval: 1_000,
          retries: 1,
        });
      } catch (error) {
        lastError = error;
        if (!isStudionetRateLimitError(error) && !isStudionetTransportError(error)) throw error;
      }

      const delay = Math.min(maxDelayMs, 1_000 * 2 ** Math.min(attempt, 5));
      attempt += 1;
      console.warn("[ACE] transaction status RPC retry", { hash, attempt, delay });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new TransactionStatusUnavailableError(String(hash), lastError);
  }

}

/** Creates a strongly typed ACE contract wrapper. */
export function createAcademicConsensusEngineContract(
  client: AceClient,
  address: Address,
): AcademicConsensusEngineContract {
  return new AcademicConsensusEngineContract(client, address);
}
