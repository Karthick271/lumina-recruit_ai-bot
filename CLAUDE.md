# AI-Powered Career Assistant — Agentic Build Plan

> **For Claude Code:** Execute tasks sequentially. Mark each task `[x]` upon completion. Never skip a phase. Validate before proceeding to the next phase.

---

## Project Overview

| Field | Detail |
|---|---|
| **Goal** | Agentic job application system that screens candidates via AI chat |
| **AI Model** | Claude 3.5 Sonnet (via Anthropic SDK, agentic loop) |
| **Backend** | FastAPI (Python 3.11+) |
| **Frontend** | React + Vite (Vanilla CSS — no UI libraries) |
| **Storage** | Local flat files: `candidates.json`, `jobs.json` |
| **Key Feature** | Web-aware job extraction from live career page URL |

---

## Repository Structure to Create

```
career-assistant/
├── backend/
│   ├── main.py                  # FastAPI app, routes, CORS
│   ├── scraper.py               # URL → Clean Markdown pipeline
│   ├── recruitment_agent.py     # Claude agentic loop orchestration
│   ├── storage.py               # candidates.json / jobs.json read-write
│   ├── models.py                # Pydantic request/response schemas
│   ├── data/
│   │   ├── candidates.json      # Initialized as empty array []
│   │   └── jobs.json            # Seeded with dummy job roles
│   ├── uploads/                 # Temp storage for uploaded resumes
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css            # Full design system (premium)
        ├── components/
        │   ├── CareerPage.jsx   # Job listings grid
        │   └── ChatWidget.jsx   # Real-time agentic chat UI
        └── api/
            └── client.js        # Axios/fetch wrappers for backend calls
```

---

## Phase 1 — Backend Development

> **Working directory:** `backend/`
> **Constraint:** Use only libraries listed in `requirements.txt`. Do not install extras.

### Task 1.1 — Project Initialization

- [ ] Create `backend/` directory structure as specified above
- [ ] Create `requirements.txt` with exact versions:

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
anthropic==0.28.0
beautifulsoup4==4.12.3
markdownify==0.12.1
httpx==0.27.0
python-multipart==0.0.9
pydantic==2.7.3
aiofiles==23.2.1
```

- [ ] Initialize `data/candidates.json` as `[]`
- [ ] Seed `data/jobs.json` with 3 dummy roles (Software Engineer, Product Designer, Data Analyst) — each with `id`, `title`, `department`, `location`, `type` (Full-time/Contract), `requirements` (list of strings), and `description`

---

### Task 1.2 — `scraper.py` (Web-Aware Extraction Pipeline)

**Purpose:** Convert any career page URL into clean, Claude-readable Markdown.

- [ ] Implement `async def fetch_and_clean(url: str) -> str`:
  1. Use `httpx.AsyncClient` with a 10s timeout to fetch raw HTML
  2. Parse with `BeautifulSoup(html, "html.parser")`
  3. Decompose (remove) all tags: `script`, `style`, `nav`, `footer`, `header`, `aside`, `noscript`
  4. Convert remaining HTML to Markdown using `markdownify.markdownify()`
  5. Strip excessive whitespace (collapse 3+ newlines to 2)
  6. Return cleaned Markdown string (cap at 8000 chars to stay within context)
- [ ] Add graceful error handling — return `""` with logged warning on failure
- [ ] Write a quick `if __name__ == "__main__"` smoke test at the bottom

---

### Task 1.3 — `models.py` (Pydantic Schemas)

- [ ] Define the following schemas:

```python
class StartSessionRequest(BaseModel):
    url: str                          # Career page URL from frontend

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    is_complete: bool                 # True when screening is done & score stored
    score: Optional[int] = None       # Exposed only when is_complete=True

class CandidateRecord(BaseModel):
    id: str                           # UUID
    name: str
    email: str
    phone: Optional[str]
    years_experience: Optional[float]
    skills: List[str]
    portfolio_url: Optional[str]
    resume_path: Optional[str]
    communication_score: int          # 0-10, assessed by agent
    skill_match_score: int            # 0-40
    experience_score: int             # 0-30
    portfolio_score: int              # 0-20
    total_score: int                  # Sum, 0-100
    applied_job_id: Optional[str]
    session_transcript: List[dict]    # Full chat history
    created_at: str                   # ISO timestamp
