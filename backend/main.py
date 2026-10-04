from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from huggingface_hub import InferenceClient
from dotenv import load_dotenv

import requests
import sqlite3
import os


# --------------------------------------------------
# Environment
# --------------------------------------------------

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")

if not HF_TOKEN:
    print("WARNING: HF_TOKEN not found in .env")


# --------------------------------------------------
# App
# --------------------------------------------------

app = FastAPI(title="CP Compass API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://cp-compass-eight.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Hugging Face AI
# --------------------------------------------------

ai_client = InferenceClient(
    api_key=HF_TOKEN,
    provider="auto"
)


# --------------------------------------------------
# Models
# --------------------------------------------------

class Reflection(BaseModel):
    problem_id: str
    status: str
    note: str = ""


class AIProblem(BaseModel):
    problem_id: str
    name: str
    rating: int | None = None
    tags: list[str] = []
    status: str
    note: str = ""


class AnalysisRequest(BaseModel):
    handle: str
    problems: list[AIProblem]


# --------------------------------------------------
# Database
# --------------------------------------------------

def get_db():
    conn = sqlite3.connect("cp_compass.db")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS reflections (
            problem_id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            note TEXT
        )
    """)

    conn.commit()
    conn.close()


init_db()


# --------------------------------------------------
# Root
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "status": "ok",
        "message": "CP Compass backend is running"
    }


# --------------------------------------------------
# Codeforces Import
# --------------------------------------------------

@app.get("/api/codeforces/{handle}")
def get_codeforces_problems(handle: str):

    url = "https://codeforces.com/api/user.status"

    try:

        response = requests.get(
            url,
            params={
                "handle": handle,
                "from": 1,
                "count": 10000
            },
            timeout=15
        )

        response.raise_for_status()

        data = response.json()

    except Exception:

        raise HTTPException(
            status_code=502,
            detail="Could not connect to Codeforces"
        )


    if data.get("status") != "OK":

        raise HTTPException(
            status_code=404,
            detail="Codeforces user not found"
        )


    solved = {}


    for submission in data["result"]:

        if submission.get("verdict") != "OK":
            continue

        problem = submission["problem"]

        key = (
            f"{problem.get('contestId')}-"
            f"{problem.get('index')}"
        )

        if key in solved:
            continue


        solved[key] = {

            "contestId": problem.get("contestId"),

            "index": problem.get("index"),

            "name": problem.get("name"),

            "rating": problem.get("rating"),

            "tags": problem.get("tags", []),

            "solvedAt": submission.get(
                "creationTimeSeconds"
            )
        }


    problems = list(solved.values())


    return {

        "handle": handle,

        "totalSolved": len(problems),

        "problems": problems
    }


# --------------------------------------------------
# Save Reflection
# --------------------------------------------------

@app.post("/api/reflection")
def save_reflection(reflection: Reflection):

    if reflection.status not in [
        "green",
        "yellow",
        "red"
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be green, "
                "yellow or red"
            )
        )


    conn = get_db()


    conn.execute("""
        INSERT INTO reflections(
            problem_id,
            status,
            note
        )

        VALUES (?, ?, ?)

        ON CONFLICT(problem_id)

        DO UPDATE SET

            status = excluded.status,
            note = excluded.note

    """, (

        reflection.problem_id,

        reflection.status,

        reflection.note

    ))


    conn.commit()
    conn.close()


    return {

        "saved": True,

        "reflection": reflection
    }


# --------------------------------------------------
# Get Reflections
# --------------------------------------------------

@app.get("/api/reflections")
def get_reflections():

    conn = get_db()

    rows = conn.execute(
        "SELECT * FROM reflections"
    ).fetchall()

    conn.close()


    return [
        dict(row)
        for row in rows
    ]


# --------------------------------------------------
# AI Weakness Analysis
# --------------------------------------------------

@app.post("/api/analyze")
def analyze_performance(request: AnalysisRequest):

    if not HF_TOKEN:

        raise HTTPException(
            status_code=500,
            detail="HF_TOKEN is not configured"
        )


    if len(request.problems) == 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Add at least one reflection "
                "before requesting analysis"
            )
        )


    # Prevent enormous prompts
    problems = request.problems[:30]


    reflection_text = []


    for problem in problems:

        reflection_text.append(
            f"""
Problem: {problem.name}
Rating: {problem.rating or "Unrated"}
Tags: {", ".join(problem.tags)}
Outcome: {problem.status.upper()}
Student reflection: {problem.note or "No written reflection"}
"""
        )


    prompt = f"""
You are CP Compass, an AI competitive-programming coach.

You are analyzing the practice history of Codeforces user:
{request.handle}

The student classifies solved problems as:

GREEN:
Solved independently with a clean approach.

YELLOW:
Understood the main idea but had an implementation,
syntax, edge-case, or small logical mistake.

RED:
Could not derive the core solution without help.

Here are the student's reflected problems:

{"".join(reflection_text)}

Your job is NOT to give generic motivational advice.

Identify patterns in:
- problem tags
- ratings
- GREEN/YELLOW/RED outcomes
- the student's own written reflections

Be careful not to claim a weakness unless the supplied
evidence supports it.

Return a concise analysis using EXACTLY these sections:

PRIMARY WEAKNESS:
One short sentence.

WHY:
2-4 sentences explaining the evidence.

PATTERNS:
- bullet
- bullet
- bullet

NEXT PRACTICE BLOCK:
Give a specific rating range and 2-4 Codeforces topics.

FOCUS WHILE SOLVING:
Give 3 concrete things the student should consciously
practice during the next problems.

Keep the entire response under 350 words.
"""


    try:

        completion = ai_client.chat.completions.create(

            # Open-weight model routed through
            # Hugging Face Inference Providers.
            model="Qwen/Qwen3-14B",

            messages=[

                {
                    "role": "system",
                    "content": (
                        "You are a precise competitive "
                        "programming coach. Base conclusions "
                        "only on the evidence supplied."
                    )
                },

                {
                    "role": "user",
                    "content": prompt
                }

            ],

            max_tokens=600,

            temperature=0.3
        )


        analysis = (
            completion
            .choices[0]
            .message
            .content
        )


        return {

            "handle": request.handle,

            "model": "Qwen/Qwen3-14B",

            "analyzedProblems": len(problems),

            "analysis": analysis
        }


    except Exception as e:

        print("AI ERROR:", repr(e))

        raise HTTPException(
            status_code=502,
            detail=f"AI analysis failed: {str(e)}"
        )