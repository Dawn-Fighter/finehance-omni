"""SQLite-backed storage for FineHance Omni.

Replaces the concurrent-unsafe JSON file in ``data/expenses.json``. All public
functions are safe to call from multiple async handlers because each operation
opens a short-lived connection and SQLite serialises writes via its lock file.

The module also keeps a backward-compatible ``load_expenses``/``save_expense``
surface so the Streamlit dashboard and existing tests continue to work.
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterable

logger = logging.getLogger(__name__)

DB_PATH = os.getenv(
    "FINEHANCE_DB_PATH",
    os.path.join(os.path.dirname(__file__), "..", "data", "finehance.db"),
)
DB_PATH = os.path.abspath(DB_PATH)

LEGACY_JSON_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "data", "expenses.json")
)

_init_lock = threading.Lock()
_initialised = False


SCHEMA = """
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    merchant TEXT,
    bank_account_id TEXT,
    bank_txn_id TEXT,
    recipient_vpa TEXT,
    fingerprint TEXT,
    merged_into INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_timestamp ON expenses(timestamp);
-- SQLite treats NULL != NULL in unique indexes, which would defeat dedup for
-- UPI-screenshot rows that have a txn ref but no linked bank account. Coalesce
-- both sides of the index to a sentinel so identical (NULL, ref) pairs collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_bank_unique
    ON expenses(
        COALESCE(bank_account_id, ''),
        COALESCE(user_id, ''),
        bank_txn_id
    )
    WHERE bank_txn_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    setu_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    consent_id TEXT NOT NULL,
    fip_id TEXT NOT NULL,
    fi_type TEXT,
    acc_type TEXT,
    masked_acc_number TEXT,
    last_synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id);

CREATE TABLE IF NOT EXISTS data_sessions (
    id TEXT PRIMARY KEY,
    consent_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);
"""


@contextmanager
def _connect() -> Iterable[sqlite3.Connection]:
    """Yield a SQLite connection with sane defaults."""
    _ensure_initialised()
    conn = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()


def _ensure_initialised() -> None:
    global _initialised
    if _initialised:
        return
    with _init_lock:
        if _initialised:
            return
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with sqlite3.connect(DB_PATH, timeout=30) as conn:
            conn.executescript(SCHEMA)
            _apply_migrations(conn)
            conn.commit()
        _initialised = True
        _maybe_import_legacy_json()


def _apply_migrations(conn: sqlite3.Connection) -> None:
    """Best-effort additive migrations for DBs created by older versions."""
    cols = {row[1] for row in conn.execute("PRAGMA table_info(expenses)")}
    if "recipient_vpa" not in cols:
        try:
            conn.execute("ALTER TABLE expenses ADD COLUMN recipient_vpa TEXT")
        except sqlite3.OperationalError as exc:
            logger.warning("Could not add recipient_vpa column: %s", exc)


def _maybe_import_legacy_json() -> None:
    """One-time import of ``data/expenses.json`` into SQLite if present and DB empty."""
    if not os.path.exists(LEGACY_JSON_PATH):
        return
    try:
        with sqlite3.connect(DB_PATH, timeout=30) as conn:
            cur = conn.execute("SELECT COUNT(*) FROM expenses")
            (count,) = cur.fetchone()
            if count > 0:
                return
            with open(LEGACY_JSON_PATH, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if not isinstance(data, dict):
                return
            imported = 0
            for user_id, expenses in data.items():
                if not isinstance(expenses, list):
                    continue
                for exp in expenses:
                    try:
                        conn.execute(
                            """
                            INSERT INTO expenses
                                (user_id, amount, category, description, source, timestamp)
                            VALUES (?, ?, ?, ?, ?, ?)
                            """,
                            (
                                str(user_id),
                                float(exp.get("amount", 0) or 0),
                                str(exp.get("category") or "Other"),
                                str(exp.get("description") or ""),
                                str(exp.get("source") or "text"),
                                str(exp.get("timestamp") or _now_iso()),
                            ),
                        )
                        imported += 1
                    except Exception as exc:
                        logger.warning("Skip legacy row: %s", exc)
            conn.commit()
            if imported:
                logger.info("Imported %d legacy expenses into SQLite", imported)
    except Exception as exc:
        logger.warning("Legacy JSON import skipped: %s", exc)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# Expense CRUD
# ---------------------------------------------------------------------------


def save_expense(
    user_id: int | str,
    amount: float,
    category: str,
    description: str,
    source: str = "text",
    timestamp: str | None = None,
    merchant: str | None = None,
    bank_account_id: str | None = None,
    bank_txn_id: str | None = None,
    recipient_vpa: str | None = None,
    fingerprint: str | None = None,
) -> int | None:
    """Insert one expense. Returns row id, or None if a duplicate bank txn was skipped."""
    ts = timestamp or _now_iso()
    with _connect() as conn:
        try:
            cur = conn.execute(
                """
                INSERT INTO expenses
                    (user_id, amount, category, description, source, timestamp,
                     merchant, bank_account_id, bank_txn_id, recipient_vpa, fingerprint)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(user_id),
                    float(amount),
                    category or "Other",
                    description or "",
                    source,
                    ts,
                    merchant,
                    bank_account_id,
                    bank_txn_id,
                    recipient_vpa,
                    fingerprint,
                ),
            )
            return cur.lastrowid
        except sqlite3.IntegrityError as exc:
            # Most likely the unique (bank_account_id, bank_txn_id) constraint —
            # i.e. we've already imported this bank transaction before.
            logger.debug("Duplicate bank txn skipped: %s", exc)
            return None


