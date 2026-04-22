import os
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from models import ChatResponse, CandidateRecord

logger = logging.getLogger(__name__)

# In-memory session store keyed by session_id
_sessions: dict = {}

# Provider cache — keyed by provider name so switching back reuses the instance
_provider_cache: dict = {}


def _get_provider():
    from config import get_provider_name
    from providers import ClaudeProvider, GeminiProvider

    name = get_provider_name()
    if name not in _provider_cache:
        if name == "gemini":
            _provider_cache[name] = GeminiProvider()
        else:
            _provider_cache[name] = ClaudeProvider()
    return _provider_cache[name]


_PROMPT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts", "system_prompt.md")
with open(_PROMPT_FILE, encoding="utf-8") as _f:
    _SYSTEM_PROMPT_TEMPLATE = _f.read()

_SCORING_SYSTEM = "You are a precise scoring assistant. Respond with ONLY a single integer, nothing else."


def _build_collected_summary(collected: dict) -> str:
    lines = []
    for key, val in collected.items():
        if key == "resume_text":
            lines.append(f"  resume_text: {'[provided]' if val else 'not yet'}")
        elif val is not None and val != [] and val != "":
            lines.append(f"  {key}: {val}")
        else:
            lines.append(f"  {key}: not yet collected")
    return "\n".join(lines) if lines else "  (nothing collected yet)"


def _extract_fields(text: str, collected: dict) -> None:
    if not collected.get("email"):
        m = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
        if m:
            collected["email"] = m.group(0)

    if not collected.get("portfolio_url"):
        m = re.search(r"https?://[^\s,)\"']+", text)
        if m:
            collected["portfolio_url"] = m.group(0)

    if collected.get("years_experience") is None:
        m = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:\+\s*)?years?\b", text, re.IGNORECASE)
        if m:
            try:
                collected["years_experience"] = float(m.group(1))
            except ValueError:
                pass

    if not collected.get("phone"):
        m = re.search(r"(?:\+?\d[\d\s\-().]{7,}\d)", text)
        if m:
            raw = m.group(0).strip()
            if len(re.sub(r"\D", "", raw)) >= 7:
                collected["phone"] = raw


_NAME_SKIP = {
    "resume", "cv", "curriculum", "vitae", "profile", "summary",
    "experience", "education", "skills", "contact", "objective",
    "career", "portfolio", "references", "projects", "about",
}

def _extract_resume_fields(text: str, collected: dict) -> None:
    """Aggressive field extraction used only on resume text."""
    _extract_fields(text, collected)

    # Name: first non-empty line that looks like a person's name
    if not collected.get("name"):
        for line in text.strip().splitlines()[:12]:
            line = line.strip()
            if not line:
                continue
            words = line.split()
            # 2-4 words, each starting with a capital, no digits, not a section heading
            if (2 <= len(words) <= 4
                    and all(w[0].isupper() for w in words if w.isalpha() and len(w) > 1)
                    and not any(c.isdigit() for c in line)
                    and not any(w.lower() in _NAME_SKIP for w in words)):
                collected["name"] = line
                break

    # Skills: look for a dedicated Skills section
    if not collected.get("skills"):
        skills_match = re.search(
            r"(?:Technical\s+Skills?|Skills?|Core\s+Competencies?|Key\s+Skills?|Technologies)"
            r"\s*[:\-]?\s*\n(.*?)(?:\n\s*\n|\Z)",
            text, re.I | re.S,
        )
        if skills_match:
            raw = skills_match.group(1)
            items = re.split(r"[,|•·\n]+", raw)
            cleaned = [s.strip().strip("•·-– ") for s in items]
            collected["skills"] = [s for s in cleaned if 2 < len(s) < 60][:15]


def _experience_score(years: Optional[float]) -> int:
    if years is None:
        return 5
    if years >= 5:
        return 30
    if years >= 3:
        return 22
    if years >= 1:
        return 14
    return 5


def _score_with_ai(prompt: str, max_val: int, fallback: int) -> int:
    try:
        provider = _get_provider()
        text = provider.create_message(
            system=_SCORING_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
        )
        val = int(re.search(r"\d+", text).group(0))
        return max(0, min(max_val, val))
    except Exception as exc:
        logger.warning("AI scoring failed: %s", exc)
        return fallback


def _calculate_score(collected: dict, job_context: str) -> dict:
    skills_str = ", ".join(collected.get("skills") or [])
    portfolio_url = collected.get("portfolio_url") or ""
    transcript_str = collected.get("_transcript_text", "")

    skill_score = _score_with_ai(
        f"Job context:\n{job_context[:3000]}\n\nCandidate skills: {skills_str}\n\n"
        "Rate the skill match from 0 to 40 as an integer. Reply with ONLY the integer.",
        max_val=40, fallback=10,
    )

    experience_score = _experience_score(collected.get("years_experience"))

    comm_score = _score_with_ai(
        f"Evaluate this recruitment conversation transcript for clarity, "
        f"professionalism, and communication quality:\n\n{transcript_str[:3000]}\n\n"
        "Rate 0 to 10 as an integer. Reply with ONLY the integer.",
        max_val=10, fallback=5,
    )

    if portfolio_url:
        port_score = _score_with_ai(
            f"Job context:\n{job_context[:2000]}\n\nCandidate portfolio URL: {portfolio_url}\n\n"
            "Rate portfolio relevance 0 to 20 as an integer (base 15 for having a URL, "
            "up to 20 for strong relevance). Reply with ONLY the integer.",
            max_val=20, fallback=15,
        )
    else:
        port_score = 0

    return {
        "skill_match_score": skill_score,
        "experience_score": experience_score,
        "communication_score": comm_score,
        "portfolio_score": port_score,
        "total_score": skill_score + experience_score + comm_score + port_score,
    }


