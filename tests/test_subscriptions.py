import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOT_DIR = ROOT / "bot"
sys.path.insert(0, str(BOT_DIR))

import subscriptions


def _make(amount: float, days_ago: float, description: str, **extra):
    ts = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
    return {
        "amount": amount,
        "description": description,
        "timestamp": ts,
        "category": extra.get("category", "Subscriptions"),
        **extra,
    }


class SubscriptionDetectorTests(unittest.TestCase):
    def test_detects_monthly_netflix_charge(self):
        expenses = [
            _make(649, 1, "NETFLIX SUBSCRIPTION"),
            _make(649, 31, "NETFLIX SUBSCRIPTION"),
            _make(649, 61, "NETFLIX SUBSCRIPTION"),
            _make(649, 91, "NETFLIX SUBSCRIPTION"),
        ]
        results = subscriptions.detect_subscriptions(expenses)
        self.assertEqual(len(results), 1)
        sub = results[0]
        self.assertEqual(sub["cadence"], "monthly")
        self.assertEqual(sub["occurrences"], 4)
        self.assertAlmostEqual(sub["monthly_cost"], 649.0)

    def test_keyword_match_handles_dots_and_plus(self):
        # Regression: previously cult.fit / disney+ never matched the SaaS
        # keyword set because the keywords kept their dots/'+' but fingerprints
        # were normalised — so the relaxed 2-occurrence rule never fired.
        for raw, normalised in [
            ("CULT.FIT MEMBERSHIP", "cult fit"),
            ("Disney+ Hotstar", "disney"),
            ("CURE.FIT", "cure fit"),
        ]:
            self.assertTrue(
                any(k in normalised for k in subscriptions.KNOWN_SUBSCRIPTION_KEYWORDS),
                f"{raw!r} (norm={normalised!r}) should match a known SaaS keyword",
            )

    def test_does_not_treat_random_groceries_as_subscription(self):
        expenses = [
            _make(120, 1, "Bigbasket order"),
            _make(345, 8, "Local kirana"),
            _make(220, 16, "Vegetables market"),
        ]
        results = subscriptions.detect_subscriptions(expenses)
        self.assertEqual(results, [])

    def test_flags_vampire_when_inactive(self):
        # Three monthly charges 60+ days old → still recurring, vampire = True.
        base = 70
        expenses = [
            _make(1273, base, "CULT.FIT MEMBERSHIP"),
            _make(1273, base + 30, "CULT.FIT MEMBERSHIP"),
            _make(1273, base + 60, "CULT.FIT MEMBERSHIP"),
        ]
        results = subscriptions.detect_subscriptions(expenses, inactive_days=60)
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]["vampire"])
        self.assertGreaterEqual(results[0]["inactivity_days"], 60)


if __name__ == "__main__":
    unittest.main()
