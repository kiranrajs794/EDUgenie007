# EduGenie – AI-Powered Educational Assistant

EduGenie is a lightweight learning assistant built with **FastAPI**, **HTML**, **CSS**, **JavaScript**, and the **OpenRouter API**. It supports AI question answering, concept simplification, quiz generation, learning paths, and text summarization.

## Features

- Ask academic questions and receive clear explanations
- Simplify difficult concepts
- Generate multiple-choice quizzes with explanations and interactive scoring
- Create beginner-to-advanced learning paths with suggested timelines
- Summarize educational passages
- Responsive web interface
- API key stored on the backend in `.env`

## Requirements

- Python 3.10+
- VS Code (recommended)
- Internet connection for OpenRouter model requests
- OpenRouter API key and access to a model supported by your account

## 1. Download and open

Extract the EduGenie project folder and open it in VS Code using **File → Open Folder**.

## 2. Create a virtual environment

Open the VS Code terminal in the project directory.

### Windows (PowerShell)

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 3. Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 4. Configure OpenRouter

1. Create or sign in to your account at https://openrouter.ai/.
2. Generate an API key from your OpenRouter account.
3. Copy `.env.example` to a new file named `.env` in the project root.
4. Replace the placeholder with your key:

```env
OPENROUTER_API_KEY=your_actual_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
APP_URL=http://localhost:8000
```

Choose a model identifier currently available to your OpenRouter account. Model availability, pricing, and free-tier limits can change. The model shown is an example; set `OPENROUTER_MODEL` to the exact model slug you intend to use.

**Security:** Never paste your API key into `app.js`, `index.html`, screenshots, public issues, or a GitHub commit. The `.env` file is excluded by `.gitignore`. If a key is accidentally exposed, revoke it and create a new one.

## 5. Run EduGenie

With the virtual environment activated:

```bash
uvicorn main:app --reload
```

Open http://127.0.0.1:8000 in your browser. FastAPI's interactive API documentation is available at http://127.0.0.1:8000/docs.

Stop the server with `Ctrl+C`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Serve the web interface |
| GET | `/api/health` | Check server status |
| POST | `/api/ask` | Answer a question |
| POST | `/api/simplify` | Explain material simply |
| POST | `/api/quiz` | Generate a JSON multiple-choice quiz |
| POST | `/api/learning-path` | Generate a structured learning path |
| POST | `/api/summarize` | Summarize educational text |

Example request for `/api/ask`:

```json
{
  "question": "Which is the largest ocean?",
  "level": "Beginner"
}
```

## GitHub: publish your project

1. Create a new empty repository on https://github.com/new (for example, `EduGenie`).
2. Ensure `.env` is not staged. The included `.gitignore` excludes it.
3. In the VS Code terminal, run:

```bash
git init
git add .
git status
```

Review the status and confirm `.env` is not listed. Then:

```bash
git commit -m "Initial EduGenie project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/EduGenie.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. If Git asks you to authenticate, complete the GitHub sign-in flow.

## Troubleshooting

- **Missing API key:** Confirm `.env` is in the same directory as `main.py`, and restart Uvicorn after editing it.
- **401 / 403 from OpenRouter:** Check that the key is valid and has access to the selected model.
- **Model not found:** Confirm `OPENROUTER_MODEL` uses an exact model slug currently supported by your account.
- **429 / rate limit:** Check your account's model limits or billing and retry later.
- **502 from EduGenie:** Check the terminal for details; the model provider may have returned an error or unexpected output.
- **Port already in use:** Run `uvicorn main:app --reload --port 8001` and open `http://127.0.0.1:8001`.

## Current scope and next steps

This is a local-development starter project. It does not include user accounts, saved chat history, a database, teacher/admin dashboards, or production deployment configuration. Before public deployment, add authentication and rate limiting, set restrictive request limits, configure HTTPS and trusted origins as appropriate, and review privacy and content-safety requirements.

## License

Choose a license before publishing if you want others to reuse or modify the project. For example, add an MIT `LICENSE` file if that matches your intended distribution.
