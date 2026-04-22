import json
import os
import threading
from typing import List

from models import CandidateRecord

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.join(_BASE_DIR, "data")
_CANDIDATES_FILE = os.path.join(_DATA_DIR, "candidates.json")
_JOBS_FILE = os.path.join(_DATA_DIR, "jobs.json")

_lock = threading.Lock()


def _ensure_candidates_file() -> None:
    os.makedirs(_DATA_DIR, exist_ok=True)
    if not os.path.exists(_CANDIDATES_FILE):
        with open(_CANDIDATES_FILE, "w") as f:
            json.dump([], f)


def save_candidate(record: CandidateRecord) -> None:
    _ensure_candidates_file()
    with _lock:
        with open(_CANDIDATES_FILE, "r") as f:
            candidates = json.load(f)
        candidates.append(record.model_dump())
        with open(_CANDIDATES_FILE, "w") as f:
            json.dump(candidates, f, indent=2)


def get_all_candidates() -> List[dict]:
    _ensure_candidates_file()
    with _lock:
        with open(_CANDIDATES_FILE, "r") as f:
            return json.load(f)


def get_jobs() -> List[dict]:
    with open(_JOBS_FILE, "r") as f:
        return json.load(f)
