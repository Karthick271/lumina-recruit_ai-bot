import os
import json
import threading

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_CONFIG_FILE = os.path.join(_BASE_DIR, "data", "config.json")
_lock = threading.Lock()

# ─── Available models ────────────────────────────────────────────────────────

CLAUDE_MODELS = [
    {"id": "claude-3-5-sonnet-20241022", "label": "Sonnet 3.5",  "note": "Balanced · default"},
    {"id": "claude-3-5-haiku-20241022",  "label": "Haiku 3.5",   "note": "Fast & cheap"},
    {"id": "claude-sonnet-4-6",          "label": "Sonnet 4.6",  "note": "Latest Sonnet"},
    {"id": "claude-opus-4-7",            "label": "Opus 4.7",    "note": "Most capable"},
]

GEMINI_MODELS = [
    {"id": "gemini-1.5-pro",               "label": "Gemini 1.5 Pro",         "note": "Balanced · default"},
    {"id": "gemini-1.5-flash",             "label": "Gemini 1.5 Flash",       "note": "Fast & cheap"},
    {"id": "gemini-2.0-flash",             "label": "Gemini 2.0 Flash",       "note": "Newer, fast"},
    {"id": "gemini-3.1-flash-lite-preview","label": "Gemini 3.1 Flash Lite",  "note": "Preview · fastest"},
]

_CLAUDE_DEFAULT  = "claude-3-5-sonnet-20241022"
_GEMINI_DEFAULT  = "gemini-1.5-pro"

# ─── Config file helpers ─────────────────────────────────────────────────────

def _env_default_provider() -> str:
    return os.environ.get("AI_PROVIDER", "claude").lower()


def get_config() -> dict:
    try:
        with _lock:
            with open(_CONFIG_FILE) as f:
                return json.load(f)
    except FileNotFoundError:
        return {"provider": _env_default_provider()}


def set_config(update: dict) -> dict:
    current = get_config()
    current.update(update)
    with _lock:
        os.makedirs(os.path.dirname(_CONFIG_FILE), exist_ok=True)
        with open(_CONFIG_FILE, "w") as f:
            json.dump(current, f, indent=2)
    return current


# ─── Provider / model accessors ──────────────────────────────────────────────

def get_provider_name() -> str:
    return get_config().get("provider", _env_default_provider())


def get_claude_model() -> str:
    return (
        get_config().get("claude_model")
        or os.environ.get("CLAUDE_MODEL", _CLAUDE_DEFAULT)
    )


def get_gemini_model() -> str:
    return (
        get_config().get("gemini_model")
        or os.environ.get("GEMINI_MODEL", _GEMINI_DEFAULT)
    )


def get_available_providers() -> list[str]:
    available = []
    if os.environ.get("ANTHROPIC_API_KEY"):
        available.append("claude")
    if os.environ.get("GEMINI_API_KEY"):
        available.append("gemini")
    if not available:
        available.append("claude")
    return available
