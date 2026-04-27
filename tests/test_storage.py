import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOT_DIR = ROOT / "bot"
sys.path.insert(0, str(BOT_DIR))


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        os.environ["FINEHANCE_DB_PATH"] = os.path.join(self.tmpdir.name, "test.db")
        # Force re-import so module-level path is picked up.
        for mod in ("storage",):
            if mod in sys.modules:
                del sys.modules[mod]
        import storage  # noqa: F401
        self.storage = storage

    def tearDown(self):
        self.tmpdir.cleanup()
        os.environ.pop("FINEHANCE_DB_PATH", None)
        for mod in ("storage",):
            if mod in sys.modules:
                del sys.modules[mod]

    def test_save_and_list_expense(self):
        rid = self.storage.save_expense(
            user_id="42",
            amount=200.0,
            category="Transfers",
            description="UPI to friend",
            source="upi_screenshot",
        )
        self.assertIsInstance(rid, int)
        rows = self.storage.list_expenses("42")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["amount"], 200.0)
        self.assertEqual(rows[0]["category"], "Transfers")

    def test_bank_txn_uniqueness_skips_duplicate(self):
        first = self.storage.save_expense(
            user_id="42",
            amount=649.0,
            category="Subscriptions",
            description="Netflix",
            source="bank",
            bank_account_id="acct-1",
            bank_txn_id="TXN-NETFLIX-001",
        )
        second = self.storage.save_expense(
            user_id="42",
            amount=649.0,
            category="Subscriptions",
            description="Netflix",
            source="bank",
            bank_account_id="acct-1",
            bank_txn_id="TXN-NETFLIX-001",
        )
        self.assertIsNotNone(first)
        self.assertIsNone(second, "Duplicate bank txn should not insert again")
        self.assertEqual(len(self.storage.list_expenses("42")), 1)

    def test_upi_screenshot_dedup_when_bank_account_id_is_null(self):
        # Regression test for the SQLite NULL-uniqueness gotcha: same UPI ref
        # from the same user must collapse even though bank_account_id is None.
        first = self.storage.save_expense(
            user_id="42",
            amount=200,
            category="Transfers",
            description="UPI to friend",
            source="upi_screenshot",
            bank_txn_id="UPI-REF-XYZ",
        )
        second = self.storage.save_expense(
            user_id="42",
            amount=200,
            category="Transfers",
            description="UPI to friend",
            source="upi_screenshot",
            bank_txn_id="UPI-REF-XYZ",
        )
        self.assertIsNotNone(first)
        self.assertIsNone(second, "Same UPI ref must not insert twice for one user")
        self.assertEqual(len(self.storage.list_expenses("42")), 1)

    def test_consent_and_data_session_lifecycle(self):
        self.storage.upsert_consent("c-1", "42", "PENDING", "https://setu/c/1")
        self.storage.upsert_consent("c-1", "42", "ACTIVE")
        active = self.storage.list_active_consents("42")
        self.assertEqual(len(active), 1)
        self.assertEqual(active[0]["status"], "ACTIVE")

        self.storage.upsert_data_session("s-1", "c-1", "42", "PENDING")
        self.storage.upsert_data_session("s-1", "c-1", "42", "COMPLETED")
        sess = self.storage.get_data_session("s-1")
        self.assertEqual(sess["status"], "COMPLETED")
        self.assertIsNotNone(sess["completed_at"])


if __name__ == "__main__":
    unittest.main()
