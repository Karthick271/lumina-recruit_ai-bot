from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import json
import uuid
from agents.recruitment_agent import RecruitmentAgent, CandidateState
from scraper import fetch_and_clean_html
from dotenv import load_dotenv

load_dotenv()

import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api_logger")

app = FastAPI()

# Logging Middleware
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    
    # Log Request
    body = await request.body()
    logger.info(f"Incoming Request: {request.method} {request.url} | Body: {body.decode() or 'Empty'}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    # Log Response
    logger.info(f"Outgoing Response: {response.status_code} | Process Time: {process_time:.4f}s")
    
    return response

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (use Redis for production)
sessions = {}

class ChatRequest(BaseModel):
    session_id: str
    message: str
    url: Optional[str] = None
    job_id: Optional[str] = None

@app.post("/start")
async def start_session(url: str, job_id: Optional[str] = None):
    session_id = str(uuid.uuid4())
    
    # Scrape job context from URL
    try:
        job_context = await fetch_and_clean_html(url)
    except Exception as e:
        # Fallback to local job data if scraping fails
        job_context = f"Applying for Job ID: {job_id}"
        
    sessions[session_id] = {
        "history": [],
        "state": CandidateState(),
        "job_context": job_context
    }
    
    return {"session_id": session_id, "initial_greeting": f"Hi! I'm your AI recruiter. I've analyzed the job page at {url}. Let's get started!"}

@app.post("/chat")
async def chat(request: ChatRequest):
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[request.session_id]
    provider = os.getenv("AI_PROVIDER", "claude")
    agent = RecruitmentAgent(provider=provider)
    
    # Extract Experience requirement from job_context
    # (In a real app, this would be a specific field, here we pass it to the agent)
    
    response_data = await agent.chat(
        message=request.message,
        history=session["history"],
        state=session["state"],
        job_context=session["job_context"]
    )
    
    # Update session
    session["history"].append({"role": "user", "content": request.message})
    session["history"].append({"role": "assistant", "content": response_data["reply"]})
    session["state"] = CandidateState(**response_data["updated_state"])
    
    # Store in candidates.json if finished
    if session["state"].finished:
        save_candidate(session)
        
    return response_data

def save_candidate(session):
    data_path = "data/candidates.json"
    if not os.path.exists(data_path):
        os.makedirs("data", exist_ok=True)
        with open(data_path, "w") as f:
            json.dump([], f)
            
    with open(data_path, "r") as f:
        candidates = json.load(f)
        
    candidates.append({
        "session_id": str(uuid.uuid4()),
        "state": session["state"].dict(),
        "job_context_summary": session["job_context"][:200]
    })
    
    with open(data_path, "w") as f:
        json.dump(candidates, f, indent=2)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
