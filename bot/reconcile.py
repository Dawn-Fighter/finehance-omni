"""Reconciliation / dedup between manual and bank-sourced transactions.

When a user logs an expense manually (text/voice/image) and Setu AA later pulls
the same transaction from the bank, we want to merge them into one entry rather
than counting it twice. The same applies to UPI screenshots vs bank-fetched UPI
debits.

A match is declared when:
- amounts agree within ``amount_tolerance`` (₹1 by default — banks round paise),
- timestamps are within ``time_window_minutes`` of each other,
- AND at least one of:
    - same UPI ref / RRN (``txn_ref``),
    - bank txn description contains the manual entry's merchant or recipient VPA,
    - description fuzz-match score ≥ ``fuzz_threshold``.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any

import storage

_NORM_RE = re.compile(r"[^a-z0-9 ]+")


def _normalise(text: str) -> str:
    return " ".join(_NORM_RE.sub(" ", (text or "").lower()).split())


def _parse_ts(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        dt = datetime.fromisoformat(ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _fuzz(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, _normalise(a), _normalise(b)).ratio()


def _candidates_match(
    bank: dict[str, Any],
    manual: dict[str, Any],
    *,
    amount_tolerance: float,
    time_window_minutes: int,
    fuzz_threshold: float,
) -> tuple[bool, str]:
    """Return (matched, reason) for a (bank, manual) pair."""
    if abs(float(bank["amount"]) - float(manual["amount"])) > amount_tolerance:
        return False, "amount mismatch"

    # Strongest signal: same UPI ref id. Check this BEFORE the time-window
    # rejection — a UPI screenshot's parsed timestamp can be hours off the
    # bank's posted timestamp (or missing entirely), but if the ref ids match
    # the two records describe the same payment regardless of the time gap.
    if bank.get("bank_txn_id") and manual.get("bank_txn_id"):
        if bank["bank_txn_id"] == manual["bank_txn_id"]:
            return True, "same txn_ref"

    ts_bank = _parse_ts(bank.get("timestamp"))
    ts_manual = _parse_ts(manual.get("timestamp"))
    if ts_bank and ts_manual:
        delta = abs((ts_bank - ts_manual).total_seconds()) / 60
        if delta > time_window_minutes:
            return False, f"time gap {delta:.0f}m"

    bank_blob = " ".join(
        filter(
            None,
            [
                bank.get("description") or "",
                bank.get("merchant") or "",
            ],
        )
    )
    manual_blob = " ".join(
        filter(
            None,
            [
                manual.get("description") or "",
                manual.get("merchant") or "",
            ],
        )
    )

    # Containment match (bank statement strings tend to be longer / verbose).
    if manual.get("merchant"):
        if _normalise(manual["merchant"]) in _normalise(bank_blob):
            return True, "merchant in bank desc"
    if manual.get("recipient_vpa"):
        if _normalise(manual["recipient_vpa"]) in _normalise(bank_blob):
            return True, "VPA in bank desc"

    score = _fuzz(bank_blob, manual_blob)
    if score >= fuzz_threshold:
        return True, f"fuzz {score:.2f}"

    return False, "no signal"


def find_duplicates(
    expenses: list[dict[str, Any]],
    *,
    amount_tolerance: float = 1.0,
    time_window_minutes: int = 90,
    fuzz_threshold: float = 0.72,
) -> list[tuple[dict[str, Any], dict[str, Any], str]]:
    """Find (bank_expense, manual_expense, reason) duplicate pairs in a list."""
    bank = [e for e in expenses if e.get("source") == "bank"]
    manual = [e for e in expenses if e.get("source") in {"text", "voice", "image", "upi_screenshot"}]
    if not bank or not manual:
        return []

    matched: list[tuple[dict[str, Any], dict[str, Any], str]] = []
    used_manual_ids: set[int] = set()

    for b in bank:
        best: tuple[dict[str, Any], str] | None = None
        for m in manual:
            if m.get("id") in used_manual_ids:
                continue
            ok, reason = _candidates_match(
                b,
                m,
                amount_tolerance=amount_tolerance,
                time_window_minutes=time_window_minutes,
                fuzz_threshold=fuzz_threshold,
            )
            if ok:
                best = (m, reason)
                break
        if best:
            matched.append((b, best[0], best[1]))
            used_manual_ids.add(best[0].get("id"))
    return matched


def reconcile_user(user_id: int | str) -> list[tuple[dict[str, Any], dict[str, Any], str]]:
    """Reconcile a user's expenses end-to-end. Marks the manual entry as merged
    into the bank entry (bank entry is treated as the canonical source of truth)."""
    expenses = storage.list_expenses(user_id, include_merged=False)
    pairs = find_duplicates(expenses)
    for bank_exp, manual_exp, _reason in pairs:
        if manual_exp.get("id") and bank_exp.get("id"):
            storage.mark_merged(manual_exp["id"], bank_exp["id"])
    return pairs


def summarise_for_user(pairs: list[tuple[dict[str, Any], dict[str, Any], str]]) -> str:
    if not pairs:
        return "✅ No duplicate transactions detected."
    lines = [f"🔁 **Merged {len(pairs)} duplicate"
             f"{'s' if len(pairs) != 1 else ''}**"]
    for bank_exp, manual_exp, reason in pairs[:8]:
        lines.append(
            f"• ₹{float(bank_exp['amount']):,.0f} — bank entry kept "
            f"(*{reason}*); manual log merged."
        )
    if len(pairs) > 8:
        lines.append(f"…and {len(pairs) - 8} more")
    return "\n".join(lines)
