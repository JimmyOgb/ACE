/** Converts a safe integer, decimal integer string, or bigint to an ABI integer. */
export function toAbiInt(value) {
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
        throw new TypeError("ABI integers supplied as numbers must be safe integers");
    }
    if (typeof value === "string" && !/^-?\d+$/.test(value)) {
        throw new TypeError(`Invalid ABI integer: ${value}`);
    }
    return BigInt(value);
}
/** Validates and narrows a value to a hexadecimal GenLayer address. */
export function asAddress(value, field = "address") {
    if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) {
        throw new TypeError(`${field} must be a hexadecimal address`);
    }
    return value;
}
/** Converts an argument object into ABI positional order using exact parameter names. */
export function orderedAbiArgs(values, parameterNames) {
    return parameterNames.map((name) => {
        if (!(name in values)) {
            throw new TypeError(`Missing ABI parameter: ${name}`);
        }
        return values[name];
    });
}
function asRecord(value, typeName) {
    if (value instanceof Map)
        return Object.fromEntries(value);
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new TypeError(`${typeName} must be an object`);
    }
    return value;
}
function stringField(record, name) {
    const value = record[name];
    if (typeof value !== "string")
        throw new TypeError(`${name} must be a string`);
    return value;
}
function boolField(record, name) {
    const value = record[name];
    if (typeof value !== "boolean")
        throw new TypeError(`${name} must be a boolean`);
    return value;
}
function intField(record, name) {
    const value = record[name];
    if (typeof value !== "bigint" && typeof value !== "number" && typeof value !== "string") {
        throw new TypeError(`${name} must be an integer`);
    }
    return toAbiInt(value);
}
function decodedArray(value, typeName) {
    if (!Array.isArray(value))
        throw new TypeError(`${typeName} must be an array`);
    return value;
}
/** Decodes and validates the exact ABI shape returned by `get_submission`. */
export function decodeSubmission(value) {
    const r = asRecord(value, "Submission");
    return {
        submission_id: stringField(r, "submission_id"), schema_version: stringField(r, "schema_version"),
        requester: asAddress(r.requester, "requester"), title: stringField(r, "title"),
        abstract_commitment: stringField(r, "abstract_commitment"), artifact_uri: stringField(r, "artifact_uri"),
        artifact_hash: stringField(r, "artifact_hash"), metadata_uri: stringField(r, "metadata_uri"),
        metadata_hash: stringField(r, "metadata_hash"), rubric_id: stringField(r, "rubric_id"),
        evaluation_type: stringField(r, "evaluation_type"), status: stringField(r, "status"),
        created_at: stringField(r, "created_at"), updated_at: stringField(r, "updated_at"),
        review_window_ends_at: stringField(r, "review_window_ends_at"), challenge_window_ends_at: stringField(r, "challenge_window_ends_at"),
        student_id: stringField(r, "student_id"), institution_id: stringField(r, "institution_id"),
        course_id: stringField(r, "course_id"), evaluation_profile_id: stringField(r, "evaluation_profile_id"),
    };
}
/** Decodes and validates the exact ABI shape returned by `get_rubric`. */
export function decodeRubric(value) {
    const r = asRecord(value, "Rubric");
    return {
        rubric_id: stringField(r, "rubric_id"), schema_version: stringField(r, "schema_version"),
        name: stringField(r, "name"), description_uri: stringField(r, "description_uri"),
        description_hash: stringField(r, "description_hash"), evaluation_type: stringField(r, "evaluation_type"),
        criteria_hash: stringField(r, "criteria_hash"), minimum_score: intField(r, "minimum_score"),
        maximum_score: intField(r, "maximum_score"), passing_threshold: intField(r, "passing_threshold"),
        required_evaluator_count: intField(r, "required_evaluator_count"), allow_open_review: boolField(r, "allow_open_review"),
        status: stringField(r, "status"), created_at: stringField(r, "created_at"),
        supersedes_rubric_id: stringField(r, "supersedes_rubric_id"), criteria_count: intField(r, "criteria_count"),
    };
}
/** Decodes and validates the exact ABI shape returned by `get_profile`. */
export function decodeEvaluationProfile(value) {
    const r = asRecord(value, "EvaluationProfile");
    return {
        profile_id: stringField(r, "profile_id"), owner: asAddress(r.owner, "owner"),
        display_name: stringField(r, "display_name"), profile_uri: stringField(r, "profile_uri"),
        profile_hash: stringField(r, "profile_hash"), capabilities_hash: stringField(r, "capabilities_hash"),
        reputation_basis_points: intField(r, "reputation_basis_points"), status: stringField(r, "status"),
        created_at: stringField(r, "created_at"), updated_at: stringField(r, "updated_at"),
    };
}
/** Decodes and validates the exact ABI shape returned by `get_evaluation_report`. */
export function decodeEvaluationReport(value) {
    const r = asRecord(value, "EvaluationReport");
    return {
        report_id: stringField(r, "report_id"), schema_version: stringField(r, "schema_version"),
        submission_id: stringField(r, "submission_id"), rubric_id: stringField(r, "rubric_id"),
        evaluator: asAddress(r.evaluator, "evaluator"), profile_id: stringField(r, "profile_id"),
        criterion_scores_hash: stringField(r, "criterion_scores_hash"), total_score: intField(r, "total_score"),
        recommendation: stringField(r, "recommendation"), confidence_basis_points: intField(r, "confidence_basis_points"),
        summary_uri: stringField(r, "summary_uri"), summary_hash: stringField(r, "summary_hash"),
        model_metadata_uri: stringField(r, "model_metadata_uri"), model_metadata_hash: stringField(r, "model_metadata_hash"),
        conflict_disclosures_hash: stringField(r, "conflict_disclosures_hash"), status: stringField(r, "status"),
        submitted_at: stringField(r, "submitted_at"), consensus_confidence_basis_points: intField(r, "consensus_confidence_basis_points"),
        consensus_summary_hash: stringField(r, "consensus_summary_hash"),
    };
}
/** Decodes and validates the exact ABI shape returned by `get_consensus_result`. */
export function decodeConsensusResult(value) {
    const r = asRecord(value, "ConsensusResult");
    return {
        consensus_result_id: stringField(r, "consensus_result_id"), schema_version: stringField(r, "schema_version"),
        submission_id: stringField(r, "submission_id"), rubric_id: stringField(r, "rubric_id"),
        evaluation_profile_id: stringField(r, "evaluation_profile_id"), report_ids_hash: stringField(r, "report_ids_hash"),
        decision: stringField(r, "decision"), confidence_basis_points: intField(r, "confidence_basis_points"),
        summary_hash: stringField(r, "summary_hash"), method_id: stringField(r, "method_id"),
        status: stringField(r, "status"), created_at: stringField(r, "created_at"),
        finalized_at: stringField(r, "finalized_at"),
    };
}
/** Decodes an ABI string array. */
export function decodeStringArray(value) {
    return decodedArray(value, "string[]").map((entry, index) => {
        if (typeof entry !== "string")
            throw new TypeError(`string[][${index}] must be a string`);
        return entry;
    });
}
/** Decodes an ABI array of submissions. */
export function decodeSubmissionArray(value) {
    return decodedArray(value, "Submission[]").map(decodeSubmission);
}
/** Decodes an ABI array of rubrics. */
export function decodeRubricArray(value) {
    return decodedArray(value, "Rubric[]").map(decodeRubric);
}
//# sourceMappingURL=utils.js.map