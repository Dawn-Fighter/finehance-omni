"""FastAPI webhook server for Setu Account Aggregator notifications.

Setu posts two notification types (see
https://docs.setu.co/data/account-aggregator/api-integration/notifications):

- ``CONSENT_STATUS_UPDATE``: consent moved between PENDING / ACTIVE / REJECTED /
  REVOKED / PAUSED / EXPIRED. ACTIVE includes the linked accounts.
- ``FI_STATUS_UPDATE``: the data session your FIU created has progressed; when
  combined status is COMPLETED you can fetch the FI data.

Run with::

    uvicorn bot.setu.webhook:app --host 0.0.0.0 --port 8000

Then point a tunnel (cloudflared / ngrok) at that port and configure the public
URL in your Setu Bridge dashboard.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

# Ensure ``bot/`` is on sys.path so ``import storage`` works whether you run
# this as ``python -m bot.setu.webhook`` or via uvicorn directly.
_BOT_DIR = Path(__file__).resolve().parents[1]
if str(_BOT_DIR) not in sys.path:
    sys.path.insert(0, str(_BOT_DIR))

import storage  # noqa: E402  (import after sys.path tweak)

from .client import get_default_client  # noqa: E402
from .sync import sync_fi_payload  # noqa: E402

logger = logging.getLogger(__name__)


try:
    from fastapi import FastAPI, HTTPException, Request
except ImportError as exc:  # pragma: no cover - optional dep
    raise SystemExit(
        "FastAPI is required for the Setu webhook server. "
        "Install it with: pip install fastapi uvicorn"
    ) from exc


app = FastAPI(title="FineHance Omni — Setu AA Webhook")

WEBHOOK_SHARED_SECRET = os.getenv("SETU_WEBHOOK_SECRET", "")


def _check_auth(request: Request) -> None:
    """If a shared secret is configured, require it on every webhook hit.

    Setu lets you configure a custom Authorization header on Bridge; we just
    verify it matches what the operator set in env.
    """
    if not WEBHOOK_SHARED_SECRET:
        return
    auth = request.headers.get("authorization") or request.headers.get("x-webhook-secret")
    if auth != WEBHOOK_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="invalid webhook secret")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/webhook/setu/consent")
async def consent_notification(request: Request) -> dict[str, Any]:
    _check_auth(request)
    payload = await request.json()
    consent_id = payload.get("consentId")
    notification_type = payload.get("type")
    data = payload.get("data") or {}
    status = data.get("status")
    logger.info("Setu consent webhook: %s consent=%s status=%s", notification_type, consent_id, status)

    if not consent_id or not status:
        raise HTTPException(status_code=400, detail="missing consentId/status")

    consent = storage.get_consent(consent_id)
    if not consent:
        # Webhook arrived before our local create_consent recorded it — store
        # what we know and move on.
        storage.upsert_consent(consent_id, user_id="unknown", status=status)
    else:
        storage.upsert_consent(consent_id, consent["user_id"], status)

    if status == "ACTIVE":
        for account in data.get("detail", {}).get("accounts", []) or []:
            storage.upsert_bank_account(
                link_ref=account.get("linkRefNumber"),
                user_id=(consent or {}).get("user_id", "unknown"),
                consent_id=consent_id,
                fip_id=account.get("fipId", ""),
                fi_type=account.get("fiType"),
                acc_type=account.get("accType"),
                masked_acc_number=account.get("maskedAccNumber"),
            )
    return {"received": True, "consentId": consent_id, "status": status}


@app.post("/webhook/setu/fi")
async def fi_notification(request: Request) -> dict[str, Any]:
    _check_auth(request)
    payload = await request.json()
    session_id = payload.get("sessionId") or (payload.get("data") or {}).get("sessionId")
    combined_status = (payload.get("data") or {}).get("status") or payload.get("status")
    logger.info("Setu FI webhook: session=%s status=%s", session_id, combined_status)

    if not session_id:
        raise HTTPException(status_code=400, detail="missing sessionId")

    session = storage.get_data_session(session_id)
    if session and combined_status:
        storage.upsert_data_session(session_id, session["consent_id"], session["user_id"], combined_status)

    if combined_status in {"COMPLETED", "PARTIAL"}:
        client = get_default_client()
        fi_payload = client.fetch_data(session_id)
        # We need a categorizer here; lazy import to avoid pulling HF/transformers
        # into the webhook process if not needed.
        try:
            from categorizer import get_category  # type: ignore
        except Exception:
            def get_category(text: str) -> str:  # type: ignore
                return "Other"
        if session:
            sync_fi_payload(session["user_id"], fi_payload, categorizer=get_category)
    return {"received": True, "sessionId": session_id, "status": combined_status}
