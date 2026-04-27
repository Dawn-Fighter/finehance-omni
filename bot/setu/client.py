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
import time
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
    # Setu's OAuth-authenticated AA endpoint base. Sandbox is uat.setu.co; in
    # production override SETU_BASE_URL to https://prod.setu.co.
    base_url: str = "https://uat.setu.co"
    # Path prefix Setu added when they introduced OAuth — the API moved from
    # /api/(path) to /api/v2/(path). All calls below are relative to this.
    api_prefix: str = "/api/v2"
    # Token endpoint for the client-credentials exchange.
    token_path: str = "/api/v2/auth/token"
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
            api_prefix=os.getenv("SETU_API_PREFIX", cls.api_prefix),
            token_path=os.getenv("SETU_TOKEN_PATH", cls.token_path),
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
    """Real-network client. Use ``MockSetuAAClient`` (in ``mock.py``) for tests.

    Authenticates via Setu OAuth: clientID + secret → short-lived bearer token,
    cached in-memory until ``expiresIn`` (refreshed automatically with a small
    safety margin). Every API call sends ``Authorization: Bearer <token>`` plus
    ``x-product-instance-id`` per Setu Bridge's OAuth-mode API contract.
    """

    # Refresh tokens this many seconds before they're due to expire so we never
    # send an already-expired token on a request that's mid-flight.
    _TOKEN_REFRESH_MARGIN_SECONDS = 60

    def __init__(self, config: SetuConfig | None = None, session: requests.Session | None = None):
        self.config = config or SetuConfig.from_env()
        self._session = session or requests.Session()
        self._token: str | None = None
        self._token_expires_at: float = 0.0

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _fetch_token(self) -> str:
        """Exchange client_id + secret for a short-lived bearer token."""
        url = f"{self.config.base_url.rstrip('/')}{self.config.token_path}"
        try:
            resp = self._session.post(
                url,
                json={"clientID": self.config.client_id, "secret": self.config.client_secret},
                headers={"Content-Type": "application/json"},
                timeout=30,
            )
        except requests.RequestException as exc:
            raise SetuError(f"Network error calling Setu auth: {exc}") from exc
        if resp.status_code >= 400:
            raise SetuError(
                f"Setu auth POST {self.config.token_path} → {resp.status_code}: {resp.text[:500]}"
            )
        try:
            body = resp.json()
        except ValueError as exc:
            raise SetuError(f"Setu auth returned non-JSON: {resp.text[:200]}") from exc
        # Setu's response shape is ``{"data": {"token": ..., "expiresIn": ...}, "success": true, ...}``
        # but tolerate the flatter ``{"token": ..., "expiresIn": ...}`` shape too.
        data = body.get("data", body) or {}
        token = data.get("token") or data.get("access_token") or body.get("token")
        if not token:
            raise SetuError(f"Setu auth response missing token: {body}")
        expires_in = float(data.get("expiresIn") or body.get("expiresIn") or 3600)
        self._token = str(token)
        self._token_expires_at = time.time() + max(60.0, expires_in - self._TOKEN_REFRESH_MARGIN_SECONDS)
        return self._token

    def _ensure_token(self) -> str:
        if self._token and time.time() < self._token_expires_at:
            return self._token
        return self._fetch_token()

    def _headers(self) -> dict[str, str]:
        token = self._ensure_token()
        return {
            "Authorization": f"Bearer {token}",
            "x-product-instance-id": self.config.product_instance_id,
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        # ``path`` is given relative to the AA API root (e.g. "/consents"). The
        # OAuth-mode endpoint lives under config.api_prefix ("/api/v2" by
        # default), so we prefix it here. Pre-prefixed paths pass through.
        if path.startswith(self.config.api_prefix):
            full_path = path
        else:
            full_path = f"{self.config.api_prefix.rstrip('/')}{path}"
        url = f"{self.config.base_url.rstrip('/')}{full_path}"
        headers = {**self._headers(), **kwargs.pop("headers", {})}
        try:
            resp = self._session.request(method, url, headers=headers, timeout=30, **kwargs)
        except requests.RequestException as exc:
            raise SetuError(f"Network error calling Setu: {exc}") from exc
        # If the token expired between _ensure_token and the actual call, retry once.
        if resp.status_code in (401, 403) and self._token:
            self._token = None
            headers = {**self._headers(), **kwargs.get("headers", {})}
            try:
                resp = self._session.request(method, url, headers=headers, timeout=30, **kwargs)
            except requests.RequestException as exc:
                raise SetuError(f"Network error calling Setu (retry): {exc}") from exc
        if resp.status_code >= 400:
            raise SetuError(
                f"Setu {method} {full_path} → {resp.status_code}: {resp.text[:500]}"
            )
        try:
            body = resp.json()
        except ValueError:
            return {"_raw": resp.text}
        # Setu's success envelope is ``{"data": {...}, "success": true}`` for
        # most AA endpoints; unwrap it so callers see the inner payload
        # uniformly. If the body has no ``data`` key, return as-is.
        if isinstance(body, dict) and "data" in body and isinstance(body["data"], dict):
            return body["data"]
        return body

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
