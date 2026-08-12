import type { AceClient, AceTransaction, Address, ConsensusResult, CreateConsensusResultArgs, CreateEvaluationReportArgs, CreateProfileArgs, CreateRubricArgs, EvaluateSubmissionArgs, EvaluationProfile, EvaluationReport, ListReportsArgs, PaginationArgs, ReadOptions, RegisterRubricArgs, Rubric, Submission, SubmissionIdArgs, SubmitForEvaluationArgs, WaitForTransactionOptions, WriteOptions, WriteTransactionResult } from "./types.js";
/** Deployed Academic Consensus Engine contract on GenLayer Studio. */
export declare const ACE_DEPLOYED_CONTRACT_ADDRESS: Address;
/** Polling interval in milliseconds for transaction finalization (5 seconds). */
export declare const ACE_FINALIZATION_INTERVAL_MS = 5000;
/**
 * Number of retry cycles for transaction finalization polling (36 retries * 5s = 180s total window).
 * GenLayer consensus transactions execute LLM calls across multiple validators during propose/commit/reveal stages,
 * requiring up to 2-3 minutes to reach FINALIZED status.
 */
export declare const ACE_FINALIZATION_RETRIES = 36;
/** Strongly typed, provider-neutral wrapper for every public ACE ABI method. */
export declare class AcademicConsensusEngineContract {
    readonly client: AceClient;
    readonly address: Address;
    /** Creates a contract wrapper bound to a GenLayer client pair and address. */
    constructor(client: AceClient, address?: Address);
    private read;
    private write;
    /** Submits `create_consensus_result` and returns its transaction hash. */
    create_consensus_result(args: CreateConsensusResultArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Submits `create_evaluation_report` and returns its transaction hash. */
    create_evaluation_report(args: CreateEvaluationReportArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Submits `create_profile` and returns its transaction hash. */
    create_profile(args: CreateProfileArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Submits `create_rubric` and returns its transaction hash. */
    create_rubric(args: CreateRubricArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Submits `evaluate_submission` and returns its transaction hash. */
    evaluate_submission(args: EvaluateSubmissionArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Submits `finalize_submission` and returns its transaction hash. */
    finalize_submission(args: SubmissionIdArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Submits `freeze_submission` and returns its transaction hash. */
    freeze_submission(args: SubmissionIdArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Reads and validates `get_consensus_result`. */
    get_consensus_result(consensus_result_id: string, options?: ReadOptions): Promise<ConsensusResult>;
    /** Reads and validates `get_evaluation_report`. */
    get_evaluation_report(report_id: string, options?: ReadOptions): Promise<EvaluationReport>;
    /** Reads and validates `get_profile`. */
    get_profile(profile_id: string, options?: ReadOptions): Promise<EvaluationProfile>;
    /** Reads the most recently created profile ID for an owner. */
    getLatestProfileId(owner: Address, options?: ReadOptions): Promise<string>;
    /** Reads and validates `get_rubric`. */
    get_rubric(rubric_id: string, options?: ReadOptions): Promise<Rubric>;
    /** Reads and validates `get_submission`. */
    get_submission(submission_id: string, options?: ReadOptions): Promise<Submission>;
    /** Reads report identifiers from `list_reports`. */
    list_reports(args: ListReportsArgs, options?: ReadOptions): Promise<string[]>;
    /** Reads a page of rubrics from `list_rubrics`. */
    list_rubrics(args: PaginationArgs, options?: ReadOptions): Promise<Rubric[]>;
    /** Reads a page of submissions from `list_submissions`. */
    list_submissions(args: PaginationArgs, options?: ReadOptions): Promise<Submission[]>;
    /** Submits `mark_under_review` and returns its transaction hash. */
    mark_under_review(args: SubmissionIdArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Submits `register_rubric` and returns its transaction hash. */
    register_rubric(args: RegisterRubricArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Submits `submit_for_evaluation` and returns its transaction hash. */
    submit_for_evaluation(args: SubmitForEvaluationArgs, options?: WriteOptions): Promise<WriteTransactionResult>;
    /** Waits for a submitted ACE transaction using the configured read client. */
    waitForTransaction(hash: WriteTransactionResult, options?: WaitForTransactionOptions): Promise<AceTransaction>;
}
/** Creates a strongly typed ACE contract wrapper. */
export declare function createAcademicConsensusEngineContract(client: AceClient, address?: Address): AcademicConsensusEngineContract;
//# sourceMappingURL=contract.d.ts.map