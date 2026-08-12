import json


CONTRACT_PATH = "contracts/AcademicConsensusEngine.py"


def _deploy_frozen_submission(direct_vm, direct_deploy, direct_alice):
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
        "artifact-hash",
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
    first = _evaluation_response(
        submission_id,
        rubric_id,
        "ace-validator-1",
        82,
    )
    second = _evaluation_response(
        submission_id,
        rubric_id,
        "ace-validator-2",
        85,
    )
    direct_vm.mock_llm(
        r"(?s)ACE_EVALUATION.*Evaluator ordinal: 1",
        json.dumps(first),
    )
    direct_vm.mock_llm(
        r"(?s)ACE_EVALUATION.*Evaluator ordinal: 2",
        json.dumps(second),
    )
    report_ids = [
        f"ace-report-1-{submission_id}-{str(report_evaluator)}",
        f"ace-report-2-{submission_id}-{str(report_evaluator)}",
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
        f"ace-report-1-{submission_id}-{str(contract.owner)}",
        f"ace-report-2-{submission_id}-{str(contract.owner)}",
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