```

---

### Task 1.4 — `recruitment_agent.py` (Agentic Loop Core)

**This is the most critical module. Build with precision.**

#### Agent State (in-memory dict keyed by `session_id`)

```python
# Structure per session
{
  "session_id": {
    "job_context": str,          # Extracted Markdown from scraper
    "collected": {               # Fields gathered so far
      "name": None,
      "email": None,
      "phone": None,
      "years_experience": None,
      "skills": [],
      "portfolio_url": None,
      "resume_text": None,
    },
    "messages": [],              # Full OpenAI-style message history
    "is_complete": False,
    "candidate_record": None,
  }
}
```

#### System Prompt (inject once at session start)

- [ ] Write a system prompt that instructs Claude to:
  - Act as a warm, professional AI recruiter named **"Aria"**
  - Use the `job_context` (injected Markdown) to understand the role requirements
  - **Proactively extract** candidate data from every message without asking if it was already given
  - **Never re-ask** for information already collected — track `collected` fields
  - Ask one question at a time in a natural, conversational tone
  - Validate vague answers (e.g., "a few years" → ask for a number)
  - Collect in this order: Name → Email → Phone → Experience → Skills → Portfolio/GitHub
  - Once all fields are collected, inform the candidate their application is submitted and wrap up warmly
  - Include a special internal marker `[SCREENING_COMPLETE]` on the final message (hidden from candidate display)

#### Agentic Loop Function

- [ ] Implement `async def chat(session_id: str, user_message: str) -> ChatResponse`:
  1. Append user message to `messages` history
  2. Scan `user_message` with a regex/heuristic pass to auto-fill any obvious fields in `collected` (email regex, URL detection, number extraction for experience)
  3. Build full message list: `[system_prompt] + messages`
  4. Call `anthropic.messages.create()` with `model="claude-3-5-sonnet-20241022"`, `max_tokens=1024`
  5. Extract assistant reply text
  6. Append assistant reply to `messages`
  7. Check if reply contains `[SCREENING_COMPLETE]`
     - If yes: strip the marker from displayed text, trigger scoring, call `storage.save_candidate()`, set `is_complete=True`
  8. Return `ChatResponse`

#### Scoring Logic (called internally at completion)

- [ ] Implement `def calculate_score(collected: dict, job_context: str) -> dict`:

| Component | Max | Logic |
|---|---|---|
| **Skill Match** | 40 | Call Claude with a mini-prompt: compare `collected.skills` vs skills mentioned in `job_context`. Return 0–40. |
| **Experience** | 30 | `years_experience >= 5` → 30, `>=3` → 22, `>=1` → 14, else → 5 |
| **Communication** | 10 | Claude assesses transcript clarity and professionalism. Returns 0–10. |
| **Portfolio** | 20 | Portfolio URL present → 15 pts base; Claude assesses relevance if job_context mentions it → up to 20. No URL → 0. |

- [ ] Return dict with all four component scores and `total_score`

---

### Task 1.5 — `storage.py`

- [ ] Implement `def save_candidate(record: CandidateRecord) -> None`:
  - Load `data/candidates.json`, append new record, write back with `indent=2`
  - Use file locking (`threading.Lock`) to prevent corruption on concurrent writes
- [ ] Implement `def get_all_candidates() -> List[dict]`
- [ ] Implement `def get_jobs() -> List[dict]`

---

### Task 1.6 — `main.py` (FastAPI App & Routes)

- [ ] Initialize FastAPI app with metadata (title, version, description)
- [ ] Add CORS middleware: allow `http://localhost:5173`, methods `["*"]`, headers `["*"]`
- [ ] Mount `uploads/` as static files directory
- [ ] Implement the following routes:

