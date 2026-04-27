"""Setu Account Aggregator integration for FineHance Omni."""
from .client import SetuAAClient, SetuConfig, SetuError
from .parser import parse_fi_data

__all__ = ["SetuAAClient", "SetuConfig", "SetuError", "parse_fi_data"]
