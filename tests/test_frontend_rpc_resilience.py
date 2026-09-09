from pathlib import Path


ROOT = Path(__file__).parents[1]
HOOKS = (ROOT / "frontend/src/hooks/useAceQueries.ts").read_text(encoding="utf-8")
STORAGE = (ROOT / "frontend/src/lib/evaluationProfiles.ts").read_text(encoding="utf-8")
RPC = (ROOT / "sdk/src/rpc.ts").read_text(encoding="utf-8")
CONTRACT = (ROOT / "sdk/src/contract.ts").read_text(encoding="utf-8")
SETUP = (ROOT / "frontend/src/pages/SetupPage.tsx").read_text(encoding="utf-8")


def test_receipt_status_retries_are_bounded_and_reuse_the_same_hash():
    assert "TransactionStatusUnavailableError" in RPC
    assert "Math.min(maxDelayMs, 1_000 * 2 ** Math.min(attempt, 5))" in CONTRACT
    assert "waitForTransactionReceipt" in CONTRACT
    assert "return await this.client.read.waitForTransactionReceipt" in CONTRACT
    assert "create_profile(DEFAULT_PROFILE)" in HOOKS
    assert "pendingHash ??" in HOOKS


def test_pending_profile_and_rubric_hashes_are_namespaced_by_contract_and_wallet():
    assert "ace:evaluation-profile-ids:${configuredContractAddress}" in STORAGE
    assert "ace:evaluation-profile-ids:${configuredContractAddress}:${account.toLowerCase()}" not in STORAGE
    assert "pendingTransactionKey('profile', account)" in STORAGE
    assert "pendingTransactionKey('rubric', account)" in STORAGE
    assert "loadPendingEvaluationRubricTransaction" in HOOKS


def test_manual_retry_and_recovery_never_submit_a_second_write():
    assert "pendingProfileHash ? 'Retry status check'" in SETUP
    assert "pendingRubricHash ? 'Retry status check'" in SETUP
    assert "createProfile.mutateAsync().then(applyProfileResult)" in SETUP
    assert "getLatestProfileId(account" in HOOKS
    assert "get_latest_profile_id" in HOOKS
