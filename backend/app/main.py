from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS
from .database import init_db, get_db
from .routes import guidelines, analyze, reviews


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed default guideline if empty
    init_db()
    yield


app = FastAPI(
    title="BrandGuard AI — Evidence-Based Brand Content Governance API",
    description="Deterministic rule engine and governance API for marketing content compliance.",
    version="1.0.0",
    lifespan=lifespan,
)


# Configure CORS for local development and Vercel deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Service Health Check
@app.get("/health")
def health_check():
    # Verify DB connectivity
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "service": "BrandGuard AI Backend",
        "version": "1.0.0",
        "database": db_status,
        "engine": "deterministic_rule_engine",
    }


# Dashboard Stats Endpoint
@app.get("/api/stats")
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) AS total_reviews FROM reviews;")
    total_reviews = cursor.fetchone()["total_reviews"]

    cursor.execute("SELECT COUNT(*) AS approved_reviews FROM reviews WHERE final_decision = 'approved';")
    approved_reviews = cursor.fetchone()["approved_reviews"]

    cursor.execute("SELECT COUNT(*) AS attention_reviews FROM reviews WHERE final_decision = 'changes_required' OR (final_decision IS NULL AND status = 'pending_review');")
    attention_reviews = cursor.fetchone()["attention_reviews"]

    cursor.execute("SELECT COUNT(*) AS rejected_reviews FROM reviews WHERE final_decision = 'rejected';")
    rejected_reviews = cursor.fetchone()["rejected_reviews"]

    cursor.execute("SELECT COUNT(*) AS total_guidelines FROM guidelines;")
    total_guidelines = cursor.fetchone()["total_guidelines"]

    cursor.execute("SELECT COUNT(*) AS total_findings FROM findings;")
    total_findings = cursor.fetchone()["total_findings"]

    conn.close()

    return {
        "total_reviews": total_reviews,
        "approved_reviews": approved_reviews,
        "attention_reviews": attention_reviews,
        "rejected_reviews": rejected_reviews,
        "total_guidelines": total_guidelines,
        "total_findings": total_findings,
    }


# Register feature routers
app.include_router(guidelines.router)
app.include_router(analyze.router)
app.include_router(reviews.router)
