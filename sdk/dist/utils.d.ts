import type { CalldataEncodable } from "genlayer-js/types";
import type { AbiInt, Address, ConsensusResult, EvaluationProfile, EvaluationReport, Rubric, Submission } from "./types.js";
/** Converts a safe integer, decimal integer string, or bigint to an ABI integer. */
export declare function toAbiInt(value: bigint | number | string): AbiInt;
/** Validates and narrows a value to a hexadecimal GenLayer address. */
export declare function asAddress(value: unknown, field?: string): Address;
/** Converts an argument object into ABI positional order using exact parameter names. */
export declare function orderedAbiArgs(values: Record<string, CalldataEncodable>, parameterNames: readonly string[]): CalldataEncodable[];
/** Decodes and validates the exact ABI shape returned by `get_submission`. */
export declare function decodeSubmission(value: unknown): Submission;
/** Decodes and validates the exact ABI shape returned by `get_rubric`. */
export declare function decodeRubric(value: unknown): Rubric;
/** Decodes and validates the exact ABI shape returned by `get_profile`. */
export declare function decodeEvaluationProfile(value: unknown): EvaluationProfile;
/** Decodes and validates the exact ABI shape returned by `get_evaluation_report`. */
export declare function decodeEvaluationReport(value: unknown): EvaluationReport;
/** Decodes and validates the exact ABI shape returned by `get_consensus_result`. */
export declare function decodeConsensusResult(value: unknown): ConsensusResult;
/** Decodes an ABI string array. */
export declare function decodeStringArray(value: unknown): string[];
/** Decodes an ABI array of submissions. */
export declare function decodeSubmissionArray(value: unknown): Submission[];
/** Decodes an ABI array of rubrics. */
export declare function decodeRubricArray(value: unknown): Rubric[];
//# sourceMappingURL=utils.d.ts.map