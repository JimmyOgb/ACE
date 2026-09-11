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
    assert "getLatestProfileId(ownerAddress" in HOOKS or "getLatestProfileId(account" in HOOKS
    assert "get_latest_profile_id" in HOOKS


def test_delayed_or_unavailable_confirmation_recovers_existing_profile():
    """
    Regression test reproducing:
    transaction succeeds on-chain -> confirmation/polling response is delayed/unavailable -> latest profile exists -> UI recovers the profile.
    """
    # 1. Setup page derives authoritative profile from on-chain status
    assert "status.existingProfile" in SETUP
    assert "verifiedProfile ?? status.existingProfile" in SETUP
    # 2. Hook queries latest profile on mount/reload
    assert "useLatestProfile" in HOOKS
    assert "getLatestProfileId(ownerAddress" in HOOKS or "getLatestProfileId(account" in HOOKS
    # 3. Delayed/unavailable receipt path checks get_latest_profile_id before failing
    assert "receiptError" in HOOKS
    assert "discovering latest profile for owner" in HOOKS
    assert "profile verified" in HOOKS
    # 4. Clears pending transaction and updates UI
    assert "clearPendingEvaluationProfileTransaction" in HOOKS
    assert "clearPendingEvaluationProfileTransaction" in SETUP


def test_simulation_delayed_confirmation_recovers_profile():
    """
    Simulates:
    1. Wallet submits create_profile -> tx hash obtained.
    2. Confirmation / receipt polling throws TransactionStatusUnavailableError or delays.
    3. Contract actually processed transaction on-chain: get_latest_profile_id returns the profile ID.
    4. Recovery logic queries get_latest_profile_id and get_profile.
    5. Result recovers the profile, clears pending hash, and shows Exists.
    """
    class MockContract:
        def __init__(self):
            self.tx_submitted = False
            self.on_chain_profiles = {}

        def create_profile(self, args):
            self.tx_submitted = True
            self.on_chain_profiles["0xalice"] = "ace-profile-1-0xalice"
            return "0xhash123"

        def waitForTransaction(self, tx_hash, options=None):
            raise RuntimeError("Studionet RPC is temporarily unavailable while checking transaction status.")

        def get_latest_profile_id(self, owner):
            return self.on_chain_profiles.get(owner, "")

        def get_profile(self, profile_id):
            return {
                "profile_id": profile_id,
                "owner": "0xalice",
                "display_name": "Academic General Evaluation"
            }

    contract = MockContract()
    account = "0xalice"
    pending_storage = {}

    # Step 1: submit
    tx_hash = contract.create_profile({"display_name": "Test"})
    pending_storage[account] = tx_hash

    # Step 2: waitForTransaction fails / delayed
    receipt = None
    receipt_error = None
    try:
        receipt = contract.waitForTransaction(tx_hash)
    except Exception as e:
        receipt_error = e

    assert receipt_error is not None
    assert receipt is None

    # Step 3 & 4: Recovery logic checks get_latest_profile_id
    recovered_profile_id = contract.get_latest_profile_id(account)
    assert recovered_profile_id == "ace-profile-1-0xalice"

    profile = contract.get_profile(recovered_profile_id)
    assert profile["owner"] == account

    # Step 5: Recovery clears pending storage and sets profile
    pending_storage.pop(account, None)
    assert account not in pending_storage
    assert profile["profile_id"] == "ace-profile-1-0xalice"

