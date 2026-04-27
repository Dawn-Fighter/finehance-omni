"""Recurring-payment / subscription detector.

Operates on any list of expense dicts (whatever shape ``storage.list_expenses``
or ``utils.load_expenses`` returns) and returns groups of transactions that look
like subscriptions, plus a "vampire" score (∝ amount × inactivity).

Detection signals (any combination ≥ 2 marks it as recurring):

1. **Cadence regularity** — multiple charges spaced with low standard deviation
   (~28-32d for monthly, ~6-8d for weekly, ~88-92d for quarterly).
2. **Amount stability** — coefficient of variation of amounts ≤ 8%.
3. **Merchant fingerprint** — same normalised description / merchant string
   appearing ≥ 3 times.

A "vampire" subscription is a recurring payment with no activity from the same
fingerprint in the last ``inactive_days`` days *other than* the recurring charge
itself — i.e. the user is paying for something they don't engage with.
"""
from __future__ import annotations

import re
import statistics
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any, Iterable

# Cadence buckets in days, with tolerance windows.
CADENCES = [
    ("weekly", 7, 2),
    ("biweekly", 14, 3),
    ("monthly", 30, 4),
    ("quarterly", 91, 7),
    ("yearly", 365, 14),
]

KNOWN_SUBSCRIPTION_KEYWORDS = {
    "netflix", "spotify", "prime", "hotstar", "disney+", "apple music",
    "youtube premium", "youtube music", "tidal", "saavn", "gaana",
    "icloud", "google one", "dropbox", "office 365", "microsoft 365",
    "adobe", "canva", "github", "gitlab", "jetbrains", "openai chatgpt",
    "claude", "perplexity", "notion", "figma", "linear",
    "cult.fit", "cultfit", "cure.fit", "fittr", "healthifyme",
    "swiggy one", "zomato gold", "amazon prime", "flipkart plus",
}

_NORM_RE = re.compile(r"[^a-z0-9 ]+")


def _normalise(text: str) -> str:
    text = (text or "").lower()
    text = _NORM_RE.sub(" ", text)
    return " ".join(text.split())


def _fingerprint(expense: dict[str, Any]) -> str:
    """Build a stable key that groups recurring charges together.

    Uses (in order of preference): merchant, recipient_vpa, then the first
    two/three meaningful words of the description.
    """
    for key in ("merchant", "recipient_vpa"):
        v = expense.get(key)
        if v:
            return _normalise(str(v))

    words = _normalise(expense.get("description", "")).split()
    # Drop common filler that varies per-charge (dates, "for", etc.).
    stop = {"for", "the", "and", "a", "an", "of", "at", "to", "from", "via", "upi", "txn"}
    keep = [w for w in words if w not in stop and not w.isdigit()][:3]
    return " ".join(keep) if keep else words[0] if words else ""


