# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Academic Consensus Engine GenLayer contract scaffold.

This module defines the initial contract shape for the Academic Consensus
Engine (ACE), a GenLayer protocol for decentralized AI-assisted academic
evaluation.

The implementation is intentionally minimal. It declares protocol constants,
enumerations, storage-compatible data models, contract storage, constructor
state, and public/internal method signatures. It does not implement AI
consensus, grading logic, rubric scoring, validator comparison, or lifecycle
business rules.

Future implementation work should preserve the storage layout order where
possible and append new storage fields at the end for upgrade compatibility.
"""

from dataclasses import dataclass
from enum import Enum
import hashlib
import json

from genlayer import *


PROTOCOL_NAME: str = "Academic Consensus Engine"
PROTOCOL_SYMBOL: str = "ACE"
PROTOCOL_VERSION: str = "0.1.0"
SCHEMA_VERSION: str = "0.1.0"

ERROR_NOT_IMPLEMENTED: str = "[EXPECTED] ACE method not implemented yet"
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
ERROR_DUPLICATE_REPORT: str = "[EXPECTED] Duplicate report"
ERROR_INVALID_REPORT: str = "[EXPECTED] Invalid report input"
ERROR_CONSENSUS_NOT_FOUND: str = "[EXPECTED] Consensus result not found"
ERROR_DUPLICATE_CONSENSUS: str = "[EXPECTED] Duplicate consensus result"
ERROR_INVALID_CONSENSUS: str = "[EXPECTED] Invalid consensus result input"
ERROR_INVALID_SUBMISSION_TRANSITION: str = "[EXPECTED] Invalid submission state transition"
ERROR_AI_CONSENSUS: str = "[LLM_ERROR] AI consensus failed"

MAX_TITLE_LENGTH: int = 256
MAX_URI_LENGTH: int = 2048
MAX_HASH_LENGTH: int = 128
DEFAULT_PAGE_LIMIT: int = 50


class EvaluationStatus(str, Enum):
    """Lifecycle states for an ACE academic evaluation."""

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
    """Supported education-focused evaluation categories."""

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
    """A single rubric dimension used to evaluate a submission.

    Enum values should be stored as strings in persistent state. Numeric scores
    use integer ranges so future grading logic can avoid floating-point
    ambiguity in deterministic paths.
    """

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
    """A versioned collection of criteria and evaluation policy metadata."""

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
    """A research artifact or academic claim submitted for evaluation."""

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
class CriterionScore:
    """An evaluator's score commitment for a single criterion."""

    criterion_score_id: str
    report_id: str
    criterion_id: str
    score: u256
    normalized_score_basis_points: u256
    rationale_uri: str
    rationale_hash: str
    evidence_hash: str
    confidence_basis_points: u256
    flags_hash: str


