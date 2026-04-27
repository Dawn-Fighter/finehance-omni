"""Glue layer: Setu data session → parsed rows → categorized → stored.

This module is the single entry point used by the Telegram bot's ``/sync``
command and by the webhook handler. Keeping it here means the bot file stays
focused on UX while testable logic lives in a pure module.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

import storage

from .parser import parse_fi_data

logger = logging.getLogger(__name__)


def sync_fi_payload(
    user_id: int | str,
    fi_payload: dict[str, Any],
    *,
    categorizer: Callable[[str], str],
    include_credits: bool = True,
) -> dict[str, int]:
    """Persist a Setu FI payload for ``user_id`` and return counts.

    Returns::

        {
          "fetched": <int>,
          "saved": <int>,
          "duplicates": <int>,
          "credits": <int>,
        }

    ``categorizer`` is injected so tests can pass a deterministic stub instead
    of hitting the HF model. In production wire ``categorizer.get_category``.
    """
    rows = parse_fi_data(fi_payload, skip_credits=False)
    saved = duplicates = credits = 0
    for row in rows:
        if row.get("txn_type") == "CREDIT":
            credits += 1
            if not include_credits:
                continue
            category = "Income"
        else:
            try:
                category = categorizer(row["description"]) or "Other"
            except Exception as exc:
                logger.warning("Categorizer failed for %r: %s", row.get("description"), exc)
                category = "Other"

        inserted_id = storage.save_expense(
            user_id=user_id,
            amount=row["amount"],
            category=category,
            description=row["description"],
            source="bank",
            timestamp=row.get("timestamp"),
            merchant=row.get("merchant"),
            bank_account_id=row.get("bank_account_id"),
            bank_txn_id=row.get("bank_txn_id"),
        )
        if inserted_id is None:
            duplicates += 1
        else:
            saved += 1
        if row.get("bank_account_id"):
            storage.touch_bank_account_synced(row["bank_account_id"])

    return {
        "fetched": len(rows),
        "saved": saved,
        "duplicates": duplicates,
        "credits": credits,
    }


def run_full_sync(
    client: Any,
    user_id: int | str,
    consent_id: str,
    *,
    categorizer: Callable[[str], str],
) -> dict[str, int]:
    """End-to-end: create session, wait for ready (via mock or polled), fetch, save.

    For the real Setu client, ``get_data_session`` should be polled until status
    is ``COMPLETED`` or the session webhook should drive this — but for the demo
    flow we expose the simple "create + wait + fetch" pattern here.
    """
    session = client.create_data_session(consent_id)
    session_id = session["id"]
    storage.upsert_data_session(session_id, consent_id, user_id, session.get("status", "PENDING"))
    # Poll once — both mock and Setu sandbox typically return COMPLETED quickly.
    session_status = client.get_data_session(session_id)
    storage.upsert_data_session(session_id, consent_id, user_id, session_status.get("status", "PENDING"))
    fi_payload = client.fetch_data(session_id)
    return sync_fi_payload(user_id, fi_payload, categorizer=categorizer)
