# AI Recruitment Assistant (Next.js + Mastra)

An agentic job application system that screens candidates using a real-time AI chat interface. The AI recruiter ("Aria") extracts candidate information (name, experience, skills) and evaluates them against job records.

This project is built using a modern 3-tier architecture:
- **Frontend/Backend:** Next.js 14 (App Router) + TypeScript
- **Agent Framework:** Mastra (`@mastra/core`)
- **Database / Vector Store:** PgVector (PostgreSQL)
- **Deployment:** Docker + AWS EC2 + GitHub Actions CI/CD

---

## Prerequisites

- **Node.js**: v18 or higher
- **Docker & Docker Compose**: For running the database and services locally
- **API Keys**: You need an API key for your chosen AI provider (e.g., Google Gemini). Get one at [Google AI Studio](https://aistudio.google.com).

---

## 1. Local Development (The Easy Way - Docker)

The easiest way to run the entire stack (Next.js app, Mastra Studio, and PgVector Database) is using Docker Compose.

### Step 1: Environment Variables
Create a `.env` file in the `web` directory:
```bash
cd web
touch .env
```
Add your AI provider API key to `web/.env`:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

### Step 2: Start the Services
From the root directory of the project, run:
```bash
docker-compose up -d --build
```

### Step 3: Access the Application
- **Next.js Web App:** [http://localhost:3000](http://localhost:3000)
- **Mastra Studio:** [http://localhost:4000](http://localhost:4000)
- **Database:** `localhost:5432` (User: `mastra`, Password: `mastra_password`, DB: `mastra_db`)

---

## 2. Local Development (Without Docker)

If you prefer to run Next.js and Mastra directly on your host machine:

### Step 1: Install Dependencies
```bash
cd web
npm install
```

### Step 2: Set up Environment Variables
Ensure your `web/.env` file exists with your `GOOGLE_GENERATIVE_AI_API_KEY`.

### Step 3: Start the Next.js Dev Server
```bash
npm run dev
```
The web application will be available at `http://localhost:3000`.

### Step 4: Start Mastra Studio (Optional)
In a separate terminal window, navigate to the `web` folder and run:
```bash
npx mastra dev --port 4000
```
Mastra Studio will be available at `http://localhost:4000`.

---

## Project Structure

```text
.
├── docker-compose.yml          # Local and production docker orchestration
├── .github/workflows/          # CI/CD pipelines
│   └── deploy.yml              # Auto-deploys to AWS EC2 on push to main
└── web/
    ├── Dockerfile              # Next.js multi-stage build instructions
    ├── package.json
    └── src/
        ├── app/                # Next.js App Router pages and API routes
        ├── services/           # External API integrations (e.g., Workday mock)
        │   └── workday.ts
        └── mastra/             # Mastra Agent Framework setup
            ├── index.ts        # Mastra core initialization
            └── agents/
                └── recruiter.ts # Aria AI recruiter definition
```

---

## CI/CD & Deployment Strategy

This project uses GitHub Actions for continuous integration and deployment. Upon pushing to the `main` branch, the pipeline will:
1. Build the Next.js Docker image.
2. Push the image to DockerHub.
3. SSH into the configured AWS EC2 instance.
4. Pull the new image and restart the containers via `docker-compose`.

### Required GitHub Secrets

To make the deployment pipeline work, configure the following **Repository Secrets** in GitHub:

- `DOCKERHUB_USERNAME`: Your DockerHub username
- `DOCKERHUB_TOKEN`: Your DockerHub access token (or password)
- `EC2_HOST`: The public IP or DNS of your AWS EC2 instance
- `EC2_USERNAME`: The SSH user (e.g., `ubuntu` or `ec2-user`)
- `EC2_SSH_KEY`: The private PEM key for SSH access to your EC2 instance

> **Note:** Make sure your EC2 instance has Docker and Docker Compose installed, and that you have cloned this repository onto the server in the `/home/<user>/app` directory as expected by the deployment script.

---

## Upcoming Features

- Real Workday API integration once tenant credentials are provided.
- Next.js UI integration with the Mastra AI agent for the chat widget.
- Vector embeddings pipeline for matching candidate resumes to job descriptions.
