import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOT_DIR = ROOT / "bot"
sys.path.insert(0, str(BOT_DIR))


class SetuMockFlowTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        os.environ["FINEHANCE_DB_PATH"] = os.path.join(self.tmpdir.name, "test.db")
        for mod in ("storage", "setu", "setu.client", "setu.mock", "setu.parser", "setu.sync"):
            if mod in sys.modules:
                del sys.modules[mod]
        import storage  # noqa: F401
        self.storage = storage
        from setu.mock import MockSetuAAClient
        from setu.sync import run_full_sync, sync_fi_payload
        from setu.parser import parse_fi_data

        self.MockSetuAAClient = MockSetuAAClient
        self.run_full_sync = run_full_sync
        self.sync_fi_payload = sync_fi_payload
        self.parse_fi_data = parse_fi_data

    def tearDown(self):
        self.tmpdir.cleanup()
        os.environ.pop("FINEHANCE_DB_PATH", None)
        for mod in ("storage", "setu", "setu.client", "setu.mock", "setu.parser", "setu.sync"):
            if mod in sys.modules:
                del sys.modules[mod]

    def test_mock_consent_and_session_round_trip(self):
        client = self.MockSetuAAClient()
        consent = client.create_consent(vua="9999999999@setu")
        self.assertEqual(consent["status"], "PENDING")
        self.assertTrue(consent["url"].startswith("https://"))

        # Polling promotes the consent to ACTIVE.
        latest = client.get_consent(consent["id"])
        self.assertEqual(latest["status"], "ACTIVE")

        session = client.create_data_session(consent["id"])
        self.assertEqual(session["status"], "PENDING")
        promoted = client.get_data_session(session["id"])
        self.assertEqual(promoted["status"], "COMPLETED")

        fi = client.fetch_data(session["id"])
        rows = self.parse_fi_data(fi)
        self.assertGreater(len(rows), 5, "synthetic FI payload should contain multiple txns")
        for row in rows:
            self.assertIn("amount", row)
            self.assertIn("description", row)
            self.assertIn("bank_txn_id", row)

    def test_sync_persists_rows_and_skips_duplicates_on_second_run(self):
        client = self.MockSetuAAClient()
        consent = client.create_consent(vua="user@setu")
        client.get_consent(consent["id"])

        first = self.run_full_sync(
            client,
            user_id="42",
            consent_id=consent["id"],
            categorizer=lambda text: "Other",
        )
        self.assertGreater(first["saved"], 0)
        self.assertEqual(first["duplicates"], 0)

        second = self.run_full_sync(
            client,
            user_id="42",
            consent_id=consent["id"],
            categorizer=lambda text: "Other",
        )
        # Second run should hit the unique (bank_account_id, bank_txn_id) index.
        self.assertEqual(second["saved"], 0)
        self.assertEqual(second["duplicates"], second["fetched"])

    def test_get_default_client_returns_singleton_mock(self):
        # Regression: when no Setu creds are configured the bot must return the
        # SAME mock instance across calls so /connect_bank state survives /sync.
        from setu.client import get_default_client, reset_default_client

        # Ensure no creds in the environment for this test.
        for key in ("SETU_CLIENT_ID", "SETU_CLIENT_SECRET", "SETU_PRODUCT_INSTANCE_ID"):
            os.environ.pop(key, None)
        reset_default_client()

        a = get_default_client()
        consent = a.create_consent(vua="user@setu")

        b = get_default_client()
        self.assertIs(a, b, "get_default_client() must cache the mock client")

        # And the second handle can read the consent the first one created.
        self.assertEqual(b.get_consent(consent["id"])["status"], "ACTIVE")

    def test_parser_extracts_vpa_from_upi_narration(self):
        rows = self.parse_fi_data(
            {
                "fips": [
                    {
                        "fipId": "setu-fip",
                        "accounts": [
                            {
                                "linkRefNumber": "L-1",
                                "data": {
                                    "Account": {
                                        "Transactions": {
                                            "Transaction": [
                                                {
                                                    "txnId": "T-1",
                                                    "type": "DEBIT",
                                                    "amount": 200,
                                                    "narration": "UPI/RAMESH KUMAR/ramesh@oksbi/payment",
                                                    "transactionTimestamp": "2026-04-25T12:00:00Z",
                                                    "mode": "UPI",
                                                }
                                            ]
                                        }
                                    }
                                },
                            }
                        ],
                    }
                ]
            }
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["recipient_vpa"], "ramesh@oksbi")
        self.assertIn("Ramesh", rows[0]["merchant"])


if __name__ == "__main__":
    unittest.main()