```
POST /api/session/start
  Body: StartSessionRequest { url }
  → Calls scraper, initializes agent session, returns { session_id }

POST /api/chat
  Body: ChatRequest { session_id, message }
  → Calls recruitment_agent.chat(), returns ChatResponse

POST /api/upload/resume
  Body: multipart/form-data { session_id, file }
  → Saves to uploads/{session_id}_{filename}
  → Parses text from PDF (use pdfminer.six or read raw for .txt)
  → Injects resume text into agent session's collected["resume_text"]
  → Returns { success: true, extracted_text_preview: str }

GET /api/jobs
  → Returns full jobs.json list

GET /api/candidates
  → Returns full candidates.json list (admin use)
```

- [ ] Add `if __name__ == "__main__": uvicorn.run(...)` block for local dev

---

### Phase 1 Validation Checklist

Before moving to Phase 2, verify:

- [ ] `uvicorn backend.main:app --reload` starts with zero errors
- [ ] `POST /api/session/start` with a real URL returns a `session_id`
- [ ] `POST /api/chat` returns a coherent Aria response
- [ ] After a full mock conversation, `candidates.json` gains a new entry with a valid score
- [ ] `GET /api/jobs` returns 3 seeded roles

---

## Phase 2 — Frontend Development

> **Working directory:** `frontend/`
> **Constraint:** Vanilla CSS only. No Tailwind, no MUI, no styled-components. No UI library components.

### Task 2.1 — Project Initialization

- [ ] Run `npm create vite@latest . -- --template react` inside `frontend/`
- [ ] Install only: `axios`
- [ ] Delete boilerplate: `App.css`, `assets/react.svg`, `public/vite.svg`
- [ ] Update `vite.config.js` to proxy `/api` to `http://localhost:8000`

