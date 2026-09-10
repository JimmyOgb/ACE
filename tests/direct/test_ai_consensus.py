import json
import hashlib


CONTRACT_PATH = "contracts/AcademicConsensusEngine.py"
ARTIFACT_CONTENT = "The frozen consensus essay artifact."
CRITERIA_CONTENT = "Criterion criterion-1: assess the submitted essay."
ARTIFACT_HASH = "sha256:" + hashlib.sha256(ARTIFACT_CONTENT.encode("utf-8")).hexdigest()
CRITERIA_HASH = "sha256:" + hashlib.sha256(CRITERIA_CONTENT.encode("utf-8")).hexdigest()


def _mock_source_documents(direct_vm):
    direct_vm.mock_web(
        r"^ipfs://artifact$",
        {"status": 200, "body": ARTIFACT_CONTENT},
    )
    direct_vm.mock_web(
        r"^ipfs://rubric$",
        {"status": 200, "body": CRITERIA_CONTENT},
    )


def _deploy_frozen_submission(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    _mock_source_documents(direct_vm)
    contract = direct_deploy(CONTRACT_PATH)
    rubric_id = contract.create_rubric(
        "Essay rubric",
        "ipfs://rubric",
        "rubric-hash",
        "essay",
        CRITERIA_HASH,
        0,
        100,
        60,
        2,
        True,
        1,
    )
    profile_id = contract.create_profile(
        "ACE evaluator profile",
        "ipfs://profile",
        "profile-hash",
        "capabilities-hash",
    )
    submission_id = contract.submit_for_evaluation(
        "Consensus essay",
        "abstract-hash",
        "ipfs://artifact",
        ARTIFACT_HASH,
        rubric_id,
        "essay",
        "ipfs://metadata",
        "metadata-hash",
    )
    contract.freeze_submission(submission_id)
    return contract, submission_id, rubric_id, profile_id


def _evaluation_response(submission_id, rubric_id, validator_id, score=82):
    return {
        "schemaVersion": "0.1.0",
        "submissionId": submission_id,
        "rubricId": rubric_id,
        "validatorId": validator_id,
        "evaluationType": "essay",
        "criterionScores": [
            {
                "criterionId": "criterion-1",
                "score": score,
                "confidence": 8600,
                "rationale": "The submission satisfies the committed rubric.",
                "evidenceRefs": ["artifact-hash"],
                "flags": [],
            }
        ],
        "overallRecommendation": "accepted",
        "overallConfidence": 8600,
        "summary": "The submission meets the rubric with minor limitations.",
        "limitations": ["Only the frozen artifact was considered."],
        "fairnessChecklist": {"irrelevantStatusSignalsExcluded": True},
        "modelMetadata": {"promptVersion": "ace-evaluation-v1"},
    }


def _mock_successful_consensus(
    direct_vm,
    submission_id,
    rubric_id,
    report_evaluator,
):
    for index, score in enumerate((82, 85, 83, 84, 82), start=1):
        direct_vm.mock_llm(
            rf"(?s)ACE_EVALUATION.*Evaluator ordinal: {index}.*The frozen consensus essay artifact\..*Criterion criterion-1: assess the submitted essay\.",
            json.dumps(
                _evaluation_response(
                    submission_id,
                    rubric_id,
                    f"ace-validator-{index}",
                    score,
                )
            ),
        )
    report_ids = [
        f"ace-report-{index}-{submission_id}-{str(report_evaluator)}"
        for index in range(1, 6)
    ]
    direct_vm.mock_llm(
        r"ACE_CONSENSUS",
        json.dumps(
            {
                "submissionId": submission_id,
                "rubricId": rubric_id,
                "reportIds": report_ids,
                "decision": "accepted",
                "confidence": 8400,
                "summary": "Both accepted reports agree on the outcome.",
                "methodId": "ace-ai-consensus-v1",
            }
        ),
    )


def test_get_latest_profile_id_uses_authoritative_profile_state(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    alice_first = contract.create_profile(
        "Alice first profile",
        "ipfs://profile/alice-1",
        "profile-hash-alice-1",
        "capabilities-hash-alice-1",
    )

    direct_vm.sender = direct_bob
    bob_profile = contract.create_profile(
        "Bob profile",
        "ipfs://profile/bob",
        "profile-hash-bob",
        "capabilities-hash-bob",
    )

    direct_vm.sender = direct_alice
    alice_latest = contract.create_profile(
        "Alice latest profile",
        "ipfs://profile/alice-2",
        "profile-hash-alice-2",
        "capabilities-hash-alice-2",
    )

    assert contract.get_latest_profile_id(direct_alice) == alice_latest
    assert contract.get_latest_profile_id(direct_bob) == bob_profile
    assert str(contract.get_profile(alice_first).owner) == alice_first.rsplit("-", 1)[-1]


def test_create_profile_then_read_profile_uses_the_returned_canonical_id(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)

    profile_id = contract.create_profile(
        "Fresh wallet profile",
        "https://raw.githubusercontent.com/JimmyOgb/ACE/main/artifacts/academic-general-profile.txt",
        "sha256:profile-content",
        "sha256:profile-capabilities",
    )

    profile = contract.get_profile(profile_id)
    assert profile.profile_id == profile_id
    assert str(profile.owner).lower() == profile_id.rsplit("-", 1)[-1].lower()
    assert contract.get_latest_profile_id(direct_alice) == profile_id


def test_evaluate_submission_runs_consensus_and_finalizes(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, profile_id = _deploy_frozen_submission(
        direct_vm,
        direct_deploy,
        direct_alice,
    )
    _mock_successful_consensus(
        direct_vm,
        submission_id,
        rubric_id,
        contract.owner,
    )

    consensus_id = contract.evaluate_submission(submission_id, profile_id)

    assert consensus_id == f"ace-consensus-{submission_id}"
    assert contract.get_submission(submission_id).status == "finalized"
    assert contract.list_reports(submission_id, 0, 10) == [
        f"ace-report-{index}-{submission_id}-{str(contract.owner)}"
        for index in range(1, 6)
    ]
    result = contract.get_consensus_result(consensus_id)
    assert result.decision == "accepted"
    assert result.confidence_basis_points == 8400
    assert result.status == "finalized"
    assert direct_vm.run_validator(index=0)
    assert direct_vm.run_validator(index=1)


def test_evaluate_submission_requires_frozen_state(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    rubric_id = contract.create_rubric(
        "Essay rubric",
        "ipfs://rubric",
        "rubric-hash",
        "essay",
        "criteria-hash",
        0,
        100,
        60,
        1,
        True,
        1,
    )
    profile_id = contract.create_profile(
        "ACE evaluator profile",
        "ipfs://profile",
        "profile-hash",
        "capabilities-hash",
    )
    submission_id = contract.submit_for_evaluation(
        "Unfrozen essay",
        "abstract-hash",
        "ipfs://artifact",
        "artifact-hash",
        rubric_id,
        "essay",
        "ipfs://metadata",
        "metadata-hash",
    )

    with direct_vm.expect_revert("registered -> under_review"):
        contract.evaluate_submission(submission_id, profile_id)


def test_public_result_creation_and_finalization_are_consensus_only(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    with direct_vm.expect_revert("Result can only be produced by consensus"):
        contract.create_evaluation_report(
            submission_id, profile_id, "scores", 80, "accepted", 8000,
            "", "summary", "", "metadata", "conflicts"
        )
    with direct_vm.expect_revert("Result can only be produced by consensus"):
        contract.create_consensus_result(
            submission_id, profile_id, [], "reports", "accepted", 8000,
            "summary", "method", "finalized", "1"
        )
    with direct_vm.expect_revert("Result can only be produced by consensus"):
        contract.finalize_submission(submission_id)


def test_artifact_retrieval_hash_mismatch_fails_closed(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": "tampered"})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": CRITERIA_CONTENT})
    with direct_vm.expect_revert("Retrieved source hash does not match commitment"):
        contract.evaluate_submission(submission_id, profile_id)


def test_rubric_retrieval_hash_mismatch_fails_closed(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": ARTIFACT_CONTENT})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": "tampered rubric"})
    with direct_vm.expect_revert("Retrieved source hash does not match commitment"):
        contract.evaluate_submission(submission_id, profile_id)


def test_evaluate_submission_rejects_malformed_ai_response(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm,
        direct_deploy,
        direct_alice,
    )


def test_evaluate_submission_rejects_malformed_ai_response(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm,
        direct_deploy,
        direct_alice,
    )
    direct_vm.mock_llm(
        r"ACE_EVALUATION",
        json.dumps({"schemaVersion": "0.1.0"}),
    )

    with direct_vm.expect_revert("missing submissionId"):
        contract.evaluate_submission(submission_id, profile_id)


def test_regression_1_submission_stores_artifact_uri_and_sha256(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, _ = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    sub = contract.get_submission(submission_id)
    assert sub.artifact_uri == "ipfs://artifact"
    assert sub.artifact_hash == ARTIFACT_HASH
    assert sub.artifact_hash.startswith("sha256:")


def test_regression_2_submission_stores_rubric_uri_and_sha256(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, _ = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    sub = contract.get_submission(submission_id)
    assert sub.rubric_id == rubric_id
    rubric = contract.get_rubric(sub.rubric_id)
    assert rubric.description_uri == "ipfs://rubric"
    assert rubric.criteria_hash == CRITERIA_HASH
    assert rubric.criteria_hash.startswith("sha256:")


def test_regression_3_consensus_evaluator_retrieves_artifact(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": CRITERIA_CONTENT})
    # Artifact endpoint is not mocked -> retrieval fails
    with direct_vm.expect_revert("Required source could not be retrieved: artifact"):
        contract.evaluate_submission(submission_id, profile_id)


def test_regression_4_consensus_evaluator_verifies_artifact_hash(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": "different artifact content"})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": CRITERIA_CONTENT})
    with direct_vm.expect_revert("Retrieved source hash does not match commitment: artifact"):
        contract.evaluate_submission(submission_id, profile_id)


def test_regression_5_consensus_evaluator_retrieves_rubric(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": ARTIFACT_CONTENT})
    # Rubric endpoint is not mocked -> retrieval fails
    with direct_vm.expect_revert("Required source could not be retrieved: rubric criteria"):
        contract.evaluate_submission(submission_id, profile_id)


def test_regression_6_consensus_evaluator_verifies_rubric_hash(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": ARTIFACT_CONTENT})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": "different rubric criteria"})
    with direct_vm.expect_revert("Retrieved source hash does not match commitment: rubric criteria"):
        contract.evaluate_submission(submission_id, profile_id)


def test_regression_7_every_evaluator_receives_complete_verified_artifact(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    # Match prompt containing verified artifact section
    for index, score in enumerate((82, 85, 83, 84, 82), start=1):
        prompt_pattern = rf"(?s)ACE_EVALUATION.*Evaluator ordinal: {index}.*\[SECTION A: VERIFIED SUBMITTED WORK\].*{ARTIFACT_CONTENT}"
        direct_vm.mock_llm(
            prompt_pattern,
            json.dumps(
                _evaluation_response(
                    submission_id,
                    rubric_id,
                    f"ace-validator-{index}",
                    score,
                )
            ),
        )
    report_ids = [
        f"ace-report-{index}-{submission_id}-{str(contract.owner)}"
        for index in range(1, 6)
    ]
    direct_vm.mock_llm(
        r"ACE_CONSENSUS",
        json.dumps(
            {
                "submissionId": submission_id,
                "rubricId": rubric_id,
                "reportIds": report_ids,
                "decision": "accepted",
                "confidence": 8400,
                "summary": "Verified artifact received by all evaluators.",
                "methodId": "ace-ai-consensus-v1",
            }
        ),
    )
    consensus_id = contract.evaluate_submission(submission_id, profile_id)
    assert consensus_id == f"ace-consensus-{submission_id}"


def test_regression_8_every_evaluator_receives_complete_verified_rubric(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    # Match prompt containing verified rubric section
    for index, score in enumerate((82, 85, 83, 84, 82), start=1):
        prompt_pattern = rf"(?s)ACE_EVALUATION.*Evaluator ordinal: {index}.*\[SECTION B: COMPLETE VERIFIED RUBRIC\].*{CRITERIA_CONTENT}"
        direct_vm.mock_llm(
            prompt_pattern,
            json.dumps(
                _evaluation_response(
                    submission_id,
                    rubric_id,
                    f"ace-validator-{index}",
                    score,
                )
            ),
        )
    report_ids = [
        f"ace-report-{index}-{submission_id}-{str(contract.owner)}"
        for index in range(1, 6)
    ]
    direct_vm.mock_llm(
        r"ACE_CONSENSUS",
        json.dumps(
            {
                "submissionId": submission_id,
                "rubricId": rubric_id,
                "reportIds": report_ids,
                "decision": "accepted",
                "confidence": 8400,
                "summary": "Complete verified rubric received by all evaluators.",
                "methodId": "ace-ai-consensus-v1",
            }
        ),
    )
    consensus_id = contract.evaluate_submission(submission_id, profile_id)
    assert consensus_id == f"ace-consensus-{submission_id}"


def test_regression_9_exactly_five_evaluator_responses_are_required(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    for index in range(1, 6):
        direct_vm.mock_llm(
            rf"(?s)ACE_EVALUATION.*Evaluator ordinal: {index}",
            json.dumps(
                _evaluation_response(
                    submission_id,
                    rubric_id,
                    "duplicate-validator-id",
                    80,
                )
            ),
        )
    with direct_vm.expect_revert("duplicate validatorId"):
        contract.evaluate_submission(submission_id, profile_id)


def test_regression_10_artifact_retrieval_failure_cannot_produce_verified_result(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 404, "body": ""})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": CRITERIA_CONTENT})
    with direct_vm.expect_revert("Required source could not be retrieved: artifact"):
        contract.evaluate_submission(submission_id, profile_id)
    assert contract.get_submission(submission_id).status != "finalized"
    with direct_vm.expect_revert("Consensus result not found"):
        contract.get_consensus_result(f"ace-consensus-{submission_id}")


def test_regression_11_artifact_hash_mismatch_cannot_produce_verified_result(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": "corrupted paper"})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": CRITERIA_CONTENT})
    with direct_vm.expect_revert("Retrieved source hash does not match commitment: artifact"):
        contract.evaluate_submission(submission_id, profile_id)
    assert contract.get_submission(submission_id).status != "finalized"
    with direct_vm.expect_revert("Consensus result not found"):
        contract.get_consensus_result(f"ace-consensus-{submission_id}")


def test_regression_12_rubric_retrieval_failure_cannot_produce_verified_result(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": ARTIFACT_CONTENT})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 500, "body": "server error"})
    with direct_vm.expect_revert("Required source could not be retrieved: rubric criteria"):
        contract.evaluate_submission(submission_id, profile_id)
    assert contract.get_submission(submission_id).status != "finalized"
    with direct_vm.expect_revert("Consensus result not found"):
        contract.get_consensus_result(f"ace-consensus-{submission_id}")


def test_regression_13_rubric_hash_mismatch_cannot_produce_verified_result(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": ARTIFACT_CONTENT})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": "tampered criteria"})
    with direct_vm.expect_revert("Retrieved source hash does not match commitment: rubric criteria"):
        contract.evaluate_submission(submission_id, profile_id)
    assert contract.get_submission(submission_id).status != "finalized"
    with direct_vm.expect_revert("Consensus result not found"):
        contract.get_consensus_result(f"ace-consensus-{submission_id}")


def test_regression_14_public_methods_cannot_directly_manufacture_authoritative_result(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    with direct_vm.expect_revert("Result can only be produced by consensus"):
        contract.create_evaluation_report(
            submission_id, profile_id, "scores", 80, "accepted", 8000,
            "", "summary", "", "metadata", "conflicts"
        )
    with direct_vm.expect_revert("Result can only be produced by consensus"):
        contract.create_consensus_result(
            submission_id, profile_id, [], "reports", "accepted", 8000,
            "summary", "method", "finalized", "1"
        )
    with direct_vm.expect_revert("Result can only be produced by consensus"):
        contract.mark_under_review(submission_id)


def test_regression_15_public_finalize_submission_cannot_finalize_evaluation(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, _ = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    with direct_vm.expect_revert("Result can only be produced by consensus"):
        contract.finalize_submission(submission_id)
    assert contract.get_submission(submission_id).status != "finalized"


def test_regression_16_authoritative_finalization_occurs_only_through_consensus_evaluation_path(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    assert contract.get_submission(submission_id).status == "frozen"
    with direct_vm.expect_revert("Consensus result not found"):
        contract.get_consensus_result(f"ace-consensus-{submission_id}")

    _mock_successful_consensus(direct_vm, submission_id, rubric_id, contract.owner)
    consensus_id = contract.evaluate_submission(submission_id, profile_id)

    assert contract.get_submission(submission_id).status == "finalized"
    res = contract.get_consensus_result(consensus_id)
    assert res.decision == "accepted"
    assert res.status == "finalized"


def test_regression_17_no_hardcoded_verified_history_contributes_to_statistics(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    assert contract.submission_count == 0
    assert contract.rubric_count == 0
    assert contract.report_count == 0
    assert contract.consensus_result_count == 0
    assert contract.profile_count == 0
    assert len(contract.list_submissions(0, 50)) == 0
    assert len(contract.list_rubrics(0, 50)) == 0


def test_test1_artifact_retrieval_handles_bytes_body(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": ARTIFACT_CONTENT.encode("utf-8")})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": CRITERIA_CONTENT})
    _mock_successful_consensus(direct_vm, submission_id, rubric_id, contract.owner)
    consensus_id = contract.evaluate_submission(submission_id, profile_id)
    assert consensus_id == f"ace-consensus-{submission_id}"
    assert contract.get_submission(submission_id).status == "finalized"


def test_test1_artifact_retrieval_empty_body_fails_closed(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": b""})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": CRITERIA_CONTENT})
    with direct_vm.expect_revert("Required source could not be retrieved: artifact has no body"):
        contract.evaluate_submission(submission_id, profile_id)


def test_test3_rubric_retrieval_empty_body_fails_closed(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, _, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    direct_vm.clear_mocks()
    direct_vm.mock_web(r"^ipfs://artifact$", {"status": 200, "body": ARTIFACT_CONTENT})
    direct_vm.mock_web(r"^ipfs://rubric$", {"status": 200, "body": ""})
    with direct_vm.expect_revert("Required source could not be retrieved: rubric criteria has no body"):
        contract.evaluate_submission(submission_id, profile_id)


def test_test5_prompt_contains_complete_artifact_complete_rubric_and_sections(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    distinctive_artifact = "DISTINCTIVE_RESEARCH_PAPER_TEXT_789XYZ"
    distinctive_criteria = "DISTINCTIVE_CRITERIA_INSTRUCTIONS_456ABC"
    art_hash = "sha256:" + hashlib.sha256(distinctive_artifact.encode("utf-8")).hexdigest()
    crit_hash = "sha256:" + hashlib.sha256(distinctive_criteria.encode("utf-8")).hexdigest()

    direct_vm.sender = direct_alice
    direct_vm.mock_web(r"^ipfs://art-dist$", {"status": 200, "body": distinctive_artifact})
    direct_vm.mock_web(r"^ipfs://rub-dist$", {"status": 200, "body": distinctive_criteria})

    contract = direct_deploy(CONTRACT_PATH)
    rubric_id = contract.create_rubric(
        "Distinctive Rubric", "ipfs://rub-dist", "rub-hash", "research_paper",
        crit_hash, 0, 100, 60, 1, True, 1
    )
    profile_id = contract.create_profile("Profile", "ipfs://prof", "prof-hash", "cap-hash")
    submission_id = contract.submit_for_evaluation(
        "Distinctive Paper", "abs-hash", "ipfs://art-dist", art_hash,
        rubric_id, "research_paper", "ipfs://meta", "meta-hash"
    )
    contract.freeze_submission(submission_id)

    prompt_matched = False
    for index in range(1, 6):
        prompt_regex = (
            rf"(?s)ACE_EVALUATION.*Evaluator ordinal: {index}.*"
            rf"\[SECTION A: VERIFIED SUBMITTED WORK\].*{distinctive_artifact}.*"
            rf"\[SECTION B: COMPLETE VERIFIED RUBRIC\].*{distinctive_criteria}.*"
            rf"\[SECTION C: EVALUATION INSTRUCTIONS\].*Score the submitted academic work strictly.*"
            rf"\[SECTION D: REQUIRED STRUCTURED EVALUATION FORMAT\].*Expected JSON Schema:"
        )
        direct_vm.mock_llm(
            prompt_regex,
            json.dumps({
                "schemaVersion": "0.1.0",
                "submissionId": submission_id,
                "rubricId": rubric_id,
                "validatorId": f"ace-validator-{index}",
                "evaluationType": "research_paper",
                "criterionScores": [{
                    "criterionId": "criterion-1",
                    "score": 85,
                    "confidence": 9000,
                    "rationale": "High quality verified evidence.",
                }],
                "overallRecommendation": "accepted",
                "overallConfidence": 9000,
                "summary": "Distinctive verified content processed successfully.",
                "limitations": ["Verified evaluation."],
                "fairnessChecklist": {},
                "modelMetadata": {},
            }),
        )

    report_ids = [
        f"ace-report-{index}-{submission_id}-{str(contract.owner)}"
        for index in range(1, 6)
    ]
    direct_vm.mock_llm(
        r"ACE_CONSENSUS",
        json.dumps({
            "submissionId": submission_id,
            "rubricId": rubric_id,
            "reportIds": report_ids,
            "decision": "accepted",
            "confidence": 9000,
            "summary": "Consensus on distinctive content.",
            "methodId": "ace-ai-consensus-v1",
        }),
    )

    consensus_id = contract.evaluate_submission(submission_id, profile_id)
    assert consensus_id == f"ace-consensus-{submission_id}"
    assert contract.get_submission(submission_id).status == "finalized"


def test_test6_batch_validation_fewer_or_more_than_five_fails_closed(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    payload = contract._prepare_evaluation_payload(submission_id)

    # 4 responses (fewer than 5)
    four_responses = [_evaluation_response(submission_id, rubric_id, f"v-{i}", 80) for i in range(4)]
    with direct_vm.expect_revert("evaluator count must be exactly five"):
        contract._validate_evaluation_batch(four_responses, payload)

    # 6 responses (more than 5)
    six_responses = [_evaluation_response(submission_id, rubric_id, f"v-{i}", 80) for i in range(6)]
    with direct_vm.expect_revert("evaluator count must be exactly five"):
        contract._validate_evaluation_batch(six_responses, payload)

    # Exactly 5 responses
    five_responses = [_evaluation_response(submission_id, rubric_id, f"v-{i}", 80) for i in range(5)]
    contract._validate_evaluation_batch(five_responses, payload)


def test_test9_consensus_ai_failure_fails_closed(
    direct_vm,
    direct_deploy,
    direct_alice,
):
    contract, submission_id, rubric_id, profile_id = _deploy_frozen_submission(
        direct_vm, direct_deploy, direct_alice
    )
    for index, score in enumerate((82, 85, 83, 84, 82), start=1):
        direct_vm.mock_llm(
            rf"(?s)ACE_EVALUATION.*Evaluator ordinal: {index}",
            json.dumps(_evaluation_response(submission_id, rubric_id, f"ace-validator-{index}", score)),
        )
    # Consensus returns malformed response missing required fields
    direct_vm.mock_llm(
        r"ACE_CONSENSUS",
        json.dumps({"bad": "payload"}),
    )
    with direct_vm.expect_revert("missing submissionId"):
        contract.evaluate_submission(submission_id, profile_id)
    assert contract.get_submission(submission_id).status != "finalized"
    with direct_vm.expect_revert("Consensus result not found"):
        contract.get_consensus_result(f"ace-consensus-{submission_id}")
