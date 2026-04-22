from typing import List, Optional
from pydantic import BaseModel


class StartSessionRequest(BaseModel):
    url: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    is_complete: bool
    is_rejected: bool = False
    score: Optional[int] = None


class AdminConfigUpdate(BaseModel):
    provider: Optional[str] = None
    claude_model: Optional[str] = None
    gemini_model: Optional[str] = None


class CandidateRecord(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    years_experience: Optional[float] = None
    skills: List[str] = []
    portfolio_url: Optional[str] = None
    resume_path: Optional[str] = None
    communication_score: int
    skill_match_score: int
    experience_score: int
    portfolio_score: int
    total_score: int
    applied_job_id: Optional[str] = None
    status: str = "pending"        # screening_complete | rejected | incomplete
    session_transcript: List[dict] = []
    created_at: str