def list_expenses(user_id: int | str, include_merged: bool = False) -> list[dict[str, Any]]:
    sql = "SELECT * FROM expenses WHERE user_id = ?"
    if not include_merged:
        sql += " AND merged_into IS NULL"
    sql += " ORDER BY timestamp DESC"
    with _connect() as conn:
        rows = conn.execute(sql, (str(user_id),)).fetchall()
    return [dict(r) for r in rows]


def load_expenses() -> dict[str, list[dict[str, Any]]]:
    """Backward-compatible shape used by the Streamlit dashboard and tests."""
    out: dict[str, list[dict[str, Any]]] = {}
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM expenses WHERE merged_into IS NULL ORDER BY timestamp"
        ).fetchall()
    for r in rows:
        out.setdefault(r["user_id"], []).append(
            {
                "id": r["id"],
                "amount": r["amount"],
                "category": r["category"],
                "description": r["description"],
                "source": r["source"],
                "timestamp": r["timestamp"],
                "merchant": r["merchant"],
                "bank_account_id": r["bank_account_id"],
            }
        )
    return out


def mark_merged(child_id: int, parent_id: int) -> None:
    with _connect() as conn:
        conn.execute("UPDATE expenses SET merged_into = ? WHERE id = ?", (parent_id, child_id))


# ---------------------------------------------------------------------------
# Setu AA: consents, bank accounts, data sessions
# ---------------------------------------------------------------------------


def upsert_consent(consent_id: str, user_id: int | str, status: str, setu_url: str | None = None) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO consents (id, user_id, status, setu_url, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                setu_url = COALESCE(excluded.setu_url, consents.setu_url),
                updated_at = datetime('now')
            """,
            (consent_id, str(user_id), status, setu_url),
        )


def get_consent(consent_id: str) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM consents WHERE id = ?", (consent_id,)).fetchone()
    return dict(row) if row else None


def list_active_consents(user_id: int | str) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM consents WHERE user_id = ? AND status = 'ACTIVE'",
            (str(user_id),),
        ).fetchall()
    return [dict(r) for r in rows]


def upsert_bank_account(
    link_ref: str,
    user_id: int | str,
    consent_id: str,
    fip_id: str,
    fi_type: str | None,
    acc_type: str | None,
    masked_acc_number: str | None,
) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO bank_accounts
                (id, user_id, consent_id, fip_id, fi_type, acc_type, masked_acc_number)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                fip_id = excluded.fip_id,
                fi_type = excluded.fi_type,
                acc_type = excluded.acc_type,
                masked_acc_number = excluded.masked_acc_number
            """,
            (link_ref, str(user_id), consent_id, fip_id, fi_type, acc_type, masked_acc_number),
        )


def list_bank_accounts(user_id: int | str) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY created_at DESC",
            (str(user_id),),
        ).fetchall()
    return [dict(r) for r in rows]


def touch_bank_account_synced(link_ref: str) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE bank_accounts SET last_synced_at = datetime('now') WHERE id = ?",
            (link_ref,),
        )


def upsert_data_session(session_id: str, consent_id: str, user_id: int | str, status: str) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO data_sessions (id, consent_id, user_id, status)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                completed_at = CASE WHEN excluded.status IN ('COMPLETED', 'PARTIAL', 'FAILED')
                                    THEN datetime('now') ELSE data_sessions.completed_at END
            """,
            (session_id, consent_id, str(user_id), status),
        )


def get_data_session(session_id: str) -> dict[str, Any] | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM data_sessions WHERE id = ?", (session_id,)).fetchone()
    return dict(row) if row else None
