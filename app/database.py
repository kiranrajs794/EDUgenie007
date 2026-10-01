import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "edugenie.db"

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with connect() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS quiz_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            score INTEGER NOT NULL,
            total INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """)

def save_quiz(topic: str, difficulty: str, score: int, total: int):
    with connect() as conn:
        conn.execute(
            "INSERT INTO quiz_history(topic,difficulty,score,total) VALUES(?,?,?,?)",
            (topic, difficulty, score, total)
        )

def get_history(limit: int = 30):
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, topic, difficulty, score, total, created_at "
            "FROM quiz_history ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
