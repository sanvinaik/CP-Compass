# 🧭 CP Compass

> **Solved doesn't always mean understood.**

CP Compass is an AI-powered competitive programming tracker that helps you understand **how you solve problems, not just how many you solve**.

Enter your Codeforces handle, automatically import your solved problems, reflect on each solve, and let an open-weight AI model identify patterns in your weaknesses and suggest what to practice next.

🔗 **Live Demo:** https://cp-compass-eight.vercel.app/

---

## Why CP Compass?

Competitive programming platforms tell you whether a problem was **Accepted**, but an AC doesn't tell the whole story.

You might have:

- solved it independently
- understood the approach but made implementation mistakes
- needed a hint to discover the core idea

CP Compass records that missing context and turns it into useful practice insights.

---

## Features

### Automatic Codeforces Import
Enter your Codeforces handle to automatically fetch solved problems along with their **ratings, tags, contest information, and problem details**.

### Solve Quality Tracking

Every problem can be classified as:

🟢 **Green** — Solved independently and cleanly  
🟡 **Yellow** — Knew the approach, but made an implementation/logical mistake  
🔴 **Red** — Couldn't derive the core idea without help

You can also add a short reflection explaining what went wrong.

### AI Coach

CP Compass combines:

- Problem ratings
- Problem tags
- Solve quality
- Personal reflections

and sends this structured history to **Qwen3-14B**, an open-weight model.

The AI Coach identifies recurring weaknesses and generates personalized practice recommendations.

---

## How It Works

```text
            ┌─────────────────┐
            │      User       │
            └────────┬────────┘
                     │ Codeforces handle
                     ▼
            ┌─────────────────┐
            │  React + Vite   │
            │    Frontend     │
            └────────┬────────┘
                     │
                     ▼
              ┌─────────────┐
              │   FastAPI   │
              │   Backend   │
              └──────┬──────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
   ┌────────────┐ ┌───────┐ ┌──────────────┐
   │ Codeforces │ │SQLite │ │  Qwen3-14B   │
   │    API     │ │       │ │ via Hugging  │
   │            │ │       │ │     Face     │
   └────────────┘ └───────┘ └──────────────┘
                                  │
                                  ▼
                           Weakness Analysis
                         + Practice Recommendations
```

The core workflow is:

**Import → Reflect → Analyze → Improve**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI |
| Database | SQLite |
| CP Data | Codeforces API |
| AI Model | Qwen3-14B |
| AI Inference | Hugging Face Inference Providers |
| Frontend Deployment | Vercel |
| Backend Deployment | Railway |

---

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/sanvinaik/CP-Compass.git
cd CP-Compass
```

### 2. Backend

```bash
cd backend
python -m venv venv
```

Activate the environment and install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```env
HF_TOKEN=your_huggingface_token_here
```

Start the backend:

```bash
uvicorn main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

### 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

## Open-Source AI

CP Compass uses **Qwen3-14B**, an open-weight model, as its reasoning layer.

The deployed version accesses Qwen through Hugging Face Inference Providers, but using an open-weight model keeps the AI layer flexible.

Future versions could:

- swap in different open models
- fine-tune a model for competitive programming coaching
- support local inference
- customize the analysis for different learning styles

The model can change. The provider can change. **The core idea doesn't have to.**

---

## Origin

CP Compass grew out of a **45-day competitive programming challenge** in my college's CP club.

We tried maintaining spreadsheets containing problem ratings, topics, mistakes, and reflections. The information was useful — maintaining the spreadsheet wasn't.

We kept solving problems.

We stopped updating the sheets.

CP Compass is the tracker my friend and I wished we had: automate everything that can be automated, and ask the programmer only for the information that actually requires human reflection.

---

## What's Next?

- Contest performance tracking
- Rating and topic visualizations
- Support for additional competitive programming platforms
- Long-term weakness tracking
- Better personalized problem recommendations
- More detailed distinction between conceptual and implementation weaknesses

---

## Hacktoberfest 2026

Built for the **Hacktoberfest Weekend Challenge — Build for a Friend**.

The project uses open-weight AI at its core to turn competitive programming practice history into actionable feedback.

---

## Author

**Sanvi Naik**

GitHub: [@sanvinaik](https://github.com/sanvinaik)

---

If CP Compass helps your practice, feel free to ⭐ the repository or open an issue with feedback.