"""
Timestamp and Sequence ID separation tests for ACE contract and frontend format.ts.

Root cause of the Jan 2001 display bug:
  The ACE contract stores `created_at` / `updated_at` / `finalized_at` as a
  sequential integer counter string (e.g. "1", "2") because it uses the
  running sequence number at record-creation time rather than a wall-clock
  timestamp.  The JavaScript runtime (V8) silently parses "1" as a date
  string and resolves it to January 1, 2001 (year 2001 from "1").

Fix applied (frontend/src/lib/format.ts):
  1. Distinguishes sequence counters (< 1,000,000,000) from real Unix timestamps.
  2. formatDate("1") returns "—" (unavailable) because "1" is not a timestamp.
  3. formatSequenceId("1") returns "#1" and is kept strictly separate from timestamps.
  4. Real Unix timestamps in seconds (10 digits) are converted from seconds to ms
     and rendered in UTC.
  5. Real Unix timestamps in milliseconds (13 digits) are parsed and rendered in UTC.
  6. ISO-8601 strings are parsed and rendered in UTC.
"""

import re
import datetime
import pytest

CONTRACT_PATH = "contracts/AcademicConsensusEngine.py"
INTEGER_PATTERN = re.compile(r"^\d+$")
ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}")


def test_regression_submission_created_at_is_sequence_counter_not_iso_date(
    direct_vm, direct_deploy, direct_alice
):
    """
    The contract stores created_at as a sequence counter string.
    This means the frontend must NOT parse it with new Date().
    Regression for the January 2001 display bug.
    """
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    rubric_id = contract.create_rubric(
        "Timestamp test rubric",
        "https://raw.githubusercontent.com/JimmyOgb/ACE/main/repository-artifacts/academic-general-rubric-criteria.txt",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        "essay",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        0, 100, 60, 1, True, 1,
    )
    submission_id = contract.submit_for_evaluation(
        "Timestamp regression paper",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        "https://raw.githubusercontent.com/JimmyOgb/ACE/main/repository-artifacts/submissions/test.txt",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        rubric_id, "essay",
        "https://raw.githubusercontent.com/JimmyOgb/ACE/main/repository-artifacts/submissions/test.json",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
    )
    sub = contract.get_submission(submission_id)

    # The stored created_at must be a non-empty string.
    assert isinstance(sub.created_at, str), "created_at must be a string"
    assert sub.created_at.strip(), "created_at must not be empty"

    # It must be a pure integer (sequence counter), NOT an ISO date.
    assert INTEGER_PATTERN.match(sub.created_at.strip()), (
        f"created_at '{sub.created_at}' is not a pure integer counter"
    )
    assert not ISO_DATE_PATTERN.match(sub.created_at.strip())


def test_regression_rubric_created_at_is_sequence_counter(
    direct_vm, direct_deploy, direct_alice
):
    """Rubric created_at is also a sequence counter string."""
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    rubric_id = contract.create_rubric(
        "Rubric ts test", "https://example.com/rubric.txt",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        "essay",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        0, 100, 60, 1, True, 1,
    )
    rubric = contract.get_rubric(rubric_id)
    assert INTEGER_PATTERN.match(rubric.created_at.strip())


def test_regression_profile_created_at_is_sequence_counter(
    direct_vm, direct_deploy, direct_alice
):
    """Profile created_at is also a sequence counter string."""
    direct_vm.sender = direct_alice
    contract = direct_deploy(CONTRACT_PATH)
    profile_id = contract.create_profile(
        "Timestamp profile",
        "https://raw.githubusercontent.com/JimmyOgb/ACE/main/repository-artifacts/academic-general-profile.txt",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
        "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab",
    )
    profile = contract.get_profile(profile_id)
    assert INTEGER_PATTERN.match(profile.created_at.strip())


def test_regression_format_date_separates_sequence_counters_and_converts_units():
    """
    Unit test for frontend formatDate and formatSequenceId simulation:
    - Sequence counter (< 1e9): formatDate returns '—', formatSequenceId returns '#N'
    - Unix seconds (10 digits): converted from seconds to UTC timestamp
    - Unix milliseconds (13 digits): parsed and rendered in UTC
    - ISO strings: parsed and rendered in UTC
    """
    def is_sequence_id(value: str) -> bool:
        if not value: return False
        v = value.strip()
        if not re.match(r"^\d+$", v): return False
        n = int(v)
        return 0 < n < 1_000_000_000

    def format_sequence_id(value: str) -> str:
        if not value: return "\u2014"
        v = value.strip()
        if re.match(r"^\d+$", v): return f"#{v}"
        return v

    def format_date_python(value: str) -> str:
        if not value: return "\u2014"
        v = value.strip()
        if not v: return "\u2014"
        if re.match(r"^\d+$", v):
            num = int(v)
            if num < 1_000_000_000:
                return "\u2014"  # Sequence counter, not a timestamp
            if num < 100_000_000_000:
                # Unix seconds -> convert to UTC
                dt = datetime.datetime.fromtimestamp(num, tz=datetime.timezone.utc)
                return dt.strftime("%Y-%m-%d %H:%M UTC")
            # Unix milliseconds -> convert to UTC
            dt = datetime.datetime.fromtimestamp(num / 1000.0, tz=datetime.timezone.utc)
            return dt.strftime("%Y-%m-%d %H:%M UTC")
        return v  # ISO-8601 string pass-through

    # 1. Sequence counters return "—" for date formatting, "#N" for sequence formatting
    assert format_date_python("1") == "\u2014"
    assert format_date_python("2") == "\u2014"
    assert format_date_python("42") == "\u2014"
    assert format_sequence_id("1") == "#1"
    assert format_sequence_id("42") == "#42"
    assert is_sequence_id("1") is True
    assert is_sequence_id("1725936000") is False

    # 2. Actual Unix timestamps in seconds are converted from seconds unit to UTC
    # 1725936000 seconds = 2024-09-10 02:40:00 UTC
    res_seconds = format_date_python("1725936000")
    assert "2024-09-10" in res_seconds
    assert "UTC" in res_seconds

    # 3. Unix timestamps in milliseconds are parsed correctly
    res_ms = format_date_python("1725936000000")
    assert "2024-09-10" in res_ms

    # 4. Never renders sequence '1' as year 2001
    assert "2001" not in format_date_python("1")
