# BrandGuard AI — Evidence-Based Brand Content Governance

> **Explainable, evidence-based marketing compliance governance with human oversight.**

BrandGuard AI helps marketing teams, brand managers, and legal reviewers audit marketing copy against configurable brand guidelines before publication. The platform replaces subjective reviews with deterministic rule checks, precise character-level evidence mapping, and an immutable human governance gate.

---

## 1. Product Overview

### Core Value Proposition
Marketing compliance cannot rely on black-box predictions that hallucinate sources or fabricate compliance scores. BrandGuard AI enforces **deterministic, explainable governance**:
- **Configurable Policies**: Define prohibited terms, mandatory disclosures, tone guidelines, and custom rules in SQLite.
- **Explainable Findings**: Every flagged term maps to exact character offsets with natural-language governance justifications.
- **Actionable Suggestions**: One-click correction insertion directly into the copy editor.
- **Human Review Gate**: Automated checks never imply automatic publication clearance. Human reviewers log decisions (*Approved*, *Changes Required*, or *Rejected*) with audit notes.
- **Permanent Audit Trail**: All evaluated sessions and decisions persist across page reloads and server restarts.

---

## 2. Architecture & Design

```
                     ┌──────────────────────────────────────────────┐
                     │          BrandGuard AI Frontend              │
                     │  (React 19 + Vite + Tailwind CSS + Lucide)   │
                     └──────────────────────┬───────────────────────┘
                                            │ HTTP / JSON API
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │           FastAPI Backend Service            │
                     │   (Deterministic Rule Engine + Heuristics)   │
                     └──────────────┬───────────────────────────────┘
                                    │ SQL (Foreign Keys Enabled)
                                    ▼
                     ┌──────────────────────────────────────────────┐
                     │             SQLite Database                  │
                     │    (guidelines, reviews, findings, audit)    │
                     └──────────────────────────────────────────────┘
```

### Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React icons.
- **Backend**: Python 3.14, FastAPI, Pydantic v2, Uvicorn.
- **Database**: SQLite 3 with ACID guarantees and foreign key constraints.
- **Engine**: Pure Python deterministic rule engine with curated heuristic claim warnings.
- **Testing**: Pytest, FastAPI TestClient (`httpx`).

### Design Direction
- Restrained B2B SaaS palette: Deep navy (`#0B192C`), slate gray (`#334155`), warm white (`#F8FAFC`), and subtle blue accent (`#2563EB`).
- High-readability typography using Inter and JetBrains Mono.
- **Zero emojis, zero synthetic AI confidence scores, zero decorative filler metrics.**

---

## 3. Implemented Features

| Feature | Description | Status |
| :--- | :--- | :--- |
| **Operational Dashboard** | Real-time database statistics (total reviews, attention required, approved, active rules), recent audit log, quick onboarding banner. | ✅ Complete |
| **Brand Guidelines Studio** | Full CRUD for brand policy profiles. Configure prohibited words, mandatory terminology, tone rules, and custom policies. | ✅ Complete |
| **Interactive Content Review** | Central workspace with multi-field editor, guideline selector, one-click demo presets, and real-time governance evaluation. | ✅ Complete |
| **Evidence Map & Highlights** | Exact matched text highlighting in copy with severity indicators (High, Medium, Low, Heuristic Warning). | ✅ Complete |
| **Explainable Finding Cards** | Matched phrase, rule name, evidence explanation, recommended action, and "Apply Suggestion" button. | ✅ Complete |
| **Human Review Decision Gate** | Reviewers inspect findings, apply or dismiss suggestions, select official decision (*Approved*, *Changes Required*, *Rejected*), and record audit notes. | ✅ Complete |
| **Review History & Audit Trail** | Searchable audit table with decision filters, findings counts, timestamps, and full inspection drawer. | ✅ Complete |
| **System & Status Diagnostics** | Live API health checks, database connection status, ping latency, and verification matrix. | ✅ Complete |

---

## 4. Quick Start (Windows Local Development)

### Prerequisites
- Python 3.10+ (tested on Python 3.14.6)
- Node.js 18+ (tested on Node v24.20.0 and npm 11.19.0)
- Git

### Terminal 1: Backend Setup & Launch (PowerShell)

```powershell
# Navigate to project root
cd c:\BrandGuard_ai

# Create and activate Python virtual environment
python -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs at: `http://127.0.0.1:8000` (API docs at `http://127.0.0.1:8000/docs`)*

### Terminal 2: Frontend Setup & Launch (PowerShell)

```powershell
# In a second PowerShell terminal:
cd c:\BrandGuard_ai\frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend runs at: `http://localhost:5173`*

---

## 5. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status and database connectivity check |
| `GET` | `/api/stats` | Dashboard metrics calculated directly from SQLite tables |
| `GET` | `/api/guidelines` | List all brand guideline profiles |
| `POST` | `/api/guidelines` | Create a new brand guideline profile |
| `GET` | `/api/guidelines/{id}` | Retrieve specific guideline with full rule definitions |
| `PUT` | `/api/guidelines/{id}` | Update guideline rules and metadata |
| `DELETE` | `/api/guidelines/{id}` | Delete guideline profile (with guard on sole profile) |
| `POST` | `/api/guidelines/{id}/activate` | Set specific guideline profile as active |
| `POST` | `/api/analyze` | Evaluate marketing copy against active or specified guideline |
| `GET` | `/api/reviews` | List all saved reviews with findings metrics and decisions |
| `GET` | `/api/reviews/{id}` | Retrieve a specific review, its original copy, and findings |
| `POST` | `/api/reviews/{id}/decision` | Record human governance decision and audit notes |
| `PATCH` | `/api/reviews/{id}/findings/{fid}` | Update status of an individual finding (*reviewed*, *accepted*, *dismissed*) |
| `DELETE` | `/api/reviews/{id}` | Delete a review and its associated findings |

---

## 6. Testing & Reliability

Automated pytest tests verify all core hackathon specifications:

```powershell
# From project root:
.\backend\venv\Scripts\pytest -v backend\tests
```

### Verified Test Cases
1. **Test A — Violation Detected**:
   - Prohibited term `"guaranteed"` flagged with High severity and suggested replacement.
   - Missing required term `"quality-tested"` detected and flagged with Medium severity.
2. **Test B — Clean Content**:
   - Content satisfying all configured rules returns 0 violations without claiming factual verification.
3. **Test C — Persistence**:
   - Guideline creation and content reviews persist in SQLite and are retrievable across reboots.
4. **Test D — Human Review Gate**:
   - Recording an official decision (*Changes Required*) with reviewer notes updates and persists in SQLite.
5. **Test E — Error Handling**:
   - Safely rejects empty content, empty titles, and invalid inputs with standard HTTP 400/422 responses.

---

## 7. Explainability & Limitations Declaration

- **Deterministic Rule Engine**: BrandGuard AI uses a transparent, deterministic matching engine. It does not hallucinate sources or claim factual truth of marketing assertions.
- **Heuristic Warnings**: Marketing superlatives (e.g., *"unmatched performance"*, *"completely unhackable"*) are explicitly labeled as heuristic warnings rather than factual disproofs.
- **Human Oversight**: Machine evaluation assists brand teams; human sign-off remains mandatory.

---

## 8. Next Priority Tasks for Production
1. **SSO & Role-Based Access Control**: Assign distinct roles (Copywriter, Brand Reviewer, Legal Approver).
2. **Multi-Format Ingestion**: Support direct upload and parsing of PDF campaign briefs and DOCX files.
3. **Optional LLM Nuance Layer**: Optional toggle for nuanced semantic tone suggestions using API keys stored in `.env`.
