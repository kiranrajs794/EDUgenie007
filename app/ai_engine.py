import json
import os
import re
import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

async def generate_text(prompt: str, *, json_mode: bool = False) -> str:
    # Prefer cloud Gemini when an API key is configured; otherwise use local Ollama.
    if GEMINI_API_KEY:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        )
        generation_config = {"temperature": 0.4}
        if json_mode:
            generation_config["responseMimeType"] = "application/json"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": generation_config
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(180.0)) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini returned no response. Check the API key and model.")
        parts = candidates[0].get("content", {}).get("parts", [])
        result = "\n".join(p.get("text", "") for p in parts).strip()
    else:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.4}
        }
        if json_mode:
            payload["format"] = "json"
        async with httpx.AsyncClient(timeout=httpx.Timeout(180.0)) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            data = response.json()
        result = data.get("response", "").strip()
    if not result:
        raise RuntimeError("The AI model returned an empty response.")
    return result

def extract_json(raw: str):
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}|\[.*\]", raw, re.S)
        if not match:
            raise ValueError("AI did not return valid JSON.")
        return json.loads(match.group(0))

async def make_quiz(topic: str, count: int, difficulty: str):
    prompt = f"""
Create exactly {count} educational multiple-choice questions about {topic!r}.
Difficulty: {difficulty}. Return ONLY valid JSON with this structure:
{{
 "title": "Quiz title",
 "questions": [
  {{
   "question": "Question text",
   "options": ["A", "B", "C", "D"],
   "answer": 0,
   "explanation": "Short explanation"
  }}
 ]
}}
The answer must be the zero-based index of the correct option. Ensure one unambiguous correct answer per question, four distinct options, and age-appropriate educational content.
"""
    raw = await generate_text(prompt, json_mode=True)
    obj = extract_json(raw)
    questions = obj.get("questions", [])
    valid = []
    for q in questions[:count]:
        opts = q.get("options")
        ans = q.get("answer")
        if (isinstance(q.get("question"), str) and isinstance(opts, list)
            and len(opts) == 4 and all(isinstance(x, str) for x in opts)
            and isinstance(ans, int) and 0 <= ans < 4):
            valid.append({
                "question": q["question"],
                "options": opts,
                "answer": ans,
                "explanation": str(q.get("explanation", ""))
            })
    if len(valid) < 1:
        raise ValueError("Could not create a valid quiz. Please try again.")
    return {"title": str(obj.get("title", f"{topic} Quiz")), "questions": valid}