def create_session(job_context: str) -> str:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "job_context": job_context,
        "collected": {
            "name": None,
            "email": None,
            "phone": None,
            "years_experience": None,
            "skills": [],
            "portfolio_url": None,
            "resume_text": None,
        },
        "messages": [],
        "is_complete": False,
        "candidate_record": None,
    }
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    return _sessions.get(session_id)


def inject_resume_text(session_id: str, resume_text: str) -> bool:
    session = _sessions.get(session_id)
    if not session:
        return False
    session["collected"]["resume_text"] = resume_text
    _extract_resume_fields(resume_text, session["collected"])
    return True


async def chat(session_id: str, user_message: str) -> ChatResponse:
    from storage import save_candidate

    session = _sessions.get(session_id)
    if not session:
        raise ValueError(f"Session not found: {session_id}")

    collected = session["collected"]
    _extract_fields(user_message, collected)

    if not collected["skills"] and session["messages"]:
        last_assistant = next(
            (m["content"] for m in reversed(session["messages"]) if m["role"] == "assistant"),
            "",
        )
        if re.search(r"skill|technolog|proficien|experience with", last_assistant, re.I):
            raw_skills = re.split(r"[,;/\n]|\band\b", user_message)
            cleaned = [s.strip().strip(".,!?") for s in raw_skills if 2 < len(s.strip()) < 50]
            if cleaned:
                collected["skills"] = cleaned

    session["messages"].append({"role": "user", "content": user_message})

    # Dynamically determine experience requirement from job_context
    exp_match = re.search(r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?experience", session["job_context"] or "", re.I)
    required_years = int(exp_match.group(1)) if exp_match else 0
    
    if required_years > 0:
        exp_rule = f"This role requires a MINIMUM of {required_years} years of professional experience."
    else:
        exp_rule = "Identify the minimum years of experience from the job context. If not mentioned, assume no strict minimum."

    system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
        job_context=session["job_context"] or "No specific job context available — use general screening.",
        experience_gate_rule=exp_rule,
        collected_summary=_build_collected_summary(collected),
    )

    provider = _get_provider()
    reply_raw = provider.create_message(
        system=system_prompt,
        messages=session["messages"],
        max_tokens=1024,
    )

    session["messages"].append({"role": "assistant", "content": reply_raw})

    is_complete = "[SCREENING_COMPLETE]" in reply_raw
    is_rejected = "[SCREENING_REJECTED]" in reply_raw
    reply_display = (
        reply_raw
        .replace("[SCREENING_COMPLETE]", "")
        .replace("[SCREENING_REJECTED]", "")
        .strip()
    )
    total_score = None

    if (is_complete or is_rejected) and not session["is_complete"]:
        session["is_complete"] = True

        transcript_lines = [
            f"{m['role'].upper()}: {m['content']}" for m in session["messages"]
        ]
        collected["_transcript_text"] = "\n".join(transcript_lines)

        if is_complete:
            # Full AI scoring only for candidates who passed
            scores = _calculate_score(collected, session["job_context"])
            total_score = scores["total_score"]
            candidate_status = "screening_complete"
        else:
            # Rejected — save minimal record, skip expensive scoring calls
            scores = {
                "communication_score": 0,
                "skill_match_score": 0,
                "experience_score": _experience_score(collected.get("years_experience")),
                "portfolio_score": 0,
            }
            scores["total_score"] = scores["experience_score"]
            candidate_status = "rejected"

        record = CandidateRecord(
            id=str(uuid.uuid4()),
            name=collected.get("name") or "Unknown",
            email=collected.get("email") or "unknown@example.com",
            phone=collected.get("phone"),
            years_experience=collected.get("years_experience"),
            skills=collected.get("skills") or [],
            portfolio_url=collected.get("portfolio_url"),
            resume_path=collected.get("resume_path"),
            communication_score=scores["communication_score"],
            skill_match_score=scores["skill_match_score"],
            experience_score=scores["experience_score"],
            portfolio_score=scores["portfolio_score"],
            total_score=scores["total_score"],
            applied_job_id=collected.get("applied_job_id"),
            status=candidate_status,
            session_transcript=[
                {"role": m["role"], "content": m["content"]}
                for m in session["messages"]
            ],
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        session["candidate_record"] = record
        save_candidate(record)

    return ChatResponse(
        session_id=session_id,
        reply=reply_display,
        is_complete=is_complete or is_rejected,
        is_rejected=is_rejected,
        score=total_score,
    )