```js
// vite.config.js
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

---

### Task 2.2 — `index.css` (Premium Design System)

**This is the visual foundation. Do not rush it.**

- [ ] Define CSS custom properties (variables) for:

```css
:root {
  --color-bg: #0a0a0f;
  --color-surface: #13131a;
  --color-surface-2: #1c1c27;
  --color-border: rgba(255,255,255,0.08);
  --color-accent: #6c63ff;
  --color-accent-light: #8b85ff;
  --color-accent-glow: rgba(108, 99, 255, 0.3);
  --color-text-primary: #f0f0f5;
  --color-text-secondary: #8888a4;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --font-sans: 'Inter', system-ui, sans-serif;
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --shadow-glow: 0 0 40px rgba(108, 99, 255, 0.15);
  --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

- [ ] Base styles: `box-sizing: border-box`, smooth scroll, font import (Inter via Google Fonts in `index.html`)
- [ ] Reusable utility classes: `.card`, `.badge`, `.btn-primary`, `.btn-ghost`, `.tag`, `.divider`
- [ ] Scrollbar styling (webkit) to match dark theme
- [ ] Keyframe animations: `fadeInUp`, `slideInRight`, `pulse`, `shimmer` (for loading states)
- [ ] Responsive breakpoints: mobile-first, breakpoint at `768px` and `1200px`

---

### Task 2.3 — `api/client.js`

- [ ] Export named async functions:
  - `startSession(url)` → POST `/api/session/start`
  - `sendMessage(sessionId, message)` → POST `/api/chat`
  - `uploadResume(sessionId, file)` → POST `/api/upload/resume` (multipart)
  - `getJobs()` → GET `/api/jobs`
- [ ] All functions throw on non-2xx with the response error message

---

### Task 2.4 — `CareerPage.jsx` (Job Listings)

- [ ] On mount, call `getJobs()` and display a responsive grid of job cards
- [ ] Each **Job Card** displays:
  - Job title (large, bold)
  - Department badge (colored pill)
  - Location + Type (icon + text)
  - Short description (2-line clamp)
  - "Apply Now" button → opens `ChatWidget` for that job
- [ ] Include a hero section at the top: headline, subheadline, and a subtle animated gradient background
- [ ] Empty/loading state: shimmer skeleton cards (use `shimmer` animation from CSS)

---

### Task 2.5 — `ChatWidget.jsx` (Agentic Chat Interface)

**This is the flagship UI component.**

#### State to manage:
```js
const [sessionId, setSessionId] = useState(null)
const [messages, setMessages] = useState([])      // { role, content, timestamp }
const [input, setInput] = useState("")
const [isLoading, setIsLoading] = useState(false)
const [isComplete, setIsComplete] = useState(false)
const [score, setScore] = useState(null)
const [resumeFile, setResumeFile] = useState(null)
```

#### Behavior:
- [ ] On open: call `startSession(window.location.href)`, show greeting from Aria (streamed feel — typewriter effect on first message)
- [ ] Message input: `Enter` to send, `Shift+Enter` for newline
- [ ] Auto-scroll to latest message on each new message
- [ ] Show typing indicator (animated dots) while awaiting AI response
- [ ] Resume upload area: drag-and-drop zone or file picker, shows filename when selected, uploads on send or on file drop
- [ ] On `is_complete: true` from backend:
  - Show a **Score Card** overlay inside the chat:
    - Total score with a circular progress ring (CSS only)
    - Per-component breakdown (Skill, Experience, Communication, Portfolio)
    - Message: "Your application has been submitted ✓" if score ≥ 60, else "Thank you for applying, we'll keep your profile on file."
- [ ] Keyboard-accessible (tab-focusable inputs, ESC to close widget)

---

### Phase 2 Validation Checklist

- [ ] `npm run dev` starts with zero errors at `localhost:5173`
- [ ] Job cards render from API data
- [ ] Chat widget opens and Aria greets the user
- [ ] Sending messages gets real AI replies
- [ ] Resume upload triggers visible feedback
- [ ] Score card appears on completion

---

## Phase 3 — Integration & Final Polish

### Task 3.1 — End-to-End Integration Test

Run a full simulated application flow:

- [ ] Open `localhost:5173` → job listings load
- [ ] Click "Apply Now" on any card → chat widget opens
- [ ] Aria greets with job-aware context (verify the job title appears in her intro)
- [ ] Provide: name, email, phone, years of experience, skills, portfolio URL
- [ ] Verify Aria never asks for a field already given mid-conversation
- [ ] Confirm `[SCREENING_COMPLETE]` is NOT visible in the UI
- [ ] Verify `candidates.json` has a new entry after completion
- [ ] Verify score calculation is non-zero and within 0-100

### Task 3.2 — Edge Case Handling

- [ ] Invalid/unreachable URL → scraper returns `""` → agent uses only `jobs.json` data as fallback context
- [ ] Candidate provides email mid-sentence (e.g., "You can reach me at hello@test.com") → auto-extracted without re-asking
- [ ] Resume upload fails → show inline error, do not crash session
- [ ] Session ID missing from chat request → return `400` with clear message
- [ ] `candidates.json` missing → create file on first write

### Task 3.3 — UI/UX Polish Pass

- [ ] Add entrance animation to chat widget (slide-in from bottom-right)
- [ ] Add `fadeInUp` animation to each new chat message
- [ ] Hover effects on all interactive elements (job cards, buttons, input)
- [ ] Focus ring styles for accessibility
- [ ] Mobile view: chat widget occupies full screen on `< 768px`
- [ ] Add a subtle ambient gradient animation to the hero section
- [ ] Ensure consistent spacing using a 4px base grid throughout

---

## Environment Variables

Create `backend/.env` (never commit to git):

```env
ANTHROPIC_API_KEY=your_key_here
```

Load in `main.py` using `python-dotenv` (add to `requirements.txt`):

```python
from dotenv import load_dotenv
load_dotenv()
```

---

## Running the Project

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## Constraints & Ground Rules for Claude Code

1. **One file at a time** — complete and validate each file before moving to the next
2. **No placeholder comments** — every function must be fully implemented, not stubbed
3. **No external UI libraries** — CSS only, as specified
4. **Fail loudly** — all errors must be caught and surfaced clearly (no silent failures)
5. **Agentic loop integrity** — never call Claude with a truncated message history; always pass full context
6. **Score only at completion** — do not calculate or expose the score mid-conversation
7. **Data privacy** — resume files stay in `uploads/`, never logged to console in production mode
