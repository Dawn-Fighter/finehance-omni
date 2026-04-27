"""Parse Setu AA FI payloads into FineHance Omni expense rows.

Setu's FI data follows the ReBIT FI schema. Each FIP returns one or more
account blocks, each with a list of transactions. We flatten this into the
``save_expense`` row shape so the rest of the pipeline (categorizer, dedup,
charts) doesn't have to care about the source.
"""
from __future__ import annotations

import re
from typing import Any, Iterable

_VPA_RE = re.compile(r"([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)")


def _extract_vpa(narration: str) -> str | None:
    if not narration:
        return None
    m = _VPA_RE.search(narration)
    return m.group(1) if m else None


def _extract_merchant(narration: str) -> str:
    """Pull a human-readable merchant out of a UPI/IMPS/NEFT narration."""
    if not narration:
        return ""
    raw = narration.strip()
    # Strip common prefixes like "UPI/", "POS/", "NEFT-"
    for prefix in ("UPI/", "UPI-", "IMPS/", "IMPS-", "NEFT-", "NEFT/", "POS/", "ATM/"):
        if raw.upper().startswith(prefix):
            raw = raw[len(prefix):]
            break
    # Remove VPA from the narration string for the merchant label
    raw = _VPA_RE.sub("", raw)
    parts = [p.strip() for p in re.split(r"[/|]", raw) if p.strip()]
    if parts:
        return parts[0].title()
    return raw.title()


def parse_fi_data(
    fi_payload: dict[str, Any],
    *,
    skip_credits: bool = False,
) -> list[dict[str, Any]]:
    """Flatten a Setu FI payload into a list of expense-row dicts.

    Each row uses the same field names accepted by ``storage.save_expense``::

        {
          "amount": float,
          "description": str,         # human-friendly
          "merchant": str | None,
          "recipient_vpa": str | None,
          "bank_account_id": str,     # linkRefNumber from Setu
          "bank_txn_id": str,         # txnId from Setu (used for dedup)
          "timestamp": str,           # ISO 8601
          "txn_type": "DEBIT"|"CREDIT",
          "mode": str | None,
        }
    """
    rows: list[dict[str, Any]] = []
    for fip in fi_payload.get("fips", []) or []:
        for account in fip.get("accounts", []) or []:
            link_ref = account.get("linkRefNumber")
            txns_block = (
                account.get("data", {})
                .get("Account", {})
                .get("Transactions", {})
                .get("Transaction", [])
            )
            if isinstance(txns_block, dict):
                txns_block = [txns_block]
            for txn in txns_block:
                tx_type = (txn.get("type") or "").upper()
                if skip_credits and tx_type == "CREDIT":
                    continue
                amount = float(txn.get("amount") or 0)
                if amount <= 0:
                    continue
                narration = txn.get("narration") or ""
                vpa = _extract_vpa(narration)
                merchant = _extract_merchant(narration)
                description = _description_from_narration(narration, tx_type, merchant, vpa)

                rows.append(
                    {
                        "amount": amount,
                        "description": description,
                        "merchant": merchant or None,
                        "recipient_vpa": vpa,
                        "bank_account_id": link_ref,
                        "bank_txn_id": txn.get("txnId"),
                        "timestamp": txn.get("transactionTimestamp"),
                        "txn_type": tx_type or None,
                        "mode": txn.get("mode") or None,
                    }
                )
    return rows


def _description_from_narration(
    narration: str,
    tx_type: str,
    merchant: str,
    vpa: str | None,
) -> str:
    if tx_type == "CREDIT":
        return f"Credit: {merchant or narration[:50]}"
    if vpa and merchant:
        return f"{merchant} via UPI ({vpa})"
    if merchant:
        return merchant
    return narration[:80] or "Bank transaction"
