from pathlib import Path


def test_setup_profile_call_passes_all_committed_profile_fields():
    source = Path("frontend/src/hooks/useAceQueries.ts").read_text(encoding="utf-8")
    assert "contract.create_profile(DEFAULT_PROFILE)" in source
    for field in ("display_name", "profile_uri", "profile_hash", "capabilities_hash"):
        assert f"{field}:" in source
    assert "profile_hash: 'sha256:" in source
    assert "capabilities_hash: 'sha256:" in source
    assert "getLatestProfileId(account" in source
    assert "loadSavedEvaluationProfileIds" not in source
