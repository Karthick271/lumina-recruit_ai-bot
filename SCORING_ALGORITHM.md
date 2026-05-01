# AI Recruitment Screening — Algorithm Design

> **Author:** Lumina Recruit AI  
> **Version:** 1.0  
> **Date:** 2026-05-01

---

## Overview

A multi-stage candidate evaluation system powered by Claude AI that replicates how a real recruiter screens candidates — through knockout filters, weighted scoring, and behavioral red flag detection.

---

## Stage 1 — Knockout Filters (Pass/Fail)

Run before any scoring. If candidate fails, score is capped at **25/100**.

| Filter | Condition |
|---|---|
| Minimum experience | Below hard requirement for the role |
| Core skill absence | Missing all must-have skills listed in job description |
| Location mismatch | Role is on-site, candidate is in a different city/country |

---

## Stage 2 — Scoring Model (100 Points Total)

### 2.1 Technical Fit — 40 pts

| Sub-criteria | Points | Method |
|---|---|---|
| Must-have skills present | 25 | Claude compares candidate skills vs job requirements |
| Nice-to-have skills | 10 | Claude checks secondary requirements |
| Skill depth & recency | 5 | "5 years React" scores higher than "knows React" |

### 2.2 Experience Quality — 25 pts

| Sub-criteria | Points | Method |
|---|---|---|
| Years of experience (scaled) | 10 | Linear: 5+ yrs = 10, 3 yrs = 7, 1 yr = 4, <1 yr = 1 |
| Relevance to role | 10 | Claude scores domain relevance vs generic experience |
| Career progression | 5 | Growing responsibilities over time = higher score |

### 2.3 Soft Signals — 25 pts

| Sub-criteria | Points | Method |
|---|---|---|
| Communication clarity | 10 | Claude assesses transcript — specific answers vs vague |
| Enthusiasm for this role | 10 | Shows role/company research, asks questions back |
| Evidence of real impact | 5 | Quantified achievements with context |

### 2.4 Portfolio / Work Evidence — 10 pts

| Sub-criteria | Points | Method |
|---|---|---|
| Portfolio/GitHub present | 4 | URL provided during chat |
| Relevance to role | 6 | Claude reviews if work matches job requirements |

---

## Stage 3 — Score Adjustments

### Green Flag Bonuses (max +15)

| Signal | Bonus |
|---|---|
| Cited specific metrics ("reduced load time by 40%") | +5 |
| Asked an intelligent question about the role | +5 |
| Demonstrated company/product research | +5 |

### Red Flag Penalties (max -55)

| Flag | Penalty |
|---|---|
| AI-generated resume detected (HIGH confidence) | -25 |
| AI-generated resume detected (MEDIUM confidence) | -15 |
| Contradicted themselves mid-conversation | -10 |
| Can't explain resume points when asked live | -10 |
| Vague answers to every specific question | -5 |
| No engagement — never asked anything back | -5 |

---

## Stage 4 — AI Resume Detection

Five signals combined into a single confidence score.

| Signal | Weight | What It Detects |
|---|---|---|
| Claude LLM Analysis | 30% | AI linguistic patterns, buzzword density, unnatural structure |
| Live Chat Consistency | 20% | Can't explain their own resume when asked in real-time |
| Specificity Audit | 20% | Vague generic claims vs specific real-world context |
| Burstiness Score | 15% | Unnaturally uniform sentence complexity (AI trait) |
| File Metadata Forensics | 15% | PDF/DOCX metadata reveals creation tool and timestamps |

### 4.1 Metadata Forensics Detail

Extracts from the uploaded PDF or DOCX file at the time of resume upload.

| Metadata Field | Red Flag Signal |
|---|---|
| Creator / Producer field | Known AI builder (Zety, Resume.io, Rezi, Enhancv, wkhtmltopdf) |
| Creation = Modification timestamp | Never manually edited — one-shot generation |
| Edit window under 60 seconds | Impossible for a human to write a full resume that fast |
| Blank Author field | AI tools often omit this |
| lastModifiedBy = "ChatGPT" | Directly exposed in .docx XML internals |

### 4.2 Burstiness Score

Human writing has natural variation — short punchy sentences mixed with long detailed ones.  
AI writing sits at consistent medium complexity throughout.

```
Low burstiness (CV < 0.25) → AI
High burstiness (CV > 0.50) → Likely human
```

### 4.3 Specificity Audit

Real resumes contain verifiable, contextual details. AI resumes are deliberately generic.

```
Specific (human):  "Reduced API p99 latency from 840ms to 120ms by migrating
                    from REST polling to WebSockets at Stripe"

Vague (AI):        "Improved system performance and reduced latency across
                    multiple services"
```

### 4.4 Live Chat Consistency

Aria (AI recruiter) asks follow-up questions mid-conversation that only someone who actually did the work can answer:

- "Walk me through the hardest technical decision on that project."
- "How did you measure that performance improvement?"
- "What would you do differently looking back?"
- "Tell me about a mistake you made at [company] and how you handled it."

If the candidate's live answers contradict or show unfamiliarity with their resume, it is flagged.

### 4.5 AI Resume Verdict Thresholds

| Confidence | Verdict | Score Penalty |
|---|---|---|
| > 75% | Almost certainly AI-generated | -25 |
| 55–75% | Likely AI-assisted | -15 |
| 35–55% | Some AI patterns — flag for human review | -5 |
| < 35% | Likely authentic | 0 |

---

## Stage 5 — Final Classification

| Total Score | Recommendation |
|---|---|
| 80–100 | Strong Hire |
| 65–79 | Hire |
| 50–64 | Maybe — Needs Human Review |
| 25–49 | No Hire |
| 0–24 | Knockout — Did not meet minimum requirements |

---

## Data Collected During Chat

Aria (the AI recruiter) progressively collects the following during the screening conversation:

```
Name → Email → Phone → Years of Experience
→ Skills → Portfolio / GitHub URL → Resume Upload
```

Once all fields are collected, scoring runs automatically and the session is marked complete.

---

## Score Components at a Glance

```
Technical Fit        40 pts  ████████████████████
Experience Quality   25 pts  ████████████
Soft Signals         25 pts  ████████████
Portfolio            10 pts  █████
                    ─────────────────
Base Total          100 pts

Green Flag Bonuses   +15 max
Red Flag Penalties   -55 max
                    ─────────────────
Final Score         0 – 100 pts (capped at both ends)
```

---

## Common AI Buzzwords Flagged

The following terms are tracked for density. A high concentration is a signal of AI authoring:

```
spearheaded · orchestrated · leveraged · championed · pioneered
facilitated · utilized · dynamic · passionate · results-driven
detail-oriented · self-motivated · proactive · innovative
proven track record · strong communication skills
fast-paced environment · cross-functional teams
drove significant · key stakeholder · end-to-end
synergy · scalable solutions · robust architecture
mission-critical · best-in-class
```

---

## Known AI Resume Builder Fingerprints

The following tool names in PDF/DOCX metadata are treated as automatic flags:

```
Resume builders:   Resume.io · Zety · Novoresume · Enhancv
                   Kickresume · Rezi · ResumeWorded · Teal

PDF engines:       wkhtmltopdf · WeasyPrint · Prince
                   Puppeteer · Playwright · FPDF · ReportLab

Content tools:     Notion · Coda (when used as AI drafting tools)
```

---

*This document covers the scoring and detection algorithm only. Implementation details are in `backend/recruitment_agent.py`.*
