"""In-memory mock of Setu AA for local demos when sandbox creds aren't set.

Mirrors the public surface of :class:`bot.setu.client.SetuAAClient` but returns
realistic-looking synthetic data. The mock simulates the asynchronous webhook
flow by transitioning consents/sessions through statuses on each poll, so you
can demo the full UX without any external service.
"""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from .client import SetuConfig

# A small, realistic synthetic statement that exercises every category the
# bot can show off (Transfers, Subscriptions, Food Delivery, Gas & Fuel, etc).
_SYNTHETIC_TEMPLATE: list[dict[str, Any]] = [
    {"narration": "UPI/RAMESH KUMAR/oksbi/Friends payment", "amount": 200, "type": "DEBIT", "days_ago": 1},
    {"narration": "UPI/SWIGGY ORDER/swiggy.in@axis", "amount": 423, "type": "DEBIT", "days_ago": 1},
    {"narration": "UPI/HP PETROL PUMP/petrolpump@ybl", "amount": 1500, "type": "DEBIT", "days_ago": 2},
    {"narration": "NETFLIX SUBSCRIPTION", "amount": 649, "type": "DEBIT", "days_ago": 3},
    {"narration": "UPI/STARBUCKS/starbucks@hdfc", "amount": 320, "type": "DEBIT", "days_ago": 4},
    {"narration": "SPOTIFY INDIA", "amount": 119, "type": "DEBIT", "days_ago": 5},
    {"narration": "UPI/UBER INDIA/uber@axis", "amount": 287, "type": "DEBIT", "days_ago": 6},
    {"narration": "UPI/BIGBASKET/bigbasket@icici", "amount": 1245, "type": "DEBIT", "days_ago": 7},
    {"narration": "SALARY CREDIT - ACME CORP", "amount": 75000, "type": "CREDIT", "days_ago": 7},
    {"narration": "UPI/ZOMATO/zomato@hdfc", "amount": 380, "type": "DEBIT", "days_ago": 9},
    {"narration": "NETFLIX SUBSCRIPTION", "amount": 649, "type": "DEBIT", "days_ago": 33},
    {"narration": "SPOTIFY INDIA", "amount": 119, "type": "DEBIT", "days_ago": 35},
    {"narration": "CULT.FIT MEMBERSHIP", "amount": 1273, "type": "DEBIT", "days_ago": 35},
    {"narration": "HOTSTAR SUBSCRIPTION", "amount": 299, "type": "DEBIT", "days_ago": 38},
    {"narration": "UPI/AMAZON SHOPPING/amazon@apl", "amount": 1899, "type": "DEBIT", "days_ago": 40},
    {"narration": "UPI/ELECTRICITY BILL/bescom@ybl", "amount": 1820, "type": "DEBIT", "days_ago": 42},
    {"narration": "NETFLIX SUBSCRIPTION", "amount": 649, "type": "DEBIT", "days_ago": 63},
    {"narration": "SPOTIFY INDIA", "amount": 119, "type": "DEBIT", "days_ago": 65},
    {"narration": "CULT.FIT MEMBERSHIP", "amount": 1273, "type": "DEBIT", "days_ago": 65},
    {"narration": "HOTSTAR SUBSCRIPTION", "amount": 299, "type": "DEBIT", "days_ago": 68},
    {"narration": "UPI/PIZZAHUT/pizzahut@hdfc", "amount": 540, "type": "DEBIT", "days_ago": 75},
    {"narration": "SALARY CREDIT - ACME CORP", "amount": 75000, "type": "CREDIT", "days_ago": 37},
    {"narration": "SALARY CREDIT - ACME CORP", "amount": 75000, "type": "CREDIT", "days_ago": 67},
]