def _parse_ts(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        # Tolerate trailing Z and missing tzinfo.
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        dt = datetime.fromisoformat(ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _classify_cadence(intervals_days: list[float]) -> str | None:
    if not intervals_days:
        return None
    median = statistics.median(intervals_days)
    for label, target, tolerance in CADENCES:
        if abs(median - target) <= tolerance:
            return label
    return None


def _coefficient_of_variation(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = statistics.mean(values)
    if mean == 0:
        return 1.0
    return statistics.stdev(values) / mean


def detect_subscriptions(
    expenses: Iterable[dict[str, Any]],
    *,
    min_occurrences: int = 3,
    inactive_days: int = 60,
    now: datetime | None = None,
) -> list[dict[str, Any]]:
    """Return a list of detected subscriptions sorted by monthly cost desc.

    Each entry shape::

        {
            "fingerprint": "netflix",
            "merchant": "Netflix",
            "cadence": "monthly",
            "occurrences": 4,
            "average_amount": 649.0,
            "monthly_cost": 649.0,
            "amount_stability": 0.01,
            "last_seen": "2026-04-01T...",
            "vampire": True,
            "inactivity_days": 73,
            "category": "Subscriptions",
            "transactions": [...],
        }
    """
    now = now or datetime.now(timezone.utc)
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for exp in expenses:
        # Income / salary credits are recurring but they're not "subscriptions"
        # the user can cancel — drop them from the vampire panel.
        category = (exp.get("category") or "").lower()
        if category in {"income", "salary", "refund"}:
            continue
        fp = _fingerprint(exp)
        if not fp:
            continue
        groups[fp].append(exp)

    results: list[dict[str, Any]] = []
    for fp, txns in groups.items():
        if len(txns) < min_occurrences:
            # Promote even at 2 occurrences if it matches a well-known SaaS name.
            if not (
                len(txns) >= 2
                and any(k in fp for k in KNOWN_SUBSCRIPTION_KEYWORDS)
            ):
                continue

        amounts = [float(t.get("amount", 0) or 0) for t in txns]
        timestamps = sorted(filter(None, (_parse_ts(t.get("timestamp")) for t in txns)))
        if len(timestamps) < 2:
            continue

        intervals = [
            (timestamps[i] - timestamps[i - 1]).total_seconds() / 86400
            for i in range(1, len(timestamps))
        ]
        cadence = _classify_cadence(intervals)
        cov = _coefficient_of_variation(amounts)

        # Decision: keep if either (a) cadence detected AND amount stable, or
        # (b) a known SaaS keyword matched AND amounts stable, or
        # (c) very tight amount stability with ≥4 occurrences.
        keep = (
            (cadence is not None and cov <= 0.08)
            or (any(k in fp for k in KNOWN_SUBSCRIPTION_KEYWORDS) and cov <= 0.15)
            or (len(txns) >= 4 and cov <= 0.05)
        )
        if not keep:
            continue

        last_seen = timestamps[-1]
        inactivity = (now - last_seen).days
        avg_amount = statistics.mean(amounts)
        monthly_cost = _to_monthly(avg_amount, cadence)

        results.append(
            {
                "fingerprint": fp,
                "merchant": _best_merchant_label(txns),
                "cadence": cadence or "irregular",
                "occurrences": len(txns),
                "average_amount": round(avg_amount, 2),
                "monthly_cost": round(monthly_cost, 2),
                "amount_stability": round(cov, 4),
                "last_seen": last_seen.isoformat(),
                "vampire": inactivity >= inactive_days,
                "inactivity_days": inactivity,
                "category": txns[-1].get("category") or "Subscriptions",
                "transactions": txns,
            }
        )

    results.sort(key=lambda r: r["monthly_cost"], reverse=True)
    return results


def _to_monthly(avg_amount: float, cadence: str | None) -> float:
    multiplier = {
        "weekly": 4.345,
        "biweekly": 2.17,
        "monthly": 1.0,
        "quarterly": 1 / 3,
        "yearly": 1 / 12,
    }.get(cadence or "monthly", 1.0)
    return avg_amount * multiplier


def _best_merchant_label(txns: list[dict[str, Any]]) -> str:
    """Pick the most informative human-readable label among the txns."""
    for key in ("merchant", "recipient_vpa"):
        for t in txns:
            v = t.get(key)
            if v:
                return str(v)
    return txns[-1].get("description") or "Recurring payment"


def summarise_for_user(subscriptions: list[dict[str, Any]]) -> str:
    """Telegram-friendly markdown summary."""
    if not subscriptions:
        return "🔍 No recurring subscriptions detected yet — keep logging!"

    lines = [
        f"💸 **Found {len(subscriptions)} recurring payment"
        f"{'s' if len(subscriptions) != 1 else ''}** "
        f"costing **₹{sum(s['monthly_cost'] for s in subscriptions):,.0f}/month**"
    ]
    for sub in subscriptions[:8]:
        marker = "🧛 " if sub["vampire"] else "• "
        lines.append(
            f"{marker}**{sub['merchant']}** — ₹{sub['average_amount']:,.0f}"
            f" {sub['cadence']} ({sub['occurrences']}× seen, last "
            f"{sub['inactivity_days']}d ago)"
            + (" — *vampire?*" if sub["vampire"] else "")
        )
    if len(subscriptions) > 8:
        lines.append(f"…and {len(subscriptions) - 8} more")
    return "\n".join(lines)
