import os
import logging
import uuid

from dotenv import load_dotenv
load_dotenv()

import aiofiles
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

import uvicorn

from models import StartSessionRequest, ChatRequest, ChatResponse, AdminConfigUpdate
from scraper import fetch_and_clean
from recruitment_agent import create_session, chat, get_session, inject_resume_text
from storage import get_all_candidates, get_jobs
from config import (
    get_config, set_config, get_available_providers,
    get_claude_model, get_gemini_model,
    CLAUDE_MODELS, GEMINI_MODELS,
)

import time
import json
from starlette.middleware.base import BaseHTTPMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("api_traffic")

app = FastAPI(
    title="AI Career Assistant API",
    version="1.0.0",
    description="Agentic job application screening system — supports Claude and Gemini.",
)

# Safer Logging Middleware using a custom dispatch
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    
    # Log Request Metadata (avoiding body consumption to prevent RuntimeErrors)
    logger.info(f">>> Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    # Log Response
    logger.info(f"<<< Response: {response.status_code} | Time: {process_time:.4f}s")
    
    return response

# Add Logging Middleware
# Note: BaseHTTPMiddleware can be sensitive with body streams.
# We've simplified it to log metadata for maximum stability.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(_UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR), name="uploads")


@app.post("/api/session/start")
async def start_session(body: StartSessionRequest):
    job_context = await fetch_and_clean(body.url)
    if not job_context:
        # Fallback: use jobs.json as context
        jobs = get_jobs()
        job_context = "\n\n".join(
            f"**{j['title']}** ({j['department']})\n{j['description']}\nRequirements: {', '.join(j['requirements'])}"
            for j in jobs
        )
        logger.warning("Scraper returned empty for %s — using jobs.json fallback", body.url)

    session_id = create_session(job_context)
    return {"session_id": session_id}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest):
    session = get_session(body.session_id)
    if not session:
        raise HTTPException(status_code=400, detail=f"Session not found: {body.session_id}")

    return await chat(body.session_id, body.message)


@app.post("/api/upload/resume")
async def upload_resume(
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=400, detail=f"Session not found: {session_id}")

    safe_name = f"{session_id}_{file.filename}"
    file_path = os.path.join(_UPLOADS_DIR, safe_name)

    async with aiofiles.open(file_path, "wb") as out:
        content = await file.read()
        await out.write(content)

    extracted_text = ""
    lower_name = (file.filename or "").lower()

    if lower_name.endswith(".pdf"):
        extracted_text = _extract_pdf_text(file_path)
    elif lower_name.endswith(".txt"):
        try:
            extracted_text = content.decode("utf-8", errors="ignore")
        except Exception:
            extracted_text = ""
    else:
        try:
            extracted_text = content.decode("utf-8", errors="ignore")
        except Exception:
            extracted_text = ""

    if extracted_text:
        inject_resume_text(session_id, extracted_text)
        # Store the file path on the session collected dict
        session["collected"]["resume_path"] = f"/uploads/{safe_name}"

    preview = extracted_text[:500] if extracted_text else ""
    return JSONResponse({"success": True, "extracted_text_preview": preview})


def _extract_pdf_text(path: str) -> str:
    try:
        from pdfminer.high_level import extract_text
        return extract_text(path)
    except Exception as exc:
        logger.warning("PDF extraction failed for %s: %s", path, exc)
        return ""


@app.get("/api/jobs")
def list_jobs():
    return get_jobs()


@app.get("/api/candidates")
def list_candidates():
    return get_all_candidates()


# ─── Admin Routes ────────────────────────────────────────────────────────────

@app.get("/api/admin/config")
def get_admin_config():
    cfg = get_config()
    cfg["available_providers"] = get_available_providers()
    cfg["claude_model"]  = get_claude_model()
    cfg["gemini_model"]  = get_gemini_model()
    cfg["claude_models"] = CLAUDE_MODELS
    cfg["gemini_models"] = GEMINI_MODELS
    return cfg


@app.post("/api/admin/config")
def update_admin_config(body: AdminConfigUpdate):
    if body.provider is None and body.claude_model is None and body.gemini_model is None:
        raise HTTPException(status_code=400, detail="Nothing to update.")

    update: dict = {}

    if body.provider is not None:
        available = get_available_providers()
        if body.provider not in available:
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{body.provider}' is not available. Set its API key in .env first.",
            )
        update["provider"] = body.provider

    if body.claude_model is not None:
        valid_ids = [m["id"] for m in CLAUDE_MODELS]
        if body.claude_model not in valid_ids:
            raise HTTPException(status_code=400, detail=f"Unknown Claude model '{body.claude_model}'.")
        update["claude_model"] = body.claude_model

    if body.gemini_model is not None:
        valid_ids = [m["id"] for m in GEMINI_MODELS]
        if body.gemini_model not in valid_ids:
            raise HTTPException(status_code=400, detail=f"Unknown Gemini model '{body.gemini_model}'.")
        update["gemini_model"] = body.gemini_model

    updated = set_config(update)
    updated["available_providers"] = get_available_providers()
    updated["claude_model"]  = get_claude_model()
    updated["gemini_model"]  = get_gemini_model()
    updated["claude_models"] = CLAUDE_MODELS
    updated["gemini_models"] = GEMINI_MODELS
    return updated


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
