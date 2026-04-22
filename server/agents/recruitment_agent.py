import os
import json
from typing import Dict, List, Optional
import anthropic
import google.generativeai as genai
from pydantic import BaseModel

class CandidateState(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    experience_years: Optional[int] = None
    skills: List[str] = []
    resume_uploaded: bool = False
    finished: bool = False

class RecruitmentAgent:
    def __init__(self, provider: str = "claude"):
        self.provider = provider
        self.claude_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY")) if os.getenv("ANTHROPIC_API_KEY") else None
        
        if os.getenv("GOOGLE_API_KEY"):
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')
        else:
            self.gemini_model = None

    def _get_system_prompt(self, job_context: str) -> str:
        return f"""
You are a Senior AI Recruiter. Your goal is to interview a candidate for the job described below.

ACTIVE JOB CONTEXT (STRICT RULES):
{job_context}

YOUR CORE RULES:
1. NO REDUNDANCY: If the user provides info early (name, email, skills, experience), extract it and DO NOT ask for it again.
2. DYNAMIC EVALUATION: Use the specific requirements in the Job Context above. If the job says "3+ years", do not reject for 3 years. Ignore any example numbers from your training.
3. CONVERSATIONAL: Be professional but friendly. Use natural transitions.
4. DATA EXTRACTION: After every message, update the candidate state.

REQUIRED FIELDS TO COLLECT:
- Full Name
- Email
- Years of Experience
- Core Skills
- Resume (must be uploaded)

Once all data is collected and the resume is analyzed, provide a final score from 0-100 and a status (Eligible if > 60).
"""

    async def chat(self, message: str, history: List[Dict], state: CandidateState, job_context: str) -> Dict:
        system_prompt = self._get_system_prompt(job_context)
        
        # In a real implementation, we would use structured output to update the state.
        # For this prototype, we'll ask the AI to return both the reply and the updated state in a specific format.
        
        prompt = f"""
Current State: {state.json()}
User Message: {message}

Update the state based on the user message and respond to the user.
Return your response as a JSON object with:
{{
  "reply": "your message to user",
  "updated_state": {{ ... }},
  "evaluation": {{ "score": 0, "reasoning": "..." }} // Only if finished
}}
"""

        if self.provider == "claude" and self.claude_client:
            response = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1024,
                system=system_prompt,
                messages=history + [{"role": "user", "content": prompt}]
            )
            return json.loads(response.content[0].text)
        
        elif self.provider == "gemini" and self.gemini_model:
            # Gemini implementation
            full_prompt = f"{system_prompt}\n\n{prompt}"
            response = self.gemini_model.generate_content(full_prompt)
            return json.loads(response.text)
        
        return {"reply": "Error: AI Provider not configured.", "updated_state": state.dict()}
