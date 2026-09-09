# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from dataclasses import dataclass
from enum import Enum
import hashlib
import json
from genlayer import *

PROTOCOL_NAME: str = "Academic Consensus Engine"
PROTOCOL_SYMBOL: str = "ACE"
PROTOCOL_VERSION: str = "0.1.0"
SCHEMA_VERSION: str = "0.1.0"

ERROR_INVALID_INPUT: str = "[EXPECTED] Invalid submission input"
ERROR_DUPLICATE_SUBMISSION: str = "[EXPECTED] Duplicate submission"
ERROR_SUBMISSION_NOT_FOUND: str = "[EXPECTED] Submission not found"
ERROR_RUBRIC_NOT_FOUND: str = "[EXPECTED] Rubric not found"
ERROR_DUPLICATE_RUBRIC: str = "[EXPECTED] Duplicate rubric"
ERROR_INVALID_RUBRIC: str = "[EXPECTED] Invalid rubric input"
ERROR_PROFILE_NOT_FOUND: str = "[EXPECTED] Profile not found"
ERROR_DUPLICATE_PROFILE: str = "[EXPECTED] Duplicate profile"
ERROR_INVALID_PROFILE: str = "[EXPECTED] Invalid profile input"
ERROR_REPORT_NOT_FOUND: str = "[EXPECTED] Report not found"
ERROR_INVALID_REPORT: str = "[EXPECTED] Invalid report input"
ERROR_CONSENSUS_NOT_FOUND: str = "[EXPECTED] Consensus result not found"
ERROR_DUPLICATE_CONSENSUS: str = "[EXPECTED] Duplicate consensus result"
ERROR_INVALID_CONSENSUS: str = "[EXPECTED] Invalid consensus result input"
ERROR_INVALID_SUBMISSION_TRANSITION: str = "[EXPECTED] Invalid submission state transition"
ERROR_AI_CONSENSUS: str = "[LLM_ERROR] AI consensus failed"
ERROR_DOCUMENT_RETRIEVAL: str = "[EXTERNAL] Required source could not be retrieved"
ERROR_DOCUMENT_HASH_MISMATCH: str = "[EXPECTED] Retrieved source hash does not match commitment"
ERROR_CONSENSUS_ONLY: str = "[EXPECTED] Result can only be produced by consensus"

CONSENSUS_EVALUATOR_COUNT: int = 5
MAX_TITLE_LENGTH: int = 256
MAX_URI_LENGTH: int = 2048
MAX_HASH_LENGTH: int = 128
DEFAULT_PAGE_LIMIT: int = 50

class EvaluationStatus(str, Enum):
    DRAFT = "draft"
    REGISTERED = "registered"
    VALIDATING = "validating"
    ASSIGNED = "assigned"
    IN_REVIEW = "in_review"
    CONSENSUS_PENDING = "consensus_pending"
    CHALLENGE_OPEN = "challenge_open"
    DISPUTED = "disputed"
    FINALIZED = "finalized"
    CANCELLED = "cancelled"
    FROZEN = "frozen"
    UNDER_REVIEW = "under_review"
    CONSENSUS_READY = "consensus_ready"

class EvaluationType(str, Enum):
    ESSAY = "essay"
    RESEARCH_PAPER = "research_paper"
    SHORT_ANSWER = "short_answer"
    LAB_REPORT = "lab_report"
    PROJECT_REPORT = "project_report"
    CODE_ASSIGNMENT = "code_assignment"
    PRESENTATION = "presentation"
    CUSTOM = "custom"

@allow_storage
@dataclass
class Criterion:
    criterion_id: str
    rubric_id: str
    name: str
    description: str
    weight_basis_points: u256
    minimum_score: u256
    maximum_score: u256
    requires_evidence: bool
    order: u256
    schema_version: str

@allow_storage
@dataclass
class Rubric:
    rubric_id: str
    schema_version: str
    name: str
    description_uri: str
    description_hash: str
    evaluation_type: str
    criteria_hash: str
    minimum_score: u256
    maximum_score: u256
    passing_threshold: u256
    required_evaluator_count: u256
    allow_open_review: bool
    status: str
    created_at: str
    supersedes_rubric_id: str
    criteria_count: u256

@allow_storage
@dataclass
class Submission:
    submission_id: str
    schema_version: str
    requester: Address
    title: str
    abstract_commitment: str
    artifact_uri: str
    artifact_hash: str
    metadata_uri: str
    metadata_hash: str
    rubric_id: str
    evaluation_type: str
    status: str
    created_at: str
    updated_at: str
    review_window_ends_at: str
    challenge_window_ends_at: str
    student_id: str
    institution_id: str
    course_id: str
    evaluation_profile_id: str

@allow_storage
@dataclass
class EvaluationReport:
    report_id: str
    schema_version: str
    submission_id: str
    rubric_id: str
    evaluator: Address
    profile_id: str
    criterion_scores_hash: str
    total_score: u256
    recommendation: str
    confidence_basis_points: u256
    summary_uri: str
    summary_hash: str
    model_metadata_uri: str
    model_metadata_hash: str
    conflict_disclosures_hash: str
    status: str
    submitted_at: str
    consensus_confidence_basis_points: u256
    consensus_summary_hash: str

@allow_storage
@dataclass
class EvaluationProfile:
    profile_id: str
    owner: Address
    display_name: str
    profile_uri: str
    profile_hash: str
    capabilities_hash: str
    reputation_basis_points: u256
    status: str
    created_at: str
    updated_at: str

