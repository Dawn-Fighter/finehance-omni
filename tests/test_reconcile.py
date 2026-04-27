import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOT_DIR = ROOT / "bot"
sys.path.insert(0, str(BOT_DIR))

import reconcile


def _ts(minutes_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat()


class ReconcileTests(unittest.TestCase):
    def test_finds_match_by_txn_ref(self):
        manual = {
            "id": 1,
            "amount": 200,
            "description": "UPI to friend",
            "merchant": "Ramesh",
            "recipient_vpa": "ramesh@oksbi",
            "source": "upi_screenshot",
            "bank_txn_id": "ABC123",
            "timestamp": _ts(5),
        }
        bank = {
            "id": 2,
            "amount": 200,
            "description": "UPI/RAMESH KUMAR/oksbi",
            "merchant": "Ramesh Kumar",
            "source": "bank",
            "bank_txn_id": "ABC123",
            "timestamp": _ts(7),
        }
        pairs = reconcile.find_duplicates([manual, bank])
        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0][2], "same txn_ref")

    def test_finds_match_by_merchant_in_bank_narration(self):
        manual = {
            "id": 1,
            "amount": 423,
            "description": "Swiggy dinner",
            "merchant": "Swiggy",
            "source": "text",
            "timestamp": _ts(30),
        }
        bank = {
            "id": 2,
            "amount": 423,
            "description": "UPI/SWIGGY ORDER/swiggy.in@axis",
            "merchant": "Swiggy Order",
            "source": "bank",
            "timestamp": _ts(32),
        }
        pairs = reconcile.find_duplicates([manual, bank])
        self.assertEqual(len(pairs), 1)

    def test_does_not_match_different_amount(self):
        manual = {
            "id": 1,
            "amount": 100,
            "description": "UPI to friend",
            "source": "text",
            "timestamp": _ts(5),
        }
        bank = {
            "id": 2,
            "amount": 200,
            "description": "UPI to friend",
            "source": "bank",
            "timestamp": _ts(7),
        }
        pairs = reconcile.find_duplicates([manual, bank])
        self.assertEqual(pairs, [])

    def test_does_not_match_outside_time_window(self):
        manual = {
            "id": 1,
            "amount": 200,
            "description": "UPI to friend",
            "merchant": "Ramesh",
            "source": "text",
            "timestamp": _ts(60 * 5),
        }
        bank = {
            "id": 2,
            "amount": 200,
            "description": "UPI to ramesh",
            "merchant": "Ramesh",
            "source": "bank",
            "timestamp": _ts(60 * 24),  # 19 hours later
        }
        pairs = reconcile.find_duplicates([manual, bank], time_window_minutes=90)
        self.assertEqual(pairs, [])


if __name__ == "__main__":
    unittest.main()
