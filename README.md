# AI-Powered Career Assistant

An agentic job application system that screens candidates through a real-time AI chat interface. The AI recruiter ("Aria") collects candidate info, scores applications, and stores results — all automatically.

Supports **Claude** (Anthropic) and **Gemini** (Google) as AI providers, switchable at runtime from an admin panel.

---

## Features

- Live job listings fetched from a FastAPI backend
- AI chat widget powered by Claude or Gemini
- Aria auto-extracts name, email, phone, experience, skills, and portfolio from natural conversation
- Resume upload (PDF / TXT) with auto field extraction
- Candidate scoring: Skill Match (40) + Experience (30) + Communication (10) + Portfolio (20)
- Admin panel to switch AI providers live — no server restart needed
- All data stored locally as JSON flat files (no database required)

---

## Project Structure

```
bot/
├── backend/
│   ├── main.py                 # FastAPI app, all routes
│   ├── providers.py            # Claude + Gemini provider abstraction
│   ├── config.py               # Runtime provider config (data/config.json)
│   ├── recruitment_agent.py    # Agentic loop, scoring logic
│   ├── scraper.py              # URL → clean Markdown
│   ├── models.py               # Pydantic schemas
│   ├── storage.py              # JSON file read/write
│   ├── data/
│   │   ├── candidates.json     # Saved candidate records
│   │   ├── jobs.json           # Job listings
│   │   └── config.json         # Active provider (auto-created)
│   ├── uploads/                # Uploaded resume files
│   ├── .env                    # API keys (never commit this)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── CareerPage.jsx  # Job listings grid
    │   │   ├── ChatWidget.jsx  # AI chat interface
    │   │   └── AdminPanel.jsx  # Provider switcher (bottom-left gear icon)
    │   └── api/
    │       └── client.js       # Axios API wrappers
    ├── index.html
    └── vite.config.js
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.11 or higher |
| Node.js | 18 or higher |
| npm | 9 or higher |

You need at least one of:
- **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)
- **Google Gemini API key** — get one at [aistudio.google.com](https://aistudio.google.com)

---

## Configuration

### 1. Set API keys

Edit `backend/.env`:

```env
# Claude (Anthropic) — required if using Claude
ANTHROPIC_API_KEY=sk-ant-...

# Gemini (Google) — required if using Gemini
GEMINI_API_KEY=AIza...

# Default provider at startup: claude or gemini
AI_PROVIDER=claude
```

- You only need to fill in the key(s) for the provider(s) you plan to use.
- `AI_PROVIDER` sets the default. You can change it live from the admin panel without restarting.
- **Never commit `.env` to git.**

### 2. Jobs data

Edit `backend/data/jobs.json` to add your real job listings. Each entry must have:

```json
{
  "id": "job-001",
  "title": "Software Engineer",
  "department": "Engineering",
  "location": "Remote",
  "type": "Full-time",
  "description": "...",
  "requirements": ["3+ years Python", "REST APIs", "..."]
}
```

---

## Local Development

Open two terminals.

### Terminal 1 — Backend

```bash
cd backend

# Create and activate a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

### Terminal 2 — Frontend

```bash
cd frontend

npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Production Deployment

### Backend

For production, run Uvicorn without `--reload` and set the number of workers:

```bash
cd backend
source venv/bin/activate

uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Or use **Gunicorn** with Uvicorn workers (recommended for multi-core):

```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Systemd service (Linux)

Create `/etc/systemd/system/career-bot.service`:

```ini
[Unit]
Description=Career Assistant API
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/bot/backend
EnvironmentFile=/path/to/bot/backend/.env
ExecStart=/path/to/bot/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable career-bot
sudo systemctl start career-bot
```

### Frontend

Build the static files and serve them:

```bash
cd frontend
npm run build
# Output is in frontend/dist/
```

Serve `dist/` using Nginx, Caddy, or any static file host.

#### Nginx example

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve React frontend
    root /path/to/bot/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Serve uploaded resumes
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

> For HTTPS, add a certificate via [Certbot](https://certbot.eff.org): `sudo certbot --nginx -d your-domain.com`

### CORS in production

Update `main.py` to allow your production domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    ...
)
```

---

## Admin Panel — Switching AI Providers

The gear icon in the **bottom-left corner** of the app opens the admin panel.

- Shows which providers are available (based on keys set in `.env`)
- Click a provider to switch instantly — all new chat sessions use the new provider
- The choice is saved to `backend/data/config.json` and persists across restarts
- `AI_PROVIDER` in `.env` is only the startup default; the admin panel overrides it

| Provider | Model used | Key needed |
|---|---|---|
| Claude | `claude-3-5-sonnet-20241022` | `ANTHROPIC_API_KEY` |
| Gemini | `gemini-1.5-pro` | `GEMINI_API_KEY` |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/session/start` | Start a chat session. Body: `{ "url": "..." }` |
| `POST` | `/api/chat` | Send a message. Body: `{ "session_id": "...", "message": "..." }` |
| `POST` | `/api/upload/resume` | Upload resume (multipart). Fields: `session_id`, `file` |
| `GET` | `/api/jobs` | List all job openings |
| `GET` | `/api/candidates` | List all candidate records (admin) |
| `GET` | `/api/admin/config` | Get current AI provider config |
| `POST` | `/api/admin/config` | Switch provider. Body: `{ "provider": "claude" \| "gemini" }` |

Full interactive docs available at `http://localhost:8000/docs` when the server is running.

---

## Candidate Scoring

Each completed screening is scored out of 100:

| Component | Max | How it's calculated |
|---|---|---|
| Skill Match | 40 | AI compares candidate skills vs job requirements |
| Experience | 30 | 5+ yrs → 30, 3+ yrs → 22, 1+ yr → 14, else → 5 |
| Communication | 10 | AI rates transcript clarity and professionalism |
| Portfolio | 20 | 15 base for having a URL, up to 20 for relevance |

Score ≥ 60: "Application Submitted"  
Score < 60: "Profile saved on file"

---

## Troubleshooting

**`uvicorn` not found**  
Make sure your virtual environment is activated: `source venv/bin/activate`

**`ANTHROPIC_API_KEY` / `GEMINI_API_KEY` errors**  
Check that `backend/.env` exists and the key is correct. The `.env` file must be in the `backend/` directory.

**Provider shows as unavailable in admin panel**  
The API key for that provider is not set in `.env`. Add it and restart the backend.

**Chat widget shows "Session not found"**  
The backend restarted and cleared in-memory sessions. Refresh the page to start a new session.

**PDF resume text is empty**  
`pdfminer.six` only extracts text from text-based PDFs. Scanned image PDFs are not supported.

**CORS errors in production**  
Update `allow_origins` in `main.py` to include your exact frontend domain (no trailing slash).

**Port 8000 already in use**  
`lsof -i :8000` to find the process, then `kill <PID>`, or change the port in the uvicorn command and update `vite.config.js` to proxy to the new port.
# lumina-recruit_ai-bot
