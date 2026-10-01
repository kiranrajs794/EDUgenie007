import os
from pathlib import Path
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="EduGenie API", version="1.0.0")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

class StudyRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=12000)
    level: str = Field(default="Beginner", max_length=60)

class QuizRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=300)
    count: int = Field(default=5, ge=3, le=10)
    level: str = Field(default="Beginner", max_length=60)

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    level: str = Field(default="Beginner", max_length=60)

async def ask_model(system_prompt: str, user_prompt: str) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    if not api_key or api_key == "your_openrouter_api_key_here":
        raise HTTPException(
            status_code=500,
            detail="OpenRouter API key is missing. Add it to your .env file."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("APP_URL", "http://localhost:8000"),
        "X-Title": "EduGenie",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.5,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENROUTER_URL, headers=headers, json=payload
            )
        if response.status_code >= 400:
            try:
                message = response.json().get("error", {}).get("message", response.text)
            except ValueError:
                message = response.text
            raise HTTPException(status_code=502, detail=f"OpenRouter error: {message}")
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="The AI request timed out. Please try again.")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not connect to OpenRouter.")
    except (KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="The AI returned an unexpected response.")

@app.get("/")
async def home():
    return FileResponse(BASE_DIR / "static" / "index.html")

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "EduGenie"}

@app.post("/api/ask")
async def ask(request: ChatRequest):
    answer = await ask_model(
        "You are EduGenie, a helpful educational assistant. Explain accurately in clear, "
        "simple language appropriate to the learner's level. Use short headings or examples "
        "when useful. If a question is ambiguous, state the assumption. Do not invent facts.",
        f"Learner level: {request.level}\nQuestion: {request.question}",
    )
    return {"answer": answer}

@app.post("/api/simplify")
async def simplify(request: StudyRequest):
    answer = await ask_model(
        "You are an expert teacher. Explain the supplied educational material in simple "
        "language without changing its meaning. Define key terms and include a brief example "
        "or analogy when helpful. Avoid unsupported additions.",
        f"Learner level: {request.level}\nMaterial:\n{request.text}",
    )
    return {"answer": answer}

@app.post("/api/summarize")
async def summarize(request: StudyRequest):
    answer = await ask_model(
        "You are an educational summarizer. Summarize the supplied text faithfully. "
        "Use a short overview, key points, and important terms. Do not add information "
        "that is not supported by the text.",
        f"Learner level: {request.level}\nText to summarize:\n{request.text}",
    )
    return {"answer": answer}

@app.post("/api/learning-path")
async def learning_path(request: StudyRequest):
    answer = await ask_model(
        "You are a curriculum designer. Create a practical learning path for the topic. "
        "Organize it from beginner to intermediate to advanced, with ordered topics, "
        "suggested time estimates, practice activities, and a final project. Make it "
        "appropriate to the learner's level and avoid claiming the plan guarantees mastery.",
        f"Learner level: {request.level}\nTopic or goal: {request.text}",
    )
    return {"answer": answer}

@app.post("/api/quiz")
async def quiz(request: QuizRequest):
    answer = await ask_model(
        "You are an educational assessment designer. Return ONLY valid JSON, with no "
        "Markdown fences or commentary. Use this exact schema: "
        '{"title":"...","questions":[{"question":"...","options":["A...","B...","C...","D..."],'
        '"correct_index":0,"explanation":"..."}]}. correct_index must be a zero-based integer. '
        "Make one unambiguous correct answer per question and provide a useful explanation.",
        f"Create {request.count} multiple-choice questions about: {request.topic}. "
        f"Learner level: {request.level}.",
    )
    # Validate the model output before returning it to the frontend.
    import json
    cleaned = answer.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, dict) or not isinstance(parsed.get("questions"), list):
            raise ValueError("Invalid quiz structure")
        return parsed
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="The AI did not return a valid quiz. Please try generating it again."
        )