class MockSetuAAClient:
    """Stateful mock of the Setu AA client."""

    def __init__(self, config: SetuConfig | None = None):
        self.config = config or SetuConfig()
        self._consents: dict[str, dict[str, Any]] = {}
        self._sessions: dict[str, dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Consent
    # ------------------------------------------------------------------
    def create_consent(self, vua: str, **_: Any) -> dict[str, Any]:
        consent_id = str(uuid.uuid4())
        record = {
            "id": consent_id,
            "status": "PENDING",
            "url": f"https://mock.setu.co/consents/webview/{consent_id}",
            "vua": vua,
            "linkedAccounts": [
                {
                    "linkRefNumber": str(uuid.uuid4()),
                    "fipId": "setu-fip",
                    "fiType": "DEPOSIT",
                    "accType": "SAVINGS",
                    "maskedAccNumber": "XXXXXXXX6053",
                }
            ],
        }
        self._consents[consent_id] = record
        return record

    def get_consent(self, consent_id: str) -> dict[str, Any]:
        record = self._consents.get(consent_id)
        if not record:
            raise KeyError(consent_id)
        # Simulate user approval after one poll.
        if record["status"] == "PENDING":
            record["status"] = "ACTIVE"
        return record

    # ------------------------------------------------------------------
    # Data session
    # ------------------------------------------------------------------
    def create_data_session(self, consent_id: str, **_: Any) -> dict[str, Any]:
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {
            "id": session_id,
            "consentId": consent_id,
            "status": "PENDING",
            "data": None,
        }
        return {"id": session_id, "consentId": consent_id, "status": "PENDING"}

    def get_data_session(self, session_id: str) -> dict[str, Any]:
        record = self._sessions.get(session_id)
        if not record:
            raise KeyError(session_id)
        if record["status"] == "PENDING":
            record["status"] = "COMPLETED"
        return {"id": session_id, "status": record["status"], "consentId": record["consentId"]}

    def fetch_data(self, session_id: str) -> dict[str, Any]:
        record = self._sessions.get(session_id)
        if not record:
            raise KeyError(session_id)
        return _build_synthetic_fi_payload(record["consentId"], self._consents.get(record["consentId"], {}))


def _build_synthetic_fi_payload(consent_id: str, consent_record: dict[str, Any]) -> dict[str, Any]:
    """Generate a Setu-shaped FI payload from the synthetic template.

    Transaction IDs are deterministic per (consent_id, template index) so that
    re-syncing the same consent produces the same txn IDs and dedup actually
    works — matches the behaviour of the real Setu sandbox.
    """
    now = datetime.now(timezone.utc)
    transactions = []
    for idx, tmpl in enumerate(_SYNTHETIC_TEMPLATE):
        ts = now - timedelta(days=tmpl["days_ago"], hours=(idx % 23))
        txn_id = f"MOCK-{consent_id[:8]}-{idx:03d}"
        transactions.append(
            {
                "txnId": txn_id,
                "type": tmpl["type"],
                "amount": tmpl["amount"],
                "narration": tmpl["narration"],
                "transactionTimestamp": ts.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
                "valueDate": ts.date().isoformat(),
                "currentBalance": 50000.0,
                "mode": "UPI" if "UPI" in tmpl["narration"] else "OTHERS",
            }
        )
    linked = consent_record.get("linkedAccounts", [])
    fip_id = (linked[0] if linked else {}).get("fipId", "setu-fip")
    masked = (linked[0] if linked else {}).get("maskedAccNumber", "XXXXXXXX6053")
    return {
        "fips": [
            {
                "fipId": fip_id,
                "accounts": [
                    {
                        "linkRefNumber": (linked[0] if linked else {}).get("linkRefNumber", str(uuid.uuid4())),
                        "maskedAccNumber": masked,
                        "fiType": "DEPOSIT",
                        "data": {
                            "Account": {
                                "Summary": {
                                    "currentBalance": 50000.0,
                                    "currency": "INR",
                                },
                                "Transactions": {"Transaction": transactions},
                            }
                        },
                    }
                ],
            }
        ],
        "consentId": consent_id,
    }
