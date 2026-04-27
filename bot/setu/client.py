"""Thin HTTP client for Setu Account Aggregator (Bridge sandbox + production).

Designed to be testable: every method takes a configured client object and uses
``requests`` directly. A separate ``MockSetuAAClient`` lives in ``mock.py`` and
can be swapped in when ``SETU_CLIENT_ID`` is empty so the rest of the app keeps
working end-to-end while we wait for sandbox credentials.

Setu AA flow we implement:
1. ``create_consent``       → user redirected to ``url`` to approve.
2. (webhook) ``CONSENT_STATUS_UPDATE`` → store linked accounts.
3. ``create_data_session``  → trigger FIP fetch.
4. (webhook) ``FI_STATUS_UPDATE``      → poll data when status=READY.
5. ``fetch_data``           → decrypted FI data ready for parser.

Reference docs:
- https://docs.setu.co/data/account-aggregator/api-integration/consent-flow
- https://docs.setu.co/data/account-aggregator/api-integration/data-apis
- https://docs.setu.co/data/account-aggregator/api-integration/notifications
"""
from __future__ import annotations

import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)


class SetuError(RuntimeError):
    """Raised when Setu returns a non-2xx response."""


@dataclass(frozen=True)
class SetuConfig:
    base_url: str = "https://fiu-uat.setu.co"
    client_id: str = ""
    client_secret: str = ""
    product_instance_id: str = ""
    fi_types: tuple[str, ...] = ("DEPOSIT",)
    consent_purpose_code: str = "101"  # 101 = "Loan underwriting" / generic AA purpose
    consent_purpose_text: str = "Personal finance tracking"
    consent_duration_value: int = 12
    consent_duration_unit: str = "MONTH"
    redirect_url: str = "https://example.com/callback"
    fetch_window_days: int = 90

    @classmethod
    def from_env(cls) -> "SetuConfig":
        return cls(
            base_url=os.getenv("SETU_BASE_URL", cls.base_url),
            client_id=os.getenv("SETU_CLIENT_ID", ""),
            client_secret=os.getenv("SETU_CLIENT_SECRET", ""),
            product_instance_id=os.getenv("SETU_PRODUCT_INSTANCE_ID", ""),
            redirect_url=os.getenv(
                "SETU_REDIRECT_URL",
                "https://example.com/callback",
            ),
        )

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.product_instance_id)


class SetuAAClient:
    """Real-network client. Use ``MockSetuAAClient`` (in ``mock.py``) for tests."""

    def __init__(self, config: SetuConfig | None = None, session: requests.Session | None = None):
        self.config = config or SetuConfig.from_env()
        self._session = session or requests.Session()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _headers(self) -> dict[str, str]:
        return {
            "x-client-id": self.config.client_id,
            "x-client-secret": self.config.client_secret,
            "x-product-instance-id": self.config.product_instance_id,
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        url = f"{self.config.base_url.rstrip('/')}{path}"
        headers = {**self._headers(), **kwargs.pop("headers", {})}
        try:
            resp = self._session.request(method, url, headers=headers, timeout=30, **kwargs)
        except requests.RequestException as exc:
            raise SetuError(f"Network error calling Setu: {exc}") from exc
        if resp.status_code >= 400:
            raise SetuError(
                f"Setu {method} {path} → {resp.status_code}: {resp.text[:500]}"
            )
        try:
            return resp.json()
        except ValueError:
            return {"_raw": resp.text}

    # ------------------------------------------------------------------
    # Consent flow
    # ------------------------------------------------------------------
    def create_consent(
        self,
        vua: str,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        """Create a consent request and return Setu's response.

        ``vua`` is the user's virtual UPI/AA handle, e.g. ``9999999999@setu``
        or just the bare mobile number — Setu accepts both for sandbox.

        Returns dict with at least ``id``, ``status``, ``url``.
        """
        now = datetime.now(timezone.utc)
        from_date = from_date or (now - timedelta(days=self.config.fetch_window_days))
        to_date = to_date or now

        payload = {
            "consentDuration": {
                "unit": self.config.consent_duration_unit,
                "value": self.config.consent_duration_value,
            },
            "vua": vua,
            "redirectUrl": self.config.redirect_url,
            "dataRange": {
                "from": from_date.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
                "to": to_date.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            },
            "fiTypes": list(self.config.fi_types),
            "purpose": {
                "code": self.config.consent_purpose_code,
                "text": self.config.consent_purpose_text,
            },
            "context": [],
            "additionalParams": {"tags": tags or ["finehance-omni"]},
        }
        return self._request("POST", "/consents", json=payload)

    def get_consent(self, consent_id: str) -> dict[str, Any]:
        return self._request("GET", f"/consents/{consent_id}")

    # ------------------------------------------------------------------
    # Data flow
    # ------------------------------------------------------------------
    def create_data_session(
        self,
        consent_id: str,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        format_: str = "json",
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        from_date = from_date or (now - timedelta(days=self.config.fetch_window_days))
        to_date = to_date or now
        payload = {
            "consentId": consent_id,
            "dataRange": {
                "from": from_date.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
                "to": to_date.replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            },
            "format": format_,
        }
        return self._request("POST", "/sessions", json=payload)

    def get_data_session(self, session_id: str) -> dict[str, Any]:
        return self._request("GET", f"/sessions/{session_id}")

    def fetch_data(self, session_id: str) -> dict[str, Any]:
        """Fetch decrypted FI data once the session reports COMPLETED/PARTIAL."""
        return self._request("GET", f"/sessions/{session_id}/data")


_mock_singleton: "object | None" = None


def get_default_client() -> "SetuAAClient | object":
    """Return a real Setu client if creds are configured, else the mock client.

    The mock client is cached as a process-level singleton so consent and
    session state created in one bot handler (e.g. ``/connect_bank``) persists
    across subsequent handlers (e.g. ``/sync``). The real client is stateless
    and is created fresh each call.

    Imported lazily so importing ``bot.setu`` never fails when the user hasn't
    set up Setu yet.
    """
    global _mock_singleton

    config = SetuConfig.from_env()
    if config.is_configured:
        logger.info("Using real Setu AA client (%s)", config.base_url)
        return SetuAAClient(config)

    from .mock import MockSetuAAClient

    if _mock_singleton is None:
        logger.warning("Setu credentials missing — using MockSetuAAClient with synthetic data")
        _mock_singleton = MockSetuAAClient(config)
    return _mock_singleton


def reset_default_client() -> None:
    """Test-only helper to clear the cached mock client between cases."""
    global _mock_singleton
    _mock_singleton = None