@allow_storage
@dataclass
class EvaluationReport:
    """A committed evaluator report for one submission and rubric."""

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
    """Evaluator profile metadata used for future authorization and audit."""

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
    """Protocol-level consensus commitment for a submission.

    This model is intentionally a storage scaffold only. Future milestones will
    define how validator reports are compared, how confidence is derived, and
    how final decisions are produced.
    """

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
    """GenLayer contract scaffold for ACE academic evaluation coordination.

    The contract currently declares storage and interface boundaries only.
    Future versions will add lifecycle validation, AI consensus, report
    aggregation, challenge handling, and finalization logic.
    """

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
        """Initialize protocol metadata and ownership.

        Collection storage fields are declared at class level and start empty
        under the GenLayer storage model. Future initialization parameters
        should be added carefully to avoid unnecessary deployment coupling.
        """

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
    def submit_for_evaluation(
        self,
        title: str,
        abstract_commitment: str,
        artifact_uri: str,
        artifact_hash: str,
        rubric_id: str,
        evaluation_type: str,
        metadata_uri: str,
        metadata_hash: str,
    ) -> str:
        """Register a submission for future academic evaluation.

        TODO: Add submission validation, identifier generation, storage writes,
        lifecycle events, rubric compatibility checks, and future support for
        student, institution, course, and evaluation profile metadata.
        """

        self._validate_submission_input(
            title=title,
            abstract_commitment=abstract_commitment,
            artifact_uri=artifact_uri,
            artifact_hash=artifact_hash,
            rubric_id=rubric_id,
            evaluation_type=evaluation_type,
        )

        submission_id = self._build_submission_id(
            requester=gl.message.sender_address,
            title=title,
        )

        if submission_id in self.submissions:
            raise gl.vm.UserError(f"{ERROR_DUPLICATE_SUBMISSION}: {submission_id}")

        sequence = self.submission_count + 1
        lifecycle_marker = str(sequence)
        self.submissions[submission_id] = Submission(
            submission_id=submission_id,
            schema_version=self.schema_version,
            requester=gl.message.sender_address,
            title=title.strip(),
            abstract_commitment=abstract_commitment.strip(),
            artifact_uri=artifact_uri.strip(),
            artifact_hash=artifact_hash.strip(),
            metadata_uri=metadata_uri.strip(),
            metadata_hash=metadata_hash.strip(),
            rubric_id=rubric_id.strip(),
            evaluation_type=evaluation_type.strip(),
            status=EvaluationStatus.REGISTERED.value,
            created_at=lifecycle_marker,
            updated_at=lifecycle_marker,
            review_window_ends_at="",
            challenge_window_ends_at="",
            student_id="",
            institution_id="",
            course_id="",
            evaluation_profile_id="",
        )
        self.submission_ids.append(submission_id)
        self.submission_count = sequence

        return submission_id

    @gl.public.view
    def get_submission(self, submission_id: str) -> Submission:
        """Return a registered submission by identifier.

        Raises gl.vm.UserError if submission_id is invalid or not found in storage.
        """
        self._require_submission_exists(submission_id)
        return self.submissions[submission_id]

    @gl.public.view
    def list_submissions(self, offset: u256, limit: u256) -> DynArray[Submission]:
        """Return a paginated list of registered submissions in order of registration.

        Arguments:
            offset: The starting index in the submission_ids list.
            limit: The maximum number of submissions to return. If limit is 0,
                DEFAULT_PAGE_LIMIT (50) is used.

        Returns:
            A DynArray of Submission objects starting from offset up to limit items.
        """
        total = len(self.submission_ids)
        if offset >= total:
            return []

        effective_limit = limit if limit > 0 else DEFAULT_PAGE_LIMIT
        end_idx = min(offset + effective_limit, total)

        result: DynArray[Submission] = []
        for i in range(offset, end_idx):
            sub_id = self.submission_ids[i]
            result.append(self.submissions[sub_id])

        return result

    @gl.public.write
    def freeze_submission(self, submission_id: str) -> None:
        """Freeze a registered submission before review begins."""
        self._transition_submission_state(
            submission_id=submission_id,
            target_status=EvaluationStatus.FROZEN.value,
        )

    @gl.public.write
    def mark_under_review(self, submission_id: str) -> None:
        """Move a frozen submission into the review stage."""
        self._transition_submission_state(
            submission_id=submission_id,
            target_status=EvaluationStatus.UNDER_REVIEW.value,
        )

    @gl.public.write
    def finalize_submission(self, submission_id: str) -> None:
        """Advance an under-review or consensus-ready submission by one state.

        This records lifecycle state only. It performs no consensus calculation.
        Calling it from under review records consensus readiness; calling it
        again from consensus ready records finalization.
        """
        normalized_submission_id = submission_id.strip()
        self._require_submission_exists(normalized_submission_id)

        current_status = self.submissions[normalized_submission_id].status
        target_status = EvaluationStatus.FINALIZED.value
        if current_status == EvaluationStatus.UNDER_REVIEW.value:
            target_status = EvaluationStatus.CONSENSUS_READY.value

        self._transition_submission_state(
            submission_id=normalized_submission_id,
            target_status=target_status,
        )

    @gl.public.write
    def create_rubric(
        self,
        name: str,
        description_uri: str,
        description_hash: str,
        evaluation_type: str,
        criteria_hash: str,
        minimum_score: u256,
        maximum_score: u256,
        passing_threshold: u256,
        required_evaluator_count: u256,
        allow_open_review: bool,
        criteria_count: u256,
        supersedes_rubric_id: str = "",
    ) -> str:
        """Create a versioned evaluation rubric.

        Validates inputs, derives a deterministic rubric_id, writes the Rubric
        dataclass to contract storage, and returns the generated rubric_id.
        """
        self._validate_rubric_input(
            name=name,
            description_uri=description_uri,
            description_hash=description_hash,
            evaluation_type=evaluation_type,
            criteria_hash=criteria_hash,
            minimum_score=minimum_score,
            maximum_score=maximum_score,
            passing_threshold=passing_threshold,
            required_evaluator_count=required_evaluator_count,
            criteria_count=criteria_count,
        )

        sequence = self.rubric_count + 1
        lifecycle_marker = str(sequence)
        rubric_id = self._build_rubric_id(name=name, sequence=sequence)

        if rubric_id in self.rubrics:
            raise gl.vm.UserError(f"{ERROR_DUPLICATE_RUBRIC}: {rubric_id}")

        self.rubrics[rubric_id] = Rubric(
            rubric_id=rubric_id,
            schema_version=self.schema_version,
            name=name.strip(),
            description_uri=description_uri.strip(),
            description_hash=description_hash.strip(),
            evaluation_type=evaluation_type.strip(),
            criteria_hash=criteria_hash.strip(),
            minimum_score=minimum_score,
            maximum_score=maximum_score,
            passing_threshold=passing_threshold,
            required_evaluator_count=required_evaluator_count,
            allow_open_review=allow_open_review,
            status="active",
            created_at=lifecycle_marker,
            supersedes_rubric_id=supersedes_rubric_id.strip(),
            criteria_count=criteria_count,
        )
        self.rubric_ids.append(rubric_id)
        self.rubric_count = sequence

        return rubric_id

    @gl.public.write
    def register_rubric(
        self,
        name: str,
        description_uri: str,
        description_hash: str,
        evaluation_type: str,
        criteria_hash: str,
        minimum_score: u256,
        maximum_score: u256,
        passing_threshold: u256,
        required_evaluator_count: u256,
        allow_open_review: bool,
        criteria_count: u256,
        supersedes_rubric_id: str = "",
    ) -> str:
        """Register a versioned evaluation rubric (alias for create_rubric)."""
        return self.create_rubric(
            name=name,
            description_uri=description_uri,
            description_hash=description_hash,
            evaluation_type=evaluation_type,
            criteria_hash=criteria_hash,
            minimum_score=minimum_score,
            maximum_score=maximum_score,
            passing_threshold=passing_threshold,
            required_evaluator_count=required_evaluator_count,
            allow_open_review=allow_open_review,
            criteria_count=criteria_count,
            supersedes_rubric_id=supersedes_rubric_id,
        )

    @gl.public.view
    def get_rubric(self, rubric_id: str) -> Rubric:
        """Return a registered rubric by identifier.

        Raises gl.vm.UserError if rubric_id is invalid or not found in storage.
        """
        self._require_rubric_exists(rubric_id)
        return self.rubrics[rubric_id]

    @gl.public.view
    def list_rubrics(self, offset: u256, limit: u256) -> DynArray[Rubric]:
        """Return a paginated list of registered rubrics in order of registration.

        Arguments:
            offset: The starting index in the rubric_ids list.
            limit: The maximum number of rubrics to return. If limit is 0,
                DEFAULT_PAGE_LIMIT (50) is used.

        Returns:
            A DynArray of Rubric objects starting from offset up to limit items.
        """
        total = len(self.rubric_ids)
        if offset >= total:
            return []

        effective_limit = limit if limit > 0 else DEFAULT_PAGE_LIMIT
        end_idx = min(offset + effective_limit, total)

        result: DynArray[Rubric] = []
        for i in range(offset, end_idx):
            rid = self.rubric_ids[i]
            result.append(self.rubrics[rid])

        return result

    @gl.public.write
    def create_profile(
        self,
        display_name: str,
        profile_uri: str,
        profile_hash: str,
        capabilities_hash: str,
    ) -> str:
        """Create an evaluator profile for authorization and auditing.

        Validates inputs, derives a deterministic profile_id bound to the sender,
        writes the EvaluationProfile dataclass to contract storage, and returns
        the profile_id.
        """
        self._validate_profile_input(
            display_name=display_name,
            profile_uri=profile_uri,
            profile_hash=profile_hash,
            capabilities_hash=capabilities_hash,
        )

        owner = gl.message.sender_address
        sequence = self.profile_count + 1
        lifecycle_marker = str(sequence)
        profile_id = self._build_profile_id(owner=owner, sequence=sequence)

        if profile_id in self.profiles:
            raise gl.vm.UserError(f"{ERROR_DUPLICATE_PROFILE}: {profile_id}")

        self.profiles[profile_id] = EvaluationProfile(
            profile_id=profile_id,
            owner=owner,
            display_name=display_name.strip(),
            profile_uri=profile_uri.strip(),
            profile_hash=profile_hash.strip(),
            capabilities_hash=capabilities_hash.strip(),
            reputation_basis_points=0,
            status="active",
            created_at=lifecycle_marker,
            updated_at=lifecycle_marker,
        )
        self.profile_ids.append(profile_id)
        owner_key = str(owner if isinstance(owner, Address) else Address(owner))
        self.latest_profile_id_by_owner[owner_key] = profile_id
        self.profile_count = sequence

        return profile_id

    @gl.public.view
    def get_profile(self, profile_id: str) -> EvaluationProfile:
        """Return an evaluator profile by identifier.

        Raises gl.vm.UserError if profile_id is invalid or not found in storage.
        """
        self._require_profile_exists(profile_id)
        return self.profiles[profile_id]

    @gl.public.view
    def get_latest_profile_id(self, owner: Address) -> str:
        """Return the most recently created evaluator profile ID for an owner."""
        owner_key = str(owner if isinstance(owner, Address) else Address(owner))
        if owner_key not in self.latest_profile_id_by_owner:
            return ""
        return self.latest_profile_id_by_owner[owner_key]

    @gl.public.write
    def create_evaluation_report(
        self,
        submission_id: str,
        profile_id: str,
        criterion_scores_hash: str,
        total_score: u256,
        recommendation: str,
        confidence_basis_points: u256,
        summary_uri: str,
        summary_hash: str,
        model_metadata_uri: str,
        model_metadata_hash: str,
        conflict_disclosures_hash: str,
    ) -> str:
        """Create an evaluator report commitment for a submission.

        Validates inputs and existence of referenced submission and profile,
        derives a deterministic report_id, stores the EvaluationReport, and
        associates the report with the submission in report_ids_by_submission.
        """
        self._require_submission_exists(submission_id)
        self._require_profile_exists(profile_id)

        self._validate_report_input(
            submission_id=submission_id,
            profile_id=profile_id,
            criterion_scores_hash=criterion_scores_hash,
            recommendation=recommendation,
            confidence_basis_points=confidence_basis_points,
        )

        evaluator = gl.message.sender_address
        sequence = self.report_count + 1
        lifecycle_marker = str(sequence)
        report_id = self._build_report_id(
            submission_id=submission_id,
            evaluator=evaluator,
        )

        if report_id in self.reports:
            raise gl.vm.UserError(f"{ERROR_DUPLICATE_REPORT}: {report_id}")

        submission = self.submissions[submission_id]
        rubric_id = submission.rubric_id

        self.reports[report_id] = EvaluationReport(
            report_id=report_id,
            schema_version=self.schema_version,
            submission_id=submission_id.strip(),
            rubric_id=rubric_id,
            evaluator=evaluator,
            profile_id=profile_id.strip(),
            criterion_scores_hash=criterion_scores_hash.strip(),
            total_score=total_score,
            recommendation=recommendation.strip(),
            confidence_basis_points=confidence_basis_points,
            summary_uri=summary_uri.strip(),
            summary_hash=summary_hash.strip(),
            model_metadata_uri=model_metadata_uri.strip(),
            model_metadata_hash=model_metadata_hash.strip(),
            conflict_disclosures_hash=conflict_disclosures_hash.strip(),
            status="submitted",
            submitted_at=lifecycle_marker,
            consensus_confidence_basis_points=0,
            consensus_summary_hash="",
        )
        self.report_ids.append(report_id)
        self.report_count = sequence

        self._append_report_to_submission(submission_id.strip(), report_id)

        return report_id

    @gl.public.write
    def evaluate_submission(
        self,
        submission_id: str,
        profile_id: str,
    ) -> str:
        """Evaluate a frozen submission through GenLayer AI consensus."""
        normalized_submission_id = submission_id.strip()
        normalized_profile_id = profile_id.strip()
        self._require_submission_exists(normalized_submission_id)
        self._require_profile_exists(normalized_profile_id)

        submission = self.submissions[normalized_submission_id]
        if submission.status != EvaluationStatus.FROZEN.value:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_SUBMISSION_TRANSITION}: "
                f"{submission.status} -> {EvaluationStatus.UNDER_REVIEW.value}"
            )
        if normalized_submission_id in self.consensus_result_by_submission:
            raise gl.vm.UserError(
                f"{ERROR_DUPLICATE_CONSENSUS}: {normalized_submission_id}"
            )

        submission.evaluation_profile_id = normalized_profile_id
        self.submissions[normalized_submission_id] = submission
        evaluation_payload = self._prepare_evaluation_payload(
            normalized_submission_id
        )
        self._transition_submission_state(
            submission_id=normalized_submission_id,
            target_status=EvaluationStatus.UNDER_REVIEW.value,
        )

        def produce_evaluations() -> list:
            required_count = evaluation_payload["rubric"]["requiredEvaluatorCount"]
            responses = []
            for evaluator_index in range(required_count):
                prompt = self._build_evaluation_prompt(
                    evaluation_payload,
                    evaluator_index,
                )
                response = gl.nondet.exec_prompt(
                    prompt,
                    response_format="json",
                )
                self._validate_ai_response(response)
                normalized = self._normalize_ai_response(response)
                self._validate_ai_response_context(
                    normalized,
                    evaluation_payload,
                )
                responses.append(normalized)
            self._validate_evaluation_batch(responses, evaluation_payload)
            return responses

        def validate_evaluations(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            try:
                leader_responses = leaders_res.calldata
                self._validate_evaluation_batch(
                    leader_responses,
                    evaluation_payload,
                )
                validator_responses = produce_evaluations()
                return self._evaluation_batches_agree(
                    leader_responses,
                    validator_responses,
                    evaluation_payload,
                )
            except Exception:
                return False

        accepted_responses = gl.vm.run_nondet(
            produce_evaluations,
            validate_evaluations,
        )

        report_ids = []
        for response in accepted_responses:
            report_ids.append(
                self._store_ai_evaluation_report(
                    normalized_submission_id,
                    normalized_profile_id,
                    response,
                )
            )

        consensus_payload = self._prepare_consensus_payload(
            normalized_submission_id
        )

        def produce_consensus() -> dict:
            response = gl.nondet.exec_prompt(
                self._build_consensus_prompt(consensus_payload),
                response_format="json",
            )
            return self._normalize_consensus_ai_response(
                response,
                consensus_payload,
            )

        def validate_consensus(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            try:
                leader_calldata = leaders_res.calldata
                leader_response = self._normalize_consensus_ai_response(
                    {
                        "submissionId": leader_calldata["submissionId"],
                        "rubricId": leader_calldata["rubricId"],
                        "reportIds": leader_calldata["reportIds"],
                        "decision": leader_calldata["decision"],
                        "confidence": leader_calldata[
                            "confidenceBasisPoints"
                        ],
                        "summary": leader_calldata["summary"],
                        "methodId": leader_calldata["methodId"],
                    },
                    consensus_payload,
                )
                validator_response = produce_consensus()
                return self._consensus_responses_agree(
                    leader_response,
                    validator_response,
                )
            except Exception:
                return False

        accepted_consensus = gl.vm.run_nondet(
            produce_consensus,
            validate_consensus,
        )
        consensus_result_id = self._store_ai_consensus_result(
            normalized_submission_id,
            normalized_profile_id,
            report_ids,
            accepted_consensus,
        )

        self._transition_submission_state(
            submission_id=normalized_submission_id,
            target_status=EvaluationStatus.CONSENSUS_READY.value,
        )
        self._transition_submission_state(
            submission_id=normalized_submission_id,
            target_status=EvaluationStatus.FINALIZED.value,
        )
        return consensus_result_id

    @gl.public.view
    def get_evaluation_report(self, report_id: str) -> EvaluationReport:
        """Return a committed evaluation report by identifier.

        Raises gl.vm.UserError if report_id is invalid or not found in storage.
        """
        self._require_report_exists(report_id)
        return self.reports[report_id]

    @gl.public.view
    def list_reports(
        self,
        submission_id: str,
        offset: u256,
        limit: u256,
    ) -> list[str]:
        """Return report identifiers associated with a submission.

        Arguments:
            submission_id: The submission identifier to list reports for.
            offset: The starting index in the report list.
            limit: The maximum number of report IDs to return. If 0,
                DEFAULT_PAGE_LIMIT (50) is used.

        Returns:
            A DynArray of report_id strings starting from offset up to limit.
        """
        self._require_submission_exists(submission_id)
        norm_sub_id = submission_id.strip()

        if norm_sub_id not in self.reports_by_submission:
            return []

        sub_reports = json.loads(self.reports_by_submission[norm_sub_id])
        total = len(sub_reports)
        if offset >= total:
            return []

        effective_limit = limit if limit > 0 else DEFAULT_PAGE_LIMIT
        end_idx = min(offset + effective_limit, total)

        result = []
        for i in range(offset, end_idx):
            result.append(sub_reports[i])

        return result

    @gl.public.write
    def create_consensus_result(
        self,
        submission_id: str,
        evaluation_profile_id: str,
        report_ids: DynArray[str],
        report_ids_hash: str,
        decision: str,
        confidence_basis_points: u256,
        summary_hash: str,
        method_id: str,
        status: str,
        finalized_at: str = "",
    ) -> str:
        """Store a consensus-result commitment for one submission.

        This method only records already-produced commitments. It performs no
        AI execution, grading, aggregation, or consensus calculation.
        """
        normalized_submission_id = submission_id.strip()
        self._require_submission_exists(normalized_submission_id)

        if normalized_submission_id in self.consensus_result_by_submission:
            raise gl.vm.UserError(
                f"{ERROR_DUPLICATE_CONSENSUS}: {normalized_submission_id}"
            )

        submission = self.submissions[normalized_submission_id]
        normalized_profile_id = evaluation_profile_id.strip()
        if normalized_profile_id != "":
            self._require_profile_exists(normalized_profile_id)

        normalized_report_ids: DynArray[str] = gl.storage.inmem_allocate(DynArray[str])
        for report_id in report_ids:
            normalized_report_id = report_id.strip()
            if normalized_report_id == "":
                raise gl.vm.UserError(
                    f"{ERROR_INVALID_CONSENSUS}: report ID is required"
                )
            self._require_report_exists(normalized_report_id)
            report = self.reports[normalized_report_id]
            if report.submission_id != normalized_submission_id:
                raise gl.vm.UserError(
                    f"{ERROR_INVALID_CONSENSUS}: report belongs to another submission"
                )
            if report.rubric_id != submission.rubric_id:
                raise gl.vm.UserError(
                    f"{ERROR_INVALID_CONSENSUS}: report uses another rubric"
                )
            for existing_report_id in normalized_report_ids:
                if existing_report_id == normalized_report_id:
                    raise gl.vm.UserError(
                        f"{ERROR_INVALID_CONSENSUS}: duplicate report ID"
                    )
            normalized_report_ids.append(normalized_report_id)

        self._validate_consensus_result(
            submission_id=normalized_submission_id,
            rubric_id=submission.rubric_id,
            evaluation_profile_id=normalized_profile_id,
            report_ids_hash=report_ids_hash,
            decision=decision,
            confidence_basis_points=confidence_basis_points,
            summary_hash=summary_hash,
            method_id=method_id,
            status=status,
            finalized_at=finalized_at,
            report_ids=normalized_report_ids,
        )

        consensus_result_id = self._build_consensus_id(normalized_submission_id)
        if consensus_result_id in self.consensus_results:
            raise gl.vm.UserError(
                f"{ERROR_DUPLICATE_CONSENSUS}: {consensus_result_id}"
            )

        sequence = self.consensus_result_count + 1
        lifecycle_marker = str(sequence)
        self.consensus_results[consensus_result_id] = ConsensusResult(
            consensus_result_id=consensus_result_id,
            schema_version=self.schema_version,
            submission_id=normalized_submission_id,
            rubric_id=submission.rubric_id,
            evaluation_profile_id=normalized_profile_id,
            report_ids_hash=report_ids_hash.strip(),
            decision=decision.strip(),
            confidence_basis_points=confidence_basis_points,
            summary_hash=summary_hash.strip(),
            method_id=method_id.strip(),
            status=status.strip(),
            created_at=lifecycle_marker,
            finalized_at=finalized_at.strip(),
        )
        self.consensus_result_ids.append(consensus_result_id)
        self.consensus_result_by_submission[normalized_submission_id] = consensus_result_id
        self.consensus_result_count = sequence

        return consensus_result_id

    @gl.public.view
    def get_consensus_result(self, consensus_result_id: str) -> ConsensusResult:
        """Return a stored consensus-result commitment by identifier."""
        self._require_consensus_exists(consensus_result_id)
        return self.consensus_results[consensus_result_id.strip()]

    def _validate_submission_input(
        self,
        title: str,
        abstract_commitment: str,
        artifact_uri: str,
        artifact_hash: str,
        rubric_id: str,
        evaluation_type: str,
    ) -> None:
        """Validate submission fields before registration.

        TODO: Add deterministic field validation and rubric compatibility
        checks.
        """

        normalized_title = title.strip()
        normalized_abstract = abstract_commitment.strip()
        normalized_artifact_uri = artifact_uri.strip()
        normalized_artifact_hash = artifact_hash.strip()
        normalized_rubric_id = rubric_id.strip()
        normalized_evaluation_type = evaluation_type.strip()

        if normalized_title == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: title is required")
        if len(normalized_title) > MAX_TITLE_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: title is too long")
        if normalized_abstract == "":
            raise gl.vm.UserError(
                f"{ERROR_INVALID_INPUT}: abstract commitment is required"
            )
        if normalized_artifact_uri == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: artifact URI is required")
        if len(normalized_artifact_uri) > MAX_URI_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: artifact URI is too long")
        if normalized_artifact_hash == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: artifact hash is required")
        if len(normalized_artifact_hash) > MAX_HASH_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: artifact hash is too long")
        if normalized_rubric_id == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_INPUT}: rubric ID is required")

        self._validate_evaluation_type(normalized_evaluation_type)

    def _transition_submission_state(
        self,
        submission_id: str,
        target_status: str,
    ) -> None:
        """Apply one legal submission lifecycle transition or reject it."""
        normalized_submission_id = submission_id.strip()
        normalized_target_status = target_status.strip()
        self._require_submission_exists(normalized_submission_id)

        submission = self.submissions[normalized_submission_id]
        current_status = submission.status

        is_legal_transition = (
            current_status == EvaluationStatus.REGISTERED.value
            and normalized_target_status == EvaluationStatus.FROZEN.value
        ) or (
            current_status == EvaluationStatus.FROZEN.value
            and normalized_target_status == EvaluationStatus.UNDER_REVIEW.value
        ) or (
            current_status == EvaluationStatus.UNDER_REVIEW.value
            and normalized_target_status == EvaluationStatus.CONSENSUS_READY.value
        ) or (
            current_status == EvaluationStatus.CONSENSUS_READY.value
            and normalized_target_status == EvaluationStatus.FINALIZED.value
        )

        if not is_legal_transition:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_SUBMISSION_TRANSITION}: "
                f"{current_status} -> {normalized_target_status}"
            )

        submission.status = normalized_target_status
        self.submissions[normalized_submission_id] = submission

    def _validate_evaluation_type(self, evaluation_type: str) -> None:
        """Validate that an evaluation type is supported by the protocol.

        TODO: Add enum value checks and future policy extension handling.
        """

        normalized_type = evaluation_type.strip()
        if normalized_type == "":
            raise gl.vm.UserError(
                f"{ERROR_INVALID_INPUT}: evaluation type is required"
            )

        allowed_types = (
            EvaluationType.ESSAY.value,
            EvaluationType.RESEARCH_PAPER.value,
            EvaluationType.SHORT_ANSWER.value,
            EvaluationType.LAB_REPORT.value,
            EvaluationType.PROJECT_REPORT.value,
            EvaluationType.CODE_ASSIGNMENT.value,
            EvaluationType.PRESENTATION.value,
            EvaluationType.CUSTOM.value,
        )
        if normalized_type not in allowed_types:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_INPUT}: unsupported evaluation type"
            )

    def _validate_rubric_input(
        self,
        name: str,
        description_uri: str,
        description_hash: str,
        evaluation_type: str,
        criteria_hash: str,
        minimum_score: u256,
        maximum_score: u256,
        passing_threshold: u256,
        required_evaluator_count: u256,
        criteria_count: u256,
    ) -> None:
        """Validate rubric input fields before registration."""
        normalized_name = name.strip()
        normalized_desc_uri = description_uri.strip()
        normalized_desc_hash = description_hash.strip()
        normalized_criteria_hash = criteria_hash.strip()

        if normalized_name == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: name is required")
        if len(normalized_name) > MAX_TITLE_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: name is too long")
        if normalized_desc_uri == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: description URI is required")
        if len(normalized_desc_uri) > MAX_URI_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: description URI is too long")
        if normalized_desc_hash == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: description hash is required")
        if len(normalized_desc_hash) > MAX_HASH_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: description hash is too long")
        if normalized_criteria_hash == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: criteria hash is required")
        if len(normalized_criteria_hash) > MAX_HASH_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_RUBRIC}: criteria hash is too long")
        if minimum_score >= maximum_score:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_RUBRIC}: minimum_score must be less than maximum_score"
            )
        if passing_threshold < minimum_score or passing_threshold > maximum_score:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_RUBRIC}: passing_threshold must be between minimum and maximum scores"
            )
        if required_evaluator_count == 0:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_RUBRIC}: required_evaluator_count must be at least 1"
            )
        if criteria_count == 0:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_RUBRIC}: criteria_count must be at least 1"
            )

        self._validate_evaluation_type(evaluation_type)

    def _require_rubric_exists(self, rubric_id: str) -> None:
        """Ensure a rubric exists before referencing or returning it."""
        normalized_id = rubric_id.strip()
        if normalized_id == "" or normalized_id not in self.rubrics:
            raise gl.vm.UserError(f"{ERROR_RUBRIC_NOT_FOUND}: {rubric_id}")

    def _build_rubric_id(self, name: str, sequence: u256) -> str:
        """Derive a deterministic rubric identifier."""
        slug = name.strip().lower().replace(" ", "-")
        return f"ace-rubric-{str(sequence)}-{slug}"

    def _validate_report_input(
        self,
        submission_id: str,
        profile_id: str,
        criterion_scores_hash: str,
        recommendation: str,
        confidence_basis_points: u256,
    ) -> None:
        """Validate report commitment fields before storage."""
        if submission_id.strip() == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: submission_id is required")
        if profile_id.strip() == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: profile_id is required")
        if criterion_scores_hash.strip() == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: criterion_scores_hash is required")
        if len(criterion_scores_hash.strip()) > MAX_HASH_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: criterion_scores_hash is too long")
        if recommendation.strip() == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: recommendation is required")
        if confidence_basis_points > 10000:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_REPORT}: confidence_basis_points cannot exceed 10000"
            )

    def _require_submission_exists(self, submission_id: str) -> None:
        """Ensure a submission exists before operating on it.

        Raises gl.vm.UserError if submission_id is empty or not in storage.
        """
        normalized_id = submission_id.strip()
        if normalized_id == "" or normalized_id not in self.submissions:
            raise gl.vm.UserError(
                f"{ERROR_SUBMISSION_NOT_FOUND}: {submission_id}"
            )

    def _require_report_exists(self, report_id: str) -> None:
        """Ensure a report exists before returning or updating it."""
        normalized_id = report_id.strip()
        if normalized_id == "" or normalized_id not in self.reports:
            raise gl.vm.UserError(f"{ERROR_REPORT_NOT_FOUND}: {report_id}")

    def _validate_profile_input(
        self,
        display_name: str,
        profile_uri: str,
        profile_hash: str,
        capabilities_hash: str,
    ) -> None:
        """Validate evaluator profile input fields."""
        normalized_name = display_name.strip()
        normalized_uri = profile_uri.strip()
        normalized_hash = profile_hash.strip()
        normalized_cap_hash = capabilities_hash.strip()

        if normalized_name == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_PROFILE}: display_name is required")
        if len(normalized_name) > MAX_TITLE_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_PROFILE}: display_name is too long")
        if normalized_uri == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_PROFILE}: profile_uri is required")
        if len(normalized_uri) > MAX_URI_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_PROFILE}: profile_uri is too long")
        if normalized_hash == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_PROFILE}: profile_hash is required")
        if len(normalized_hash) > MAX_HASH_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_PROFILE}: profile_hash is too long")
        if normalized_cap_hash == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_PROFILE}: capabilities_hash is required")
        if len(normalized_cap_hash) > MAX_HASH_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_PROFILE}: capabilities_hash is too long")

    def _require_profile_exists(self, profile_id: str) -> None:
        """Ensure an evaluator profile exists in storage."""
        normalized_id = profile_id.strip()
        if normalized_id == "" or normalized_id not in self.profiles:
            raise gl.vm.UserError(f"{ERROR_PROFILE_NOT_FOUND}: {profile_id}")

    def _build_profile_id(self, owner: Address, sequence: u256) -> str:
        """Derive a deterministic evaluator profile identifier."""
        return f"ace-profile-{str(sequence)}-{str(owner)}"

    def _build_submission_id(self, requester: Address, title: str) -> str:
        """Build or derive a submission identifier.

        TODO: Add deterministic identifier strategy before submissions are
        persisted.
        """

        normalized_title = title.strip().lower().replace(" ", "-")
        return (
            f"ace-submission-{str(self.submission_count + 1)}-"
            f"{str(requester)}-{normalized_title}"
        )

    def _build_report_id(self, submission_id: str, evaluator: Address) -> str:
        """Build or derive an evaluation report identifier."""
        norm_sub_id = submission_id.strip()
        sequence = str(self.report_count + 1)
        return f"ace-report-{sequence}-{norm_sub_id}-{str(evaluator)}"

    def _append_report_to_submission(
        self,
        submission_id: str,
        report_id: str,
    ) -> None:
        """Associate one report identifier with a submission's report index."""
        norm_sub_id = submission_id.strip()
        norm_report_id = report_id.strip()

        report_ids = []
        if norm_sub_id in self.reports_by_submission:
            report_ids = json.loads(self.reports_by_submission[norm_sub_id])
        report_ids.append(norm_report_id)
        self.reports_by_submission[norm_sub_id] = self._canonical_json(report_ids)

    def _build_consensus_result_id(self, submission_id: str) -> str:
        """Build or derive a consensus result identifier.

        TODO: Add deterministic identifier strategy before consensus result
        records are persisted.
        """

        return self._build_consensus_id(submission_id)

    def _require_consensus_result_exists(self, consensus_result_id: str) -> None:
        """Ensure a consensus result exists before returning or updating it.

        TODO: Add storage lookup and consistent error handling.
        """

        self._require_consensus_exists(consensus_result_id)

    def _validate_consensus_result(
        self,
        submission_id: str,
        rubric_id: str,
        evaluation_profile_id: str,
        report_ids_hash: str,
        decision: str,
        confidence_basis_points: u256,
        summary_hash: str,
        method_id: str,
        status: str,
        finalized_at: str,
        report_ids: DynArray[str],
    ) -> None:
        """Validate a consensus commitment without deriving its contents."""
        if submission_id.strip() == "":
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: submission_id is required"
            )
        if rubric_id.strip() == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: rubric_id is required")
        if report_ids_hash.strip() == "":
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: report_ids_hash is required"
            )
        if len(report_ids_hash.strip()) > MAX_HASH_LENGTH:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: report_ids_hash is too long"
            )
        if len(report_ids) == 0:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: at least one report is required"
            )
        if decision.strip() == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: decision is required")
        if confidence_basis_points > 10000:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: confidence_basis_points cannot exceed 10000"
            )
        if summary_hash.strip() == "":
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: summary_hash is required"
            )
        if len(summary_hash.strip()) > MAX_HASH_LENGTH:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: summary_hash is too long"
            )
        if method_id.strip() == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: method_id is required")
        if status.strip() == "":
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: status is required")
        if len(status.strip()) > MAX_TITLE_LENGTH:
            raise gl.vm.UserError(f"{ERROR_INVALID_CONSENSUS}: status is too long")
        if finalized_at.strip() != "" and len(finalized_at.strip()) > MAX_TITLE_LENGTH:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: finalized_at is too long"
            )

    def _build_consensus_id(self, submission_id: str) -> str:
        """Build the deterministic one-result-per-submission identifier."""
        normalized_id = submission_id.strip()
        return f"ace-consensus-{normalized_id}"

    def _require_consensus_exists(self, consensus_result_id: str) -> None:
        """Ensure a consensus result exists before reading it."""
        normalized_id = consensus_result_id.strip()
        if normalized_id == "" or normalized_id not in self.consensus_results:
            raise gl.vm.UserError(
                f"{ERROR_CONSENSUS_NOT_FOUND}: {consensus_result_id}"
            )

    def _prepare_evaluation_payload(self, submission_id: str) -> dict:
        """Build an immutable, provider-neutral evaluator input packet."""
        normalized_id = submission_id.strip()
        self._require_submission_exists(normalized_id)
        submission = self.submissions[normalized_id]
        self._require_rubric_exists(submission.rubric_id)
        rubric = self.rubrics[submission.rubric_id]
        profile = None
        if submission.evaluation_profile_id.strip() != "":
            self._require_profile_exists(submission.evaluation_profile_id)
            profile = self.profiles[submission.evaluation_profile_id]
        return {
            "payloadType": "evaluation",
            "schemaVersion": self.schema_version,
            "submissionMetadata": {
                "submissionId": submission.submission_id,
                "title": submission.title,
                "evaluationType": submission.evaluation_type,
                "status": submission.status,
                "requester": str(submission.requester),
                "createdAt": submission.created_at,
            },
            "evidenceBundle": {
                "artifactUri": submission.artifact_uri,
                "metadataUri": submission.metadata_uri,
                "abstractCommitment": submission.abstract_commitment,
            },
            "evaluationProfile": None if profile is None else {
                "profileId": profile.profile_id,
                "profileUri": profile.profile_uri,
                "profileHash": profile.profile_hash,
                "capabilitiesHash": profile.capabilities_hash,
            },
            "rubric": {
                "rubricId": rubric.rubric_id,
                "schemaVersion": rubric.schema_version,
                "evaluationType": rubric.evaluation_type,
                "criteriaHash": rubric.criteria_hash,
                "criteriaCount": rubric.criteria_count,
                "minimumScore": rubric.minimum_score,
                "maximumScore": rubric.maximum_score,
                "passingThreshold": rubric.passing_threshold,
                "requiredEvaluatorCount": rubric.required_evaluator_count,
            },
            "immutableHashes": {
                "artifactHash": submission.artifact_hash,
                "metadataHash": submission.metadata_hash,
                "abstractCommitment": submission.abstract_commitment,
                "rubricDescriptionHash": rubric.description_hash,
                "criteriaHash": rubric.criteria_hash,
            },
            "expectedJsonSchema": {
                "type": "object",
                "required": [
                    "schemaVersion", "submissionId", "rubricId", "validatorId",
                    "evaluationType", "criterionScores", "overallRecommendation",
                    "overallConfidence", "summary", "limitations",
                    "fairnessChecklist", "modelMetadata",
                ],
                "properties": {
                    "schemaVersion": {"type": "string"},
                    "submissionId": {"type": "string"},
                    "rubricId": {"type": "string"},
                    "validatorId": {"type": "string"},
                    "evaluationType": {"type": "string"},
                    "criterionScores": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["criterionId", "score", "confidence", "rationale"],
                            "properties": {
                                "criterionId": {"type": "string"},
                                "score": {"type": "number", "minimum": 0},
                                "confidence": {"type": "integer", "minimum": 0, "maximum": 10000},
                                "rationale": {"type": "string"},
                                "evidenceRefs": {"type": "array", "items": {"type": "string"}},
                                "flags": {"type": "array", "items": {"type": "string"}},
                            },
                        },
                    },
                    "overallRecommendation": {"type": "string"},
                    "overallConfidence": {"type": "integer", "minimum": 0, "maximum": 10000},
                    "summary": {"type": "string"},
                    "limitations": {"type": "array", "items": {"type": "string"}},
                    "fairnessChecklist": {"type": "object"},
                    "modelMetadata": {"type": "object"},
                    "responseHash": {"type": "string"},
                },
            },
        }

    def _prepare_validator_payload(self, report_id: str) -> dict:
        """Build the frozen context a validator uses to inspect a report."""
        normalized_id = report_id.strip()
        self._require_report_exists(normalized_id)
        report = self.reports[normalized_id]
        payload = self._prepare_evaluation_payload(report.submission_id)
        payload["payloadType"] = "validator"
        payload["reportMetadata"] = {
            "reportId": report.report_id,
            "submissionId": report.submission_id,
            "rubricId": report.rubric_id,
            "profileId": report.profile_id,
            "status": report.status,
            "submittedAt": report.submitted_at,
        }
        payload["immutableHashes"]["criterionScoresHash"] = report.criterion_scores_hash
        payload["immutableHashes"]["summaryHash"] = report.summary_hash
        payload["immutableHashes"]["modelMetadataHash"] = report.model_metadata_hash
        payload["immutableHashes"]["conflictDisclosuresHash"] = report.conflict_disclosures_hash
        return payload

    def _validate_ai_response(self, response: dict) -> bool:
        """Reject malformed evaluator output before it can enter protocol state."""
        if not isinstance(response, dict):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: response must be an object")
        required = (
            "schemaVersion", "submissionId", "rubricId", "validatorId",
            "evaluationType", "criterionScores", "overallRecommendation",
            "overallConfidence", "summary", "limitations",
            "fairnessChecklist", "modelMetadata",
        )
        for key in required:
            if key not in response:
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: missing {key}")
        string_fields = ("schemaVersion", "submissionId", "rubricId", "validatorId", "evaluationType", "overallRecommendation", "summary")
        for key in string_fields:
            if not isinstance(response[key], str) or response[key].strip() == "":
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid {key}")
        if response["schemaVersion"].strip() != self.schema_version:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: unsupported schemaVersion")
        if not isinstance(response["criterionScores"], list):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: criterionScores must be an array")
        if not isinstance(response["limitations"], list):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: limitations must be an array")
        for limitation in response["limitations"]:
            if not isinstance(limitation, str):
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid limitation")
        confidence = response["overallConfidence"]
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or confidence < 0 or confidence > 10000:
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid overallConfidence")
        if not isinstance(response["fairnessChecklist"], dict) or not isinstance(response["modelMetadata"], dict):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid metadata objects")
        for criterion in response["criterionScores"]:
            if not isinstance(criterion, dict):
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterion score")
            for key in ("criterionId", "score", "confidence", "rationale"):
                if key not in criterion:
                    raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: missing criterion {key}")
            if not isinstance(criterion["criterionId"], str) or criterion["criterionId"].strip() == "":
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterionId")
            if isinstance(criterion["score"], bool) or not isinstance(criterion["score"], (int, float)) or criterion["score"] < 0:
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterion score")
            if isinstance(criterion["confidence"], bool) or not isinstance(criterion["confidence"], (int, float)) or criterion["confidence"] < 0 or criterion["confidence"] > 10000:
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterion confidence")
            if not isinstance(criterion["rationale"], str):
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid criterion rationale")
            if "evidenceRefs" in criterion and not isinstance(criterion["evidenceRefs"], list):
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid evidenceRefs")
            for evidence_ref in criterion.get("evidenceRefs", []):
                if not isinstance(evidence_ref, str) or evidence_ref.strip() == "":
                    raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid evidence reference")
            if "flags" in criterion and not isinstance(criterion["flags"], list):
                raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid flags")
            for flag in criterion.get("flags", []):
                if not isinstance(flag, str) or flag.strip() == "":
                    raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid flag")
        if "responseHash" in response and (
            not isinstance(response["responseHash"], str)
            or response["responseHash"].strip() == ""
            or len(response["responseHash"].strip()) > MAX_HASH_LENGTH
        ):
            raise gl.vm.UserError(f"{ERROR_INVALID_REPORT}: invalid responseHash")
        return True

    def _normalize_ai_response(self, response: dict) -> dict:
        """Return a canonical copy of a validated evaluator response."""
        self._validate_ai_response(response)
        normalized = {
            "schemaVersion": response["schemaVersion"].strip(),
            "submissionId": response["submissionId"].strip(),
            "rubricId": response["rubricId"].strip(),
            "validatorId": response["validatorId"].strip(),
            "evaluationType": response["evaluationType"].strip(),
            "criterionScores": [],
            "overallRecommendation": response["overallRecommendation"].strip(),
            "overallConfidence": int(round(response["overallConfidence"])),
            "summary": response["summary"].strip(),
            "limitations": [],
            "fairnessChecklist": response["fairnessChecklist"],
            "modelMetadata": response["modelMetadata"],
        }
        for limitation in response["limitations"]:
            normalized["limitations"].append(limitation.strip())
        for criterion in response["criterionScores"]:
            item = {
                "criterionId": criterion["criterionId"].strip(),
                "score": criterion["score"],
                "confidence": int(round(criterion["confidence"])),
                "rationale": criterion["rationale"].strip(),
            }
            if "evidenceRefs" in criterion:
                item["evidenceRefs"] = [value.strip() for value in criterion["evidenceRefs"]]
            if "flags" in criterion:
                item["flags"] = [value.strip() for value in criterion["flags"]]
            normalized["criterionScores"].append(item)
        if "responseHash" in response:
            normalized["responseHash"] = response["responseHash"].strip()
        return normalized

    def _prepare_consensus_payload(self, submission_id: str) -> dict:
        """Build deterministic context for future consensus formation."""
        normalized_id = submission_id.strip()
        self._require_submission_exists(normalized_id)
        submission = self.submissions[normalized_id]
        self._require_rubric_exists(submission.rubric_id)
        report_ids = []
        if normalized_id in self.reports_by_submission:
            indexed_report_ids = json.loads(
                self.reports_by_submission[normalized_id]
            )
            for report_id in indexed_report_ids:
                report_ids.append(report_id)
        payload = self._prepare_evaluation_payload(normalized_id)
        payload["payloadType"] = "consensus"
        payload["reportIds"] = report_ids
        payload["reportCommitments"] = []
        for report_id in report_ids:
            report = self.reports[report_id]
            payload["reportCommitments"].append({
                "reportId": report.report_id,
                "criterionScoresHash": report.criterion_scores_hash,
                "totalScore": report.total_score,
                "recommendation": report.recommendation,
                "confidenceBasisPoints": report.confidence_basis_points,
                "summaryHash": report.summary_hash,
                "modelMetadataHash": report.model_metadata_hash,
                "conflictDisclosuresHash": report.conflict_disclosures_hash,
            })
        payload["expectedJsonSchema"] = {
            "type": "object",
            "required": ("submissionId", "rubricId", "reportIds", "decision", "confidence", "summary", "methodId"),
            "properties": {
                "submissionId": {"type": "string"}, "rubricId": {"type": "string"},
                "reportIds": {"type": "array"}, "decision": {"type": "string"},
                "confidence": {"type": "integer", "minimum": 0, "maximum": 10000}, "summary": {"type": "string"},
                "methodId": {"type": "string"},
            },
        }
        return payload

    def _build_evaluation_prompt(
        self,
        payload: dict,
        evaluator_index: u256,
    ) -> str:
        """Build one provider-neutral structured evaluation prompt."""
        return (
            "ACE_EVALUATION\n"
            "Act as an independent academic evaluator. Use only the frozen "
            "context below. Return one JSON object matching expectedJsonSchema "
            "with no surrounding prose. Use the requested evaluator ordinal "
            "in validatorId, disclose limitations, and do not use institution, "
            "identity, geography, or writing fluency unless the rubric requires it.\n"
            f"Evaluator ordinal: {str(evaluator_index + 1)}. Confidence fields "
            "must be integer basis points from 0 to 10000.\n"
            f"Frozen context: {self._canonical_json(payload)}"
        )

    def _build_consensus_prompt(self, payload: dict) -> str:
        """Build a provider-neutral consensus prompt over accepted reports."""
        return (
            "ACE_CONSENSUS\n"
            "Derive one academic consensus result from the accepted report "
            "commitments below. Return only JSON with submissionId, rubricId, "
            "reportIds, decision, confidence, summary, and methodId. Decision "
            "must be one of accepted, revision_required, rejected, "
            "inconclusive, or manual_review_required. Confidence must be an "
            "integer from 0 to 10000. Explain material agreement and "
            "disagreement in summary.\n"
            f"Consensus context: {self._canonical_json(payload)}"
        )

    def _validate_ai_response_context(
        self,
        response: dict,
        payload: dict,
    ) -> None:
        """Bind a schema-valid response to the frozen submission and rubric."""
        metadata = payload["submissionMetadata"]
        rubric = payload["rubric"]
        if response["submissionId"] != metadata["submissionId"]:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_REPORT}: submissionId does not match context"
            )
        if response["rubricId"] != rubric["rubricId"]:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_REPORT}: rubricId does not match context"
            )
        if response["evaluationType"] != metadata["evaluationType"]:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_REPORT}: evaluationType does not match context"
            )
        if len(response["criterionScores"]) != rubric["criteriaCount"]:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_REPORT}: criterion count does not match rubric"
            )
        criterion_ids = []
        for criterion in response["criterionScores"]:
            criterion_id = criterion["criterionId"]
            if criterion_id in criterion_ids:
                raise gl.vm.UserError(
                    f"{ERROR_INVALID_REPORT}: duplicate criterionId"
                )
            criterion_ids.append(criterion_id)
        total_score = self._response_total_score(response)
        if total_score < rubric["minimumScore"] or total_score > rubric["maximumScore"]:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_REPORT}: total score is outside rubric bounds"
            )

    def _validate_evaluation_batch(
        self,
        responses: list,
        payload: dict,
    ) -> None:
        """Validate every response and enforce the requested evaluator count."""
        required_count = payload["rubric"]["requiredEvaluatorCount"]
        if not isinstance(responses, list) or len(responses) != required_count:
            raise gl.vm.UserError(
                f"{ERROR_AI_CONSENSUS}: evaluator count does not match rubric"
            )
        validator_ids = []
        for response in responses:
            self._validate_ai_response(response)
            self._validate_ai_response_context(response, payload)
            validator_id = response["validatorId"]
            if validator_id in validator_ids:
                raise gl.vm.UserError(
                    f"{ERROR_INVALID_REPORT}: duplicate validatorId"
                )
            validator_ids.append(validator_id)

    def _evaluation_batches_agree(
        self,
        leader_responses: list,
        validator_responses: list,
        payload: dict,
    ) -> bool:
        """Compare stable decision fields with explicit numeric tolerances."""
        self._validate_evaluation_batch(leader_responses, payload)
        self._validate_evaluation_batch(validator_responses, payload)
        maximum_score = payload["rubric"]["maximumScore"]
        score_tolerance = max(1, maximum_score // 10)
        for index in range(len(leader_responses)):
            leader = leader_responses[index]
            validator = validator_responses[index]
            if leader["overallRecommendation"] != validator["overallRecommendation"]:
                return False
            if abs(
                self._response_total_score(leader)
                - self._response_total_score(validator)
            ) > score_tolerance:
                return False
            leader_confidence = self._confidence_to_basis_points(
                leader["overallConfidence"]
            )
            validator_confidence = self._confidence_to_basis_points(
                validator["overallConfidence"]
            )
            if abs(leader_confidence - validator_confidence) > 1500:
                return False
        return True

    def _normalize_consensus_ai_response(
        self,
        response: dict,
        payload: dict,
    ) -> dict:
        """Validate and normalize one consensus response deterministically."""
        if not isinstance(response, dict):
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: response must be an object"
            )
        required = (
            "submissionId",
            "rubricId",
            "reportIds",
            "decision",
            "confidence",
            "summary",
            "methodId",
        )
        for key in required:
            if key not in response:
                raise gl.vm.UserError(
                    f"{ERROR_INVALID_CONSENSUS}: missing {key}"
                )
        if response["submissionId"] != payload["submissionMetadata"]["submissionId"]:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: submissionId does not match context"
            )
        if response["rubricId"] != payload["rubric"]["rubricId"]:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: rubricId does not match context"
            )
        if not isinstance(response["reportIds"], list):
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: reportIds must be an array"
            )
        expected_report_ids = []
        for report_id in payload["reportIds"]:
            expected_report_ids.append(report_id)
        normalized_report_ids = []
        for report_id in response["reportIds"]:
            if not isinstance(report_id, str) or report_id.strip() == "":
                raise gl.vm.UserError(
                    f"{ERROR_INVALID_CONSENSUS}: invalid report ID"
                )
            normalized_report_ids.append(report_id.strip())
        if normalized_report_ids != expected_report_ids:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: reportIds do not match context"
            )
        decision = response["decision"]
        allowed_decisions = (
            "accepted",
            "revision_required",
            "rejected",
            "inconclusive",
            "manual_review_required",
        )
        if not isinstance(decision, str) or decision.strip() not in allowed_decisions:
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: unsupported decision"
            )
        confidence = response["confidence"]
        if (
            isinstance(confidence, bool)
            or not isinstance(confidence, (int, float))
            or confidence < 0
            or confidence > 10000
        ):
            raise gl.vm.UserError(
                f"{ERROR_INVALID_CONSENSUS}: invalid confidence"
            )
        for key in ("summary", "methodId"):
            if not isinstance(response[key], str) or response[key].strip() == "":
                raise gl.vm.UserError(
                    f"{ERROR_INVALID_CONSENSUS}: invalid {key}"
                )
        return {
            "submissionId": response["submissionId"].strip(),
            "rubricId": response["rubricId"].strip(),
            "reportIds": normalized_report_ids,
            "decision": decision.strip(),
            "confidenceBasisPoints": self._confidence_to_basis_points(confidence),
            "summary": response["summary"].strip(),
            "methodId": response["methodId"].strip(),
        }

    def _consensus_responses_agree(
        self,
        leader: dict,
        validator: dict,
    ) -> bool:
        """Compare the substantive consensus fields accepted into storage."""
        if leader["reportIds"] != validator["reportIds"]:
            return False
        if leader["decision"] != validator["decision"]:
            return False
        if leader["methodId"] != validator["methodId"]:
            return False
        return abs(
            leader["confidenceBasisPoints"]
            - validator["confidenceBasisPoints"]
        ) <= 1000

    def _store_ai_evaluation_report(
        self,
        submission_id: str,
        profile_id: str,
        response: dict,
    ) -> str:
        """Persist one consensus-accepted normalized evaluation response."""
        sequence = self.report_count + 1
        report_id = self._build_report_id(
            submission_id,
            gl.message.sender_address,
        )
        criterion_scores_hash = self._hash_json(response["criterionScores"])
        summary_hash = self._hash_text(response["summary"])
        model_metadata_hash = self._hash_json(response["modelMetadata"])
        disclosures_hash = self._hash_json(response["limitations"])
        self.reports[report_id] = EvaluationReport(
            report_id=report_id,
            schema_version=self.schema_version,
            submission_id=submission_id,
            rubric_id=response["rubricId"],
            evaluator=gl.message.sender_address,
            profile_id=profile_id,
            criterion_scores_hash=criterion_scores_hash,
            total_score=self._response_total_score(response),
            recommendation=response["overallRecommendation"],
            confidence_basis_points=self._confidence_to_basis_points(
                response["overallConfidence"]
            ),
            summary_uri="",
            summary_hash=summary_hash,
            model_metadata_uri="",
            model_metadata_hash=model_metadata_hash,
            conflict_disclosures_hash=disclosures_hash,
            status="accepted",
            submitted_at=str(sequence),
            consensus_confidence_basis_points=0,
            consensus_summary_hash="",
        )
        self.report_ids.append(report_id)
        self.report_count = sequence
        self._append_report_to_submission(submission_id, report_id)
        return report_id

    def _store_ai_consensus_result(
        self,
        submission_id: str,
        profile_id: str,
        report_ids: list,
        response: dict,
    ) -> str:
        """Persist one consensus-accepted result without changing layout."""
        consensus_result_id = self._build_consensus_id(submission_id)
        sequence = self.consensus_result_count + 1
        summary_hash = self._hash_text(response["summary"])
        report_ids_hash = self._hash_json(response["reportIds"])
        self.consensus_results[consensus_result_id] = ConsensusResult(
            consensus_result_id=consensus_result_id,
            schema_version=self.schema_version,
            submission_id=submission_id,
            rubric_id=response["rubricId"],
            evaluation_profile_id=profile_id,
            report_ids_hash=report_ids_hash,
            decision=response["decision"],
            confidence_basis_points=response["confidenceBasisPoints"],
            summary_hash=summary_hash,
            method_id=response["methodId"],
            status="finalized",
            created_at=str(sequence),
            finalized_at=str(sequence),
        )
        self.consensus_result_ids.append(consensus_result_id)
        self.consensus_result_by_submission[submission_id] = consensus_result_id
        self.consensus_result_count = sequence
        for report_id in report_ids:
            report = self.reports[report_id]
            report.consensus_confidence_basis_points = response[
                "confidenceBasisPoints"
            ]
            report.consensus_summary_hash = summary_hash
            self.reports[report_id] = report
        return consensus_result_id

    def _response_total_score(self, response: dict) -> u256:
        """Convert normalized criterion scores into a deterministic integer total."""
        total = 0
        for criterion in response["criterionScores"]:
            total += int(round(criterion["score"]))
        return total

    def _confidence_to_basis_points(self, confidence) -> u256:
        """Convert a normalized confidence number to integer basis points."""
        if isinstance(confidence, int):
            return confidence
        return int(round(confidence * 10000))

    def _canonical_json(self, value) -> str:
        """Serialize protocol data in a stable provider-neutral form."""
        return json.dumps(value, sort_keys=True, separators=(",", ":"))

    def _hash_json(self, value) -> str:
        """Hash one canonical JSON value for compact on-chain commitment storage."""
        return self._hash_text(self._canonical_json(value))

    def _hash_text(self, value: str) -> str:
        """Return a deterministic SHA-256 content commitment."""
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def _maybe_schedule_consensus(self, submission_id: str) -> None:
        """Placeholder for future AI consensus workflow coordination.

        TODO: Add consensus readiness checks and validator agreement workflow in
        a later implementation milestone.
        """

        raise gl.vm.UserError(ERROR_NOT_IMPLEMENTED)