@allow_storage
@dataclass
class ConsensusResult:
    consensus_result_id: str
    schema_version: str
    submission_id: str
    rubric_id: str
    evaluation_profile_id: str
    report_ids_hash: str
    decision: str
    confidence_basis_points: u256
    summary_hash: str
    method_id: str
    status: str
    created_at: str
    finalized_at: str

class AcademicConsensusEngine(gl.Contract):
    owner: Address
    protocol_name: str
    protocol_symbol: str
    protocol_version: str
    schema_version: str

    submission_count: u256
    rubric_count: u256
    report_count: u256
    profile_count: u256
    consensus_result_count: u256

    submissions: TreeMap[str, Submission]
    submission_ids: DynArray[str]
    rubrics: TreeMap[str, Rubric]
    rubric_ids: DynArray[str]
    reports: TreeMap[str, EvaluationReport]
    report_ids: DynArray[str]
    profiles: TreeMap[str, EvaluationProfile]
    profile_ids: DynArray[str]
    consensus_results: TreeMap[str, ConsensusResult]
    consensus_result_ids: DynArray[str]
    consensus_result_by_submission: TreeMap[str, str]
    reports_by_submission: TreeMap[str, str]
    report_ids_by_submission: TreeMap[str, DynArray[str]]
    latest_profile_id_by_owner: TreeMap[str, str]

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.protocol_name = PROTOCOL_NAME
        self.protocol_symbol = PROTOCOL_SYMBOL
        self.protocol_version = PROTOCOL_VERSION
        self.schema_version = SCHEMA_VERSION
        self.submission_count = 0
        self.rubric_count = 0
        self.report_count = 0
        self.profile_count = 0
        self.consensus_result_count = 0

    @gl.public.write
    def submit_for_evaluation(self, title: str, abstract_commitment: str, artifact_uri: str, artifact_hash: str, rubric_id: str, evaluation_type: str, metadata_uri: str, metadata_hash: str) -> str:
        self._validate_submission_input(title, abstract_commitment, artifact_uri, artifact_hash, rubric_id, evaluation_type)
        sub_id = self._build_submission_id(gl.message.sender_address, title)
        if sub_id in self.submissions:
            raise gl.vm.UserError(f"{ERROR_DUPLICATE_SUBMISSION}: {sub_id}")
        seq = self.submission_count + 1
        m = str(seq)
        self.submissions[sub_id] = Submission(sub_id, self.schema_version, gl.message.sender_address, title.strip(), abstract_commitment.strip(), artifact_uri.strip(), artifact_hash.strip(), metadata_uri.strip(), metadata_hash.strip(), rubric_id.strip(), evaluation_type.strip(), EvaluationStatus.REGISTERED.value, m, m, "", "", "", "", "", "")
        self.submission_ids.append(sub_id)
        self.submission_count = seq
        return sub_id

    @gl.public.view
    def get_submission(self, submission_id: str) -> Submission:
        return self.submissions[self._require_submission_exists(submission_id)]

    @gl.public.view
    def list_submissions(self, offset: u256, limit: u256) -> DynArray[Submission]:
        total = len(self.submission_ids)
        if offset >= total: return []
        end_idx = min(offset + (limit if limit > 0 else DEFAULT_PAGE_LIMIT), total)
        res: DynArray[Submission] = []
        for i in range(offset, end_idx):
            res.append(self.submissions[self.submission_ids[i]])
        return res

    @gl.public.write
    def freeze_submission(self, submission_id: str) -> None:
        self._transition_submission_state(submission_id, EvaluationStatus.FROZEN.value)

    @gl.public.write
    def mark_under_review(self, submission_id: str) -> None:
        raise gl.vm.UserError(ERROR_CONSENSUS_ONLY)

    @gl.public.write
    def finalize_submission(self, submission_id: str) -> None:
        # Finalization is an authoritative state transition.  It is performed
        # only by evaluate_submission after run_nondet has accepted the
        # consensus result; retaining a public state-advancing path would let a
        # normal caller manufacture a final lifecycle state.
        raise gl.vm.UserError(ERROR_CONSENSUS_ONLY)

    @gl.public.write
    def create_rubric(self, name: str, description_uri: str, description_hash: str, evaluation_type: str, criteria_hash: str, minimum_score: u256, maximum_score: u256, passing_threshold: u256, required_evaluator_count: u256, allow_open_review: bool, criteria_count: u256, supersedes_rubric_id: str = "") -> str:
        self._validate_rubric_input(name, description_uri, description_hash, evaluation_type, criteria_hash, minimum_score, maximum_score, passing_threshold, required_evaluator_count, criteria_count)
        seq = self.rubric_count + 1
        rub_id = self._build_rubric_id(name, seq)
        if rub_id in self.rubrics:
            raise gl.vm.UserError(f"{ERROR_DUPLICATE_RUBRIC}: {rub_id}")
        self.rubrics[rub_id] = Rubric(rub_id, self.schema_version, name.strip(), description_uri.strip(), description_hash.strip(), evaluation_type.strip(), criteria_hash.strip(), minimum_score, maximum_score, passing_threshold, required_evaluator_count, allow_open_review, "active", str(seq), supersedes_rubric_id.strip(), criteria_count)
        self.rubric_ids.append(rub_id)
        self.rubric_count = seq
        return rub_id

    @gl.public.write
    def register_rubric(self, name: str, description_uri: str, description_hash: str, evaluation_type: str, criteria_hash: str, minimum_score: u256, maximum_score: u256, passing_threshold: u256, required_evaluator_count: u256, allow_open_review: bool, criteria_count: u256, supersedes_rubric_id: str = "") -> str:
        return self.create_rubric(name, description_uri, description_hash, evaluation_type, criteria_hash, minimum_score, maximum_score, passing_threshold, required_evaluator_count, allow_open_review, criteria_count, supersedes_rubric_id)

    @gl.public.view
    def get_rubric(self, rubric_id: str) -> Rubric:
        return self.rubrics[self._require_rubric_exists(rubric_id)]

    @gl.public.view
    def list_rubrics(self, offset: u256, limit: u256) -> DynArray[Rubric]:
        total = len(self.rubric_ids)
        if offset >= total: return []
        end_idx = min(offset + (limit if limit > 0 else DEFAULT_PAGE_LIMIT), total)
        res: DynArray[Rubric] = []
        for i in range(offset, end_idx):
            res.append(self.rubrics[self.rubric_ids[i]])
        return res

    @gl.public.write
    def create_profile(self, display_name: str, profile_uri: str, profile_hash: str, capabilities_hash: str) -> str:
        self._validate_profile_input(display_name, profile_uri, profile_hash, capabilities_hash)
        owner = gl.message.sender_address
        seq = self.profile_count + 1
        m = str(seq)
        prof_id = self._build_profile_id(owner, seq)
        if prof_id in self.profiles:
            raise gl.vm.UserError(f"{ERROR_DUPLICATE_PROFILE}: {prof_id}")
        self.profiles[prof_id] = EvaluationProfile(prof_id, owner, display_name.strip(), profile_uri.strip(), profile_hash.strip(), capabilities_hash.strip(), 0, "active", m, m)
        self.profile_ids.append(prof_id)
        owner_key = str(owner if isinstance(owner, Address) else Address(owner))
        self.latest_profile_id_by_owner[owner_key] = prof_id
        self.profile_count = seq
        return prof_id

    @gl.public.view
    def get_profile(self, profile_id: str) -> EvaluationProfile:
        return self.profiles[self._require_profile_exists(profile_id)]

    @gl.public.view
    def get_latest_profile_id(self, owner: Address) -> str:
        owner_key = str(owner if isinstance(owner, Address) else Address(owner))
        return self.latest_profile_id_by_owner[owner_key] if owner_key in self.latest_profile_id_by_owner else ""

    @gl.public.write
    def create_evaluation_report(self, submission_id: str, profile_id: str, criterion_scores_hash: str, total_score: u256, recommendation: str, confidence_basis_points: u256, summary_uri: str, summary_hash: str, model_metadata_uri: str, model_metadata_hash: str, conflict_disclosures_hash: str) -> str:
        raise gl.vm.UserError(ERROR_CONSENSUS_ONLY)

    @gl.public.write
    def evaluate_submission(self, submission_id: str, profile_id: str) -> str:
        norm_sub_id = self._require_submission_exists(submission_id)
        norm_prof_id = self._require_profile_exists(profile_id)
        sub = self.submissions[norm_sub_id]
        if sub.status != EvaluationStatus.FROZEN.value:
            raise gl.vm.UserError(f"{ERROR_INVALID_SUBMISSION_TRANSITION}: {sub.status} -> {EvaluationStatus.UNDER_REVIEW.value}")
        if norm_sub_id in self.consensus_result_by_submission:
            raise gl.vm.UserError(f"{ERROR_DUPLICATE_CONSENSUS}: {norm_sub_id}")

        sub.evaluation_profile_id = norm_prof_id
        self.submissions[norm_sub_id] = sub
        eval_payload = self._prepare_evaluation_payload(norm_sub_id)
        self._transition_submission_state(norm_sub_id, EvaluationStatus.UNDER_REVIEW.value)

        def produce_evaluations() -> list:
            # Resolve and verify both immutable inputs before any evaluator is
            # invoked.  Every evaluator receives this same complete snapshot;
            # prompts contain the content, never merely its URI or hash.
            verified_payload = self._with_verified_sources(eval_payload)
            responses = []
            for idx in range(CONSENSUS_EVALUATOR_COUNT):
                prompt = self._build_evaluation_prompt(verified_payload, idx)
                resp = gl.nondet.exec_prompt(prompt, response_format="json")
                norm = self._normalize_ai_response(resp)
                self._validate_ai_response_context(norm, verified_payload)
                responses.append(norm)
            self._validate_evaluation_batch(responses, verified_payload)
            return responses

        def validate_evaluations(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return): return False
            try:
                leader_responses = leaders_res.calldata
                self._validate_evaluation_batch(leader_responses, eval_payload)
                validator_responses = produce_evaluations()
                return self._evaluation_batches_agree(leader_responses, validator_responses, eval_payload)
            except Exception:
                return False

        accepted_responses = gl.vm.run_nondet(produce_evaluations, validate_evaluations)
        report_ids = [self._store_ai_evaluation_report(norm_sub_id, norm_prof_id, resp) for resp in accepted_responses]

        consensus_payload = self._prepare_consensus_payload(norm_sub_id)

        def produce_consensus() -> dict:
            verified_payload = self._with_verified_sources(consensus_payload)
            resp = gl.nondet.exec_prompt(self._build_consensus_prompt(verified_payload), response_format="json")
            return self._normalize_consensus_ai_response(resp, verified_payload)

        def validate_consensus(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return): return False
            try:
                leader_calldata = leaders_res.calldata
                leader_resp = self._normalize_consensus_ai_response({
                    "submissionId": leader_calldata["submissionId"], "rubricId": leader_calldata["rubricId"],
                    "reportIds": leader_calldata["reportIds"], "decision": leader_calldata["decision"],
                    "confidence": leader_calldata["confidenceBasisPoints"], "summary": leader_calldata["summary"],
                    "methodId": leader_calldata["methodId"]
                }, consensus_payload)
                validator_resp = produce_consensus()
                return self._consensus_responses_agree(leader_resp, validator_resp)
            except Exception:
                return False

        accepted_consensus = gl.vm.run_nondet(produce_consensus, validate_consensus)
        consensus_result_id = self._store_ai_consensus_result(norm_sub_id, norm_prof_id, report_ids, accepted_consensus)
        self._transition_submission_state(norm_sub_id, EvaluationStatus.CONSENSUS_READY.value)
        self._transition_submission_state(norm_sub_id, EvaluationStatus.FINALIZED.value)
        return consensus_result_id

    @gl.public.view
    def get_evaluation_report(self, report_id: str) -> EvaluationReport:
        return self.reports[self._require_report_exists(report_id)]

    @gl.public.view
    def list_reports(self, submission_id: str, offset: u256, limit: u256) -> list[str]:
        norm_sub_id = self._require_submission_exists(submission_id)
        if norm_sub_id not in self.reports_by_submission: return []
        sub_reports = json.loads(self.reports_by_submission[norm_sub_id])
        total = len(sub_reports)
        if offset >= total: return []
        end_idx = min(offset + (limit if limit > 0 else DEFAULT_PAGE_LIMIT), total)
        return [sub_reports[i] for i in range(offset, end_idx)]

    @gl.public.write
    def create_consensus_result(self, submission_id: str, evaluation_profile_id: str, report_ids: DynArray[str], report_ids_hash: str, decision: str, confidence_basis_points: u256, summary_hash: str, method_id: str, status: str, finalized_at: str = "") -> str:
        raise gl.vm.UserError(ERROR_CONSENSUS_ONLY)

    @gl.public.view
    def get_consensus_result(self, consensus_result_id: str) -> ConsensusResult:
        return self.consensus_results[self._require_consensus_exists(consensus_result_id)]

    def _require(self, id_val: str, store, err_prefix: str) -> str:
        norm = id_val.strip()
        if not norm or norm not in store:
            raise gl.vm.UserError(f"{err_prefix}: {id_val}")
        return norm

    def _require_submission_exists(self, id_val: str) -> str:
        return self._require(id_val, self.submissions, ERROR_SUBMISSION_NOT_FOUND)

    def _require_rubric_exists(self, id_val: str) -> str:
        return self._require(id_val, self.rubrics, ERROR_RUBRIC_NOT_FOUND)

    def _require_report_exists(self, id_val: str) -> str:
        return self._require(id_val, self.reports, ERROR_REPORT_NOT_FOUND)

    def _require_profile_exists(self, id_val: str) -> str:
        return self._require(id_val, self.profiles, ERROR_PROFILE_NOT_FOUND)

    def _require_consensus_exists(self, id_val: str) -> str:
        return self._require(id_val, self.consensus_results, ERROR_CONSENSUS_NOT_FOUND)

    def _check_str(self, val: str, name: str, err: str, max_len: int = 0) -> str:
        s = val.strip()
        if not s:
            raise gl.vm.UserError(f"{err}: {name} is required")
        if max_len > 0 and len(s) > max_len:
            raise gl.vm.UserError(f"{err}: {name} is too long")
        return s

    def _req_num(self, v, min_v: int, max_v: int, err: str, name: str) -> None:
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v < min_v or v > max_v:
            raise gl.vm.UserError(f"{err}: invalid {name}")

    def _req_fields(self, d: dict, keys: tuple, err: str) -> None:
        for k in keys:
            if k not in d:
                raise gl.vm.UserError(f"{err}: missing {k}")

    def _validate_submission_input(self, title: str, abstract_commitment: str, artifact_uri: str, artifact_hash: str, rubric_id: str, evaluation_type: str) -> None:
        self._check_str(title, "title", ERROR_INVALID_INPUT, MAX_TITLE_LENGTH)
        self._check_str(abstract_commitment, "abstract commitment", ERROR_INVALID_INPUT)
        self._check_str(artifact_uri, "artifact URI", ERROR_INVALID_INPUT, MAX_URI_LENGTH)
        self._check_str(artifact_hash, "artifact hash", ERROR_INVALID_INPUT, MAX_HASH_LENGTH)
        self._check_str(rubric_id, "rubric ID", ERROR_INVALID_INPUT)
        self._validate_evaluation_type(evaluation_type)

    def _transition_submission_state(self, submission_id: str, target_status: str) -> None:
        norm_sub_id = self._require_submission_exists(submission_id)
        norm_target = target_status.strip()
        sub = self.submissions[norm_sub_id]
        cur = sub.status
        is_legal = (cur == EvaluationStatus.REGISTERED.value and norm_target == EvaluationStatus.FROZEN.value) or \
                   (cur == EvaluationStatus.FROZEN.value and norm_target == EvaluationStatus.UNDER_REVIEW.value) or \
                   (cur == EvaluationStatus.UNDER_REVIEW.value and norm_target == EvaluationStatus.CONSENSUS_READY.value) or \
                   (cur == EvaluationStatus.CONSENSUS_READY.value and norm_target == EvaluationStatus.FINALIZED.value)
        if not is_legal:
            raise gl.vm.UserError(f"{ERROR_INVALID_SUBMISSION_TRANSITION}: {cur} -> {norm_target}")
        sub.status = norm_target
        self.submissions[norm_sub_id] = sub

    def _validate_evaluation_type(self, evaluation_type: str) -> None:
        s = evaluation_type.strip()
        if not s:
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: evaluation type is required")
        if s not in (e.value for e in EvaluationType):
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: unsupported evaluation type")

    def _validate_rubric_input(self, name: str, description_uri: str, description_hash: str, evaluation_type: str, criteria_hash: str, minimum_score: u256, maximum_score: u256, passing_threshold: u256, required_evaluator_count: u256, criteria_count: u256) -> None:
        self._check_str(name, "name", ERROR_INVALID_RUBRIC, MAX_TITLE_LENGTH)
        self._check_str(description_uri, "description URI", ERROR_INVALID_RUBRIC, MAX_URI_LENGTH)
        self._check_str(description_hash, "description hash", ERROR_INVALID_RUBRIC, MAX_HASH_LENGTH)
        self._check_str(criteria_hash, "criteria hash", ERROR_INVALID_RUBRIC, MAX_HASH_LENGTH)
        if minimum_score >= maximum_score:
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: minimum_score must be less than maximum_score")
        if passing_threshold < minimum_score or passing_threshold > maximum_score:
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: passing_threshold must be between minimum and maximum scores")
        if required_evaluator_count == 0:
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: required_evaluator_count must be at least 1")
        if criteria_count == 0:
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: criteria_count must be at least 1")
        self._validate_evaluation_type(evaluation_type)

    def _build_rubric_id(self, name: str, sequence: u256) -> str:
        return f"ace-rubric-{sequence}-{name.strip().lower().replace(' ', '-')}"

    def _validate_profile_input(self, display_name: str, profile_uri: str, profile_hash: str, capabilities_hash: str) -> None:
        self._check_str(display_name, "display_name", ERROR_INVALID_PROFILE, MAX_TITLE_LENGTH)
        self._check_str(profile_uri, "profile_uri", ERROR_INVALID_PROFILE, MAX_URI_LENGTH)
        self._check_str(profile_hash, "profile_hash", ERROR_INVALID_PROFILE, MAX_HASH_LENGTH)
        self._check_str(capabilities_hash, "capabilities_hash", ERROR_INVALID_PROFILE, MAX_HASH_LENGTH)

    def _build_profile_id(self, owner: Address, sequence: u256) -> str:
        return f"ace-profile-{sequence}-{str(owner)}"

    def _build_submission_id(self, requester: Address, title: str) -> str:
        return f"ace-submission-{self.submission_count + 1}-{str(requester)}-{title.strip().lower().replace(' ', '-')}"

    def _build_report_id(self, submission_id: str, evaluator: Address) -> str:
        return f"ace-report-{self.report_count + 1}-{submission_id.strip()}-{str(evaluator)}"

    def _append_report_to_submission(self, submission_id: str, report_id: str) -> None:
        norm_sub_id = submission_id.strip()
        norm_rep_id = report_id.strip()
        report_ids = json.loads(self.reports_by_submission[norm_sub_id]) if norm_sub_id in self.reports_by_submission else []
        report_ids.append(norm_rep_id)
        self.reports_by_submission[norm_sub_id] = self._canonical_json(report_ids)

    def _build_consensus_id(self, submission_id: str) -> str:
        return f"ace-consensus-{submission_id.strip()}"

    def _eval_schema_props(self) -> dict:
        p = {k: {"type": "string"} for k in ("schemaVersion", "submissionId", "rubricId", "validatorId", "evaluationType", "overallRecommendation", "summary", "responseHash")}
        p["overallConfidence"] = {"type": "integer", "minimum": 0, "maximum": 10000}
        p["criterionScores"] = {"type": "array", "items": {"type": "object", "required": ["criterionId", "score", "confidence", "rationale"], "properties": {"criterionId": {"type": "string"}, "score": {"type": "number", "minimum": 0}, "confidence": {"type": "integer", "minimum": 0, "maximum": 10000}, "rationale": {"type": "string"}, "evidenceRefs": {"type": "array", "items": {"type": "string"}}, "flags": {"type": "array", "items": {"type": "string"}}}}}
        p["limitations"] = {"type": "array", "items": {"type": "string"}}
        p["fairnessChecklist"] = p["modelMetadata"] = {"type": "object"}
        return {"type": "object", "required": ["schemaVersion", "submissionId", "rubricId", "validatorId", "evaluationType", "criterionScores", "overallRecommendation", "overallConfidence", "summary", "limitations", "fairnessChecklist", "modelMetadata"], "properties": p}

    def _prepare_evaluation_payload(self, submission_id: str) -> dict:
        norm_id = self._require_submission_exists(submission_id)
        sub = self.submissions[norm_id]
        rubric = self.rubrics[self._require_rubric_exists(sub.rubric_id)]
        prof = self.profiles[self._require_profile_exists(sub.evaluation_profile_id)] if sub.evaluation_profile_id.strip() else None
        return {
            "payloadType": "evaluation", "schemaVersion": self.schema_version,
            "submissionMetadata": {"submissionId": sub.submission_id, "title": sub.title, "evaluationType": sub.evaluation_type, "status": sub.status, "requester": str(sub.requester), "createdAt": sub.created_at},
            "evidenceBundle": {"artifactUri": sub.artifact_uri, "artifactHash": sub.artifact_hash, "metadataUri": sub.metadata_uri, "abstractCommitment": sub.abstract_commitment},
            "evaluationProfile": None if prof is None else {"profileId": prof.profile_id, "profileUri": prof.profile_uri, "profileHash": prof.profile_hash, "capabilitiesHash": prof.capabilities_hash},
            "rubric": {"rubricId": rubric.rubric_id, "schemaVersion": rubric.schema_version, "evaluationType": rubric.evaluation_type, "criteriaHash": rubric.criteria_hash, "criteriaCount": rubric.criteria_count, "criteriaSourceUri": rubric.description_uri, "minimumScore": rubric.minimum_score, "maximumScore": rubric.maximum_score, "passingThreshold": rubric.passing_threshold, "requiredEvaluatorCount": rubric.required_evaluator_count},
            "immutableHashes": {"artifactHash": sub.artifact_hash, "metadataHash": sub.metadata_hash, "abstractCommitment": sub.abstract_commitment, "rubricDescriptionHash": rubric.description_hash, "criteriaHash": rubric.criteria_hash},
            "expectedJsonSchema": self._eval_schema_props()
        }

    def _retrieve_verified_source(self, uri: str, expected_hash: str, label: str) -> str:
        if not uri or not isinstance(uri, str) or not uri.strip():
            raise gl.vm.UserError(f"{ERROR_DOCUMENT_RETRIEVAL}: {label} URI is required")
        norm_hash = self._sha256_hex(expected_hash)
        try:
            response = gl.nondet.web.get(uri.strip())
        except Exception:
            raise gl.vm.UserError(f"{ERROR_DOCUMENT_RETRIEVAL}: {label}")
        if getattr(response, "status", 0) != 200:
            raise gl.vm.UserError(f"{ERROR_DOCUMENT_RETRIEVAL}: {label} status {getattr(response, 'status', 0)}")
        body = getattr(response, "body", b"")
        if isinstance(body, str):
            body_bytes = body.encode("utf-8")
            body_str = body
        elif isinstance(body, bytes):
            body_bytes = body
            try:
                body_str = body.decode("utf-8")
            except Exception:
                raise gl.vm.UserError(f"{ERROR_DOCUMENT_RETRIEVAL}: {label} is not UTF-8")
        else:
            raise gl.vm.UserError(f"{ERROR_DOCUMENT_RETRIEVAL}: {label} has no body")
        if len(body_bytes) == 0:
            raise gl.vm.UserError(f"{ERROR_DOCUMENT_RETRIEVAL}: {label} has no body")
        if norm_hash != hashlib.sha256(body_bytes).hexdigest():
            raise gl.vm.UserError(f"{ERROR_DOCUMENT_HASH_MISMATCH}: {label}")
        return body_str

    def _sha256_hex(self, value: str) -> str:
        normalized = value.strip().lower()
        if normalized.startswith("sha256:"):
            normalized = normalized[7:]
        if len(normalized) != 64 or any(c not in "0123456789abcdef" for c in normalized):
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: expected SHA-256 hash")
        return normalized

    def _with_verified_sources(self, payload: dict) -> dict:
        # JSON round-tripping prevents a verified artifact from leaking into a
        # later execution context and makes the prompt input immutable for all
        # five evaluators in this execution.
        verified = json.loads(self._canonical_json(payload))
        verified["evidenceBundle"]["artifact"] = self._retrieve_verified_source(
            verified["evidenceBundle"]["artifactUri"],
            verified["evidenceBundle"]["artifactHash"],
            "artifact",
        )
        verified["rubric"]["criteria"] = self._retrieve_verified_source(
            verified["rubric"]["criteriaSourceUri"],
            verified["rubric"]["criteriaHash"],
            "rubric criteria",
        )
        return verified

    def _validate_ai_response(self, response: dict) -> bool:
        if not isinstance(response, dict):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: response must be an object")
        str_keys = ("schemaVersion", "submissionId", "rubricId", "validatorId", "evaluationType", "overallRecommendation", "summary")
        self._req_fields(response, str_keys + ("criterionScores", "limitations", "fairnessChecklist", "modelMetadata"), ERROR_INVALID_REPORT)
        for k in str_keys:
            if not isinstance(response[k], str) or not response[k].strip():
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid {k}")
        if response["schemaVersion"].strip() != self.schema_version:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: unsupported schemaVersion")
        if not isinstance(response["criterionScores"], list):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: criterionScores must be an array")
        if not isinstance(response["limitations"], list) or any(not isinstance(lim, str) for lim in response["limitations"]):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: limitations must be an array")
        self._req_num(response["overallConfidence"], 0, 10000, ERROR_INVALID_REPORT, "overallConfidence")
        if not isinstance(response["fairnessChecklist"], dict) or not isinstance(response["modelMetadata"], dict):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid metadata objects")
        for item in response["criterionScores"]:
            if not isinstance(item, dict):
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterion score")
            self._req_fields(item, ("criterionId", "score", "confidence", "rationale"), ERROR_INVALID_REPORT)
            if not isinstance(item["criterionId"], str) or not item["criterionId"].strip():
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterionId")
            if isinstance(item["score"], bool) or not isinstance(item["score"], (int, float)) or item["score"] < 0:
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterion score")
            self._req_num(item["confidence"], 0, 10000, ERROR_INVALID_REPORT, "criterion confidence")
            if not isinstance(item["rationale"], str):
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterion rationale")
            for arr_field, err_msg in (("evidenceRefs", "evidence reference"), ("flags", "flag")):
                if arr_field in item:
                    if not isinstance(item[arr_field], list) or any(not isinstance(x, str) or not x.strip() for x in item[arr_field]):
                        raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid {err_msg if err_msg == 'evidence reference' else arr_field}")
        if "responseHash" in response and (not isinstance(response["responseHash"], str) or not response["responseHash"].strip() or len(response["responseHash"].strip()) > MAX_HASH_LENGTH):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid responseHash")
        return True

    def _normalize_ai_response(self, response: dict) -> dict:
        self._validate_ai_response(response)
        norm = {
            "schemaVersion": response["schemaVersion"].strip(), "submissionId": response["submissionId"].strip(),
            "rubricId": response["rubricId"].strip(), "validatorId": response["validatorId"].strip(),
            "evaluationType": response["evaluationType"].strip(), "criterionScores": [],
            "overallRecommendation": response["overallRecommendation"].strip(),
            "overallConfidence": int(round(response["overallConfidence"])),
            "summary": response["summary"].strip(), "limitations": [x.strip() for x in response["limitations"]],
            "fairnessChecklist": response["fairnessChecklist"], "modelMetadata": response["modelMetadata"]
        }
        for criterion in response["criterionScores"]:
            item = {
                "criterionId": criterion["criterionId"].strip(), "score": criterion["score"],
                "confidence": int(round(criterion["confidence"])), "rationale": criterion["rationale"].strip()
            }
            if "evidenceRefs" in criterion:
                item["evidenceRefs"] = [v.strip() for v in criterion["evidenceRefs"]]
            if "flags" in criterion:
                item["flags"] = [v.strip() for v in criterion["flags"]]
            norm["criterionScores"].append(item)
        if "responseHash" in response:
            norm["responseHash"] = response["responseHash"].strip()
        return norm

    def _prepare_consensus_payload(self, submission_id: str) -> dict:
        norm_id = self._require_submission_exists(submission_id)
        sub = self.submissions[norm_id]
        report_ids = json.loads(self.reports_by_submission[norm_id]) if norm_id in self.reports_by_submission else []
        payload = self._prepare_evaluation_payload(norm_id)
        payload["payloadType"] = "consensus"
        payload["reportIds"] = report_ids
        payload["reportCommitments"] = [{
            "reportId": r.report_id, "criterionScoresHash": r.criterion_scores_hash, "totalScore": r.total_score,
            "recommendation": r.recommendation, "confidenceBasisPoints": r.confidence_basis_points,
            "summaryHash": r.summary_hash, "modelMetadataHash": r.model_metadata_hash,
            "conflictDisclosuresHash": r.conflict_disclosures_hash
        } for r in [self.reports[rid] for rid in report_ids]]
        payload["expectedJsonSchema"] = {
            "type": "object", "required": ("submissionId", "rubricId", "reportIds", "decision", "confidence", "summary", "methodId"),
            "properties": {
                "submissionId": {"type": "string"}, "rubricId": {"type": "string"}, "reportIds": {"type": "array"},
                "decision": {"type": "string"}, "confidence": {"type": "integer", "minimum": 0, "maximum": 10000},
                "summary": {"type": "string"}, "methodId": {"type": "string"}
            }
        }
        return payload

    def _build_evaluation_prompt(self, payload: dict, evaluator_index: u256) -> str:
        artifact_content = payload["evidenceBundle"]["artifact"]
        rubric_content = payload["rubric"]["criteria"]
        schema_json = self._canonical_json(payload["expectedJsonSchema"])
        return (
            "ACE_EVALUATION\n"
            f"Evaluator ordinal: {evaluator_index + 1}\n\n"
            "[SECTION A: VERIFIED SUBMITTED WORK]\n"
            f"{artifact_content}\n\n"
            "[SECTION B: COMPLETE VERIFIED RUBRIC]\n"
            f"{rubric_content}\n\n"
            "[SECTION C: EVALUATION INSTRUCTIONS]\n"
            "Act as an independent academic evaluator. Score the submitted academic work strictly against the complete verified rubric criteria.\n"
            "Evaluate every criterion and provide substantive rationale with specific evidence references.\n"
            "Disclose all limitations. Exclude irrelevant status signals (institution, author identity, geography, writing fluency) unless the rubric explicitly requires them.\n\n"
            "[SECTION D: REQUIRED STRUCTURED EVALUATION FORMAT]\n"
            "Return exactly one valid JSON object matching the expected JSON schema below with no surrounding prose or markdown formatting.\n"
            f"Use the requested evaluator ordinal in validatorId (e.g. 'ace-validator-{evaluator_index + 1}').\n"
            "All confidence fields must be integer basis points between 0 and 10000.\n\n"
            f"Expected JSON Schema:\n{schema_json}\n\n"
            f"Frozen context: {self._canonical_json(payload)}"
        )

    def _build_consensus_prompt(self, payload: dict) -> str:
        return f"ACE_CONSENSUS\nDerive one academic consensus result from the accepted report commitments below. Return only JSON with submissionId, rubricId, reportIds, decision, confidence, summary, and methodId. Decision must be one of accepted, revision_required, rejected, inconclusive, or manual_review_required. Confidence must be an integer from 0 to 10000. Explain material agreement and disagreement in summary.\nConsensus context: {self._canonical_json(payload)}"

    def _validate_ai_response_context(self, response: dict, payload: dict) -> None:
        meta = payload["submissionMetadata"]
        rubric = payload["rubric"]
        if response["submissionId"] != meta["submissionId"]:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: submissionId does not match context")
        if response["rubricId"] != rubric["rubricId"]:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: rubricId does not match context")
        if response["evaluationType"] != meta["evaluationType"]:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: evaluationType does not match context")
        if len(response["criterionScores"]) != rubric["criteriaCount"]:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: criterion count does not match rubric")
        cids = []
        for c in response["criterionScores"]:
            cid = c["criterionId"]
            if cid in cids:
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: duplicate criterionId")
            cids.append(cid)
        tot = self._response_total_score(response)
        if tot < rubric["minimumScore"] or tot > rubric["maximumScore"]:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: total score is outside rubric bounds")

    def _validate_evaluation_batch(self, responses: list, payload: dict) -> None:
        if not isinstance(responses, list) or len(responses) != CONSENSUS_EVALUATOR_COUNT:
            raise gl.vm.UserError(f"{ERROR_AI_CONSENSUS}: evaluator count must be exactly five")
        vids = []
        for resp in responses:
            self._validate_ai_response(resp)
            self._validate_ai_response_context(resp, payload)
            vid = resp["validatorId"]
            if vid in vids:
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: duplicate validatorId")
            vids.append(vid)

    def _evaluation_batches_agree(self, leader_responses: list, validator_responses: list, payload: dict) -> bool:
        self._validate_evaluation_batch(leader_responses, payload)
        self._validate_evaluation_batch(validator_responses, payload)
        max_score = payload["rubric"]["maximumScore"]
        score_tol = max(1, max_score // 10)
        for i in range(len(leader_responses)):
            l = leader_responses[i]
            v = validator_responses[i]
            if l["overallRecommendation"] != v["overallRecommendation"]:
                return False
            if abs(self._response_total_score(l) - self._response_total_score(v)) > score_tol:
                return False
            l_conf = self._confidence_to_basis_points(l["overallConfidence"])
            v_conf = self._confidence_to_basis_points(v["overallConfidence"])
            if abs(l_conf - v_conf) > 1500:
                return False
        return True

    def _normalize_consensus_ai_response(self, response: dict, payload: dict) -> dict:
        if not isinstance(response, dict):
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: response must be an object")
        self._req_fields(response, ("submissionId", "rubricId", "reportIds", "decision", "confidence", "summary", "methodId"), ERROR_INVALID_CONSENSUS)
        if response["submissionId"] != payload["submissionMetadata"]["submissionId"]:
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: submissionId does not match context")
        if response["rubricId"] != payload["rubric"]["rubricId"]:
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: rubricId does not match context")
        if not isinstance(response["reportIds"], list):
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: reportIds must be an array")
        expected_report_ids = [r for r in payload["reportIds"]]
        norm_report_ids = []
        for r in response["reportIds"]:
            if not isinstance(r, str) or not r.strip():
                raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: invalid report ID")
            norm_report_ids.append(r.strip())
        if norm_report_ids != expected_report_ids:
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: reportIds do not match context")
        dec = response["decision"]
        allowed_decisions = ("accepted", "revision_required", "rejected", "inconclusive", "manual_review_required")
        if not isinstance(dec, str) or dec.strip() not in allowed_decisions:
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: unsupported decision")
        self._req_num(response["confidence"], 0, 10000, ERROR_INVALID_CONSENSUS, "confidence")
        for k in ("summary", "methodId"):
            if not isinstance(response[k], str) or not response[k].strip():
                raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: invalid {k}")
        return {
            "submissionId": response["submissionId"].strip(), "rubricId": response["rubricId"].strip(),
            "reportIds": norm_report_ids, "decision": dec.strip(),
            "confidenceBasisPoints": self._confidence_to_basis_points(response["confidence"]),
            "summary": response["summary"].strip(), "methodId": response["methodId"].strip()
        }

    def _consensus_responses_agree(self, leader: dict, validator: dict) -> bool:
        if leader["reportIds"] != validator["reportIds"]: return False
        if leader["decision"] != validator["decision"]: return False
        if leader["methodId"] != validator["methodId"]: return False
        return abs(leader["confidenceBasisPoints"] - validator["confidenceBasisPoints"]) <= 1000

    def _store_ai_evaluation_report(self, submission_id: str, profile_id: str, response: dict) -> str:
        seq = self.report_count + 1
        rep_id = self._build_report_id(submission_id, gl.message.sender_address)
        sum_hash = self._hash_text(response["summary"])
        self.reports[rep_id] = EvaluationReport(rep_id, self.schema_version, submission_id, response["rubricId"], gl.message.sender_address, profile_id, self._hash_json(response["criterionScores"]), self._response_total_score(response), response["overallRecommendation"], self._confidence_to_basis_points(response["overallConfidence"]), "", sum_hash, "", self._hash_json(response["modelMetadata"]), self._hash_json(response["limitations"]), "accepted", str(seq), 0, "")
        self.report_ids.append(rep_id)
        self.report_count = seq
        self._append_report_to_submission(submission_id, rep_id)
        return rep_id

    def _store_ai_consensus_result(self, submission_id: str, profile_id: str, report_ids: list, response: dict) -> str:
        res_id = self._build_consensus_id(submission_id)
        seq = self.consensus_result_count + 1
        sum_hash = self._hash_text(response["summary"])
        self.consensus_results[res_id] = ConsensusResult(res_id, self.schema_version, submission_id, response["rubricId"], profile_id, self._hash_json(response["reportIds"]), response["decision"], response["confidenceBasisPoints"], sum_hash, response["methodId"], "finalized", str(seq), str(seq))
        self.consensus_result_ids.append(res_id)
        self.consensus_result_by_submission[submission_id] = res_id
        self.consensus_result_count = seq
        for rid in report_ids:
            rep = self.reports[rid]
            rep.consensus_confidence_basis_points = response["confidenceBasisPoints"]
            rep.consensus_summary_hash = sum_hash
            self.reports[rid] = rep
        return res_id

    def _response_total_score(self, response: dict) -> u256:
        return sum(int(round(c["score"])) for c in response["criterionScores"])

    def _confidence_to_basis_points(self, confidence) -> u256:
        return confidence if isinstance(confidence, int) else int(round(confidence * 10000))

    def _canonical_json(self, value) -> str:
        return json.dumps(value, sort_keys=True, separators=(",", ":"))

    def _hash_json(self, value) -> str:
        return self._hash_text(self._canonical_json(value))

    def _hash_text(self, value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()
