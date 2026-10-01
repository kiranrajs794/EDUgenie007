from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from app.ai_engine import generate_text, make_quiz
from app.database import init_db, save_quiz, get_history

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="EduGenie API",
    description="AI-powered educational assistant",
    version="1.0.0",
    lifespan=lifespan
)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

class TopicRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=1000)

class QuizRequest(TopicRequest):
    count: int = Field(default=5, ge=1, le=10)
    difficulty: str = Field(default="Beginner", pattern="^(Beginner|Intermediate|Advanced)$")

class TextRequest(BaseModel):
    text: str = Field(min_length=10, max_length=15000)

class QuizResult(BaseModel):
    topic: str = Field(min_length=1, max_length=1000)
    difficulty: str
    score: int = Field(ge=0)
    total: int = Field(gt=0)

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "EduGenie"}

@app.post("/api/ask")
async def ask(data: TopicRequest):
    prompt = f"""You are EduGenie, a patient educational assistant.
Answer the student's question accurately in simple English.
Use a short explanation, clear formatting, and an example if useful.
If a question is ambiguous, state the assumption.
Student question: {data.topic}"""
    try:
        return {"answer": await generate_text(prompt)}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(exc)[:220]}")

@app.post("/api/quiz")
async def quiz(data: QuizRequest):
    try:
        return await make_quiz(data.topic, data.count, data.difficulty)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Quiz generation failed: {str(exc)[:220]}")

@app.post("/api/learning-path")
async def learning_path(data: TopicRequest):
    prompt = f"""
Create a practical learning path for {data.topic!r} for a student.
Return valid JSON with keys: title, overview, estimated_duration, stages.
stages must be a list of objects with keys: level, duration, goals (list of strings),
topics (list of strings), activities (list of strings), checkpoint (string).
Include beginner, intermediate, and advanced stages. Be realistic, clear, and concise.
Return JSON only."""
    try:
        from app.ai_engine import extract_json
        result = extract_json(await generate_text(prompt, json_mode=True))
        if not isinstance(result, dict) or not isinstance(result.get("stages"), list):
            raise ValueError("Invalid learning path structure.")
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Learning path generation failed: {str(exc)[:220]}")

@app.post("/api/summarize")
async def summarize(data: TextRequest):
    prompt = f"""Summarize the educational passage below in simple English.
Return sections: Short overview, Key points (bullets), Important terms.
Do not add facts that are not supported by the passage.
Passage:
{data.text}"""
    try:
        return {"summary": await generate_text(prompt)}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Summarization failed: {str(exc)[:220]}")

@app.post("/api/quiz-result")
async def quiz_result(data: QuizResult):
    if data.score > data.total:
        raise HTTPException(status_code=400, detail="Score cannot exceed total.")
    save_quiz(data.topic, data.difficulty, data.score, data.total)
    return {"saved": True, "message": "Quiz result saved."}

@app.get("/api/history")
async def history():
    return {"history": get_history()}
