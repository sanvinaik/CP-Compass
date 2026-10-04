import { useState } from "react";
import "./App.css";

const API =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [handle, setHandle] = useState("");
  const [problems, setProblems] = useState([]);
  const [totalSolved, setTotalSolved] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function importCodeforces() {
    if (!handle.trim()) return;

    setLoading(true);
    setError("");
    setAiAnalysis("");

    try {
      const response = await fetch(
        `${API}/api/codeforces/${encodeURIComponent(handle.trim())}`
      );

      if (!response.ok) {
        throw new Error("Codeforces user not found");
      }

      const data = await response.json();

      const reflectionsResponse = await fetch(
        `${API}/api/reflections`
      );

      if (!reflectionsResponse.ok) {
        throw new Error("Could not load reflections");
      }

      const reflections =
        await reflectionsResponse.json();

      const reflectionMap = {};

      reflections.forEach((reflection) => {
        reflectionMap[reflection.problem_id] =
          reflection;
      });

      const enrichedProblems =
        data.problems.map((problem) => {
          const problemId =
            `${problem.contestId}-${problem.index}`;

          const reflection =
            reflectionMap[problemId];

          return {
            ...problem,

            reflectionStatus:
              reflection?.status || null,

            reflectionNote:
              reflection?.note || "",
          };
        });

      setProblems(enrichedProblems);
      setTotalSolved(data.totalSolved);

    } catch (err) {
      setError(err.message);

    } finally {
      setLoading(false);
    }
  }

  async function saveReflection(problem, status) {
    const problemId =
      `${problem.contestId}-${problem.index}`;

    const note = window.prompt(
      "What happened while solving this problem?",
      problem.reflectionNote || ""
    );

    if (note === null) return;

    try {
      const response = await fetch(
        `${API}/api/reflection`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            problem_id: problemId,
            status,
            note,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Could not save reflection"
        );
      }

      setProblems((currentProblems) =>
        currentProblems.map(
          (currentProblem) =>
            `${currentProblem.contestId}-${currentProblem.index}` ===
            problemId
              ? {
                  ...currentProblem,
                  reflectionStatus: status,
                  reflectionNote: note,
                }
              : currentProblem
        )
      );

      // Existing analysis is now outdated
      setAiAnalysis("");

    } catch (err) {
      setError(err.message);
    }
  }

  async function analyzeWithAI() {
    const reflectedProblems =
      problems.filter(
        (problem) =>
          problem.reflectionStatus
      );

    if (reflectedProblems.length === 0) {
      setAiError(
        "Reflect on at least one problem first."
      );
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiAnalysis("");

    const payload = {
      handle: handle,

      problems: reflectedProblems.map(
        (problem) => ({
          problem_id:
            `${problem.contestId}-${problem.index}`,

          name: problem.name,

          rating: problem.rating,

          tags: problem.tags,

          status:
            problem.reflectionStatus,

          note:
            problem.reflectionNote || "",
        })
      ),
    };

    try {
      const response = await fetch(
        `${API}/api/analyze`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "AI analysis failed"
        );
      }

      setAiAnalysis(data.analysis);

    } catch (err) {
      setAiError(err.message);

    } finally {
      setAiLoading(false);
    }
  }

  const reflectedProblems =
    problems.filter(
      (problem) =>
        problem.reflectionStatus
    );

  const reflectionCount =
    reflectedProblems.length;

  const greenCount =
    reflectedProblems.filter(
      (problem) =>
        problem.reflectionStatus === "green"
    ).length;

  const yellowCount =
    reflectedProblems.filter(
      (problem) =>
        problem.reflectionStatus === "yellow"
    ).length;

  const redCount =
    reflectedProblems.filter(
      (problem) =>
        problem.reflectionStatus === "red"
    ).length;

  return (
    <main>

      <nav>
        <div className="logo">
          CP<span>Compass</span>
        </div>

        <div className="nav-tag">
          Practice smarter, not just harder.
        </div>
      </nav>

      <section className="hero">

        <p className="eyebrow">
          COMPETITIVE PROGRAMMING INTELLIGENCE
        </p>

        <h1>
          Solved doesn't always
          <br />
          mean <span>understood.</span>
        </h1>

        <p className="subtitle">
          Import your Codeforces history,
          reflect on how you solved each problem,
          and discover what is actually holding
          you back.
        </p>

        <div className="search">

          <input
            value={handle}

            onChange={(e) =>
              setHandle(e.target.value)
            }

            onKeyDown={(e) => {
              if (e.key === "Enter") {
                importCodeforces();
              }
            }}

            placeholder="Enter Codeforces handle"
          />

          <button
            onClick={importCodeforces}
            disabled={loading}
          >
            {loading
              ? "Importing..."
              : "Analyze my solves →"}
          </button>

        </div>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

      </section>


      {problems.length > 0 && (

        <section className="dashboard">

          <div className="stats">

            <div>
              <span>CODEFORCES</span>
              <strong>@{handle}</strong>
            </div>

            <div>
              <span>PROBLEMS SOLVED</span>
              <strong>{totalSolved}</strong>
            </div>

            <div>
              <span>REFLECTIONS</span>
              <strong>{reflectionCount}</strong>
            </div>

          </div>


          {reflectionCount > 0 && (

            <section className="analytics">

              <div className="analytics-header">

                <div>
                  <p className="eyebrow">
                    YOUR PRACTICE SIGNAL
                  </p>

                  <h2>
                    Reflection breakdown
                  </h2>
                </div>

                <button
                  className="ai-button"
                  onClick={analyzeWithAI}
                  disabled={aiLoading}
                >
                  {aiLoading
                    ? "Analyzing..."
                    : "✦ Ask AI Coach"}
                </button>

              </div>


              <div className="color-stats">

                <div>
                  <span className="dot green-dot">
                  </span>

                  <strong>{greenCount}</strong>

                  <small>
                    Independent
                  </small>
                </div>


                <div>
                  <span className="dot yellow-dot">
                  </span>

                  <strong>{yellowCount}</strong>

                  <small>
                    Small mistakes
                  </small>
                </div>


                <div>
                  <span className="dot red-dot">
                  </span>

                  <strong>{redCount}</strong>

                  <small>
                    Needed help
                  </small>
                </div>

              </div>


              {aiError && (
                <p className="error">
                  {aiError}
                </p>
              )}


              {aiAnalysis && (

                <div className="ai-panel">

                  <div className="ai-panel-header">

                    <span className="ai-icon">
                      ✦
                    </span>

                    <div>
                      <strong>
                        CP Compass AI Coach
                      </strong>

                      <small>
                        Powered by open-weight Qwen
                      </small>
                    </div>

                  </div>

                  <div className="ai-response">
                    {aiAnalysis}
                  </div>

                </div>

              )}

            </section>

          )}


          <div className="legend">

            <span>
              How did the problem actually go?
            </span>

            <div>
              <b>🟢 Independent</b>
              <b>🟡 Small mistake</b>
              <b>🔴 Needed help</b>
            </div>

          </div>


          <div className="problem-list">

            {problems
              .slice(0, 30)
              .map((problem) => {

                const problemId =
                  `${problem.contestId}-${problem.index}`;

                return (

                  <article
                    className="problem"
                    key={problemId}
                  >

                    <div className="problem-info">

                      <div className="problem-heading">

                        <span className="rating">
                          {problem.rating ||
                            "Unrated"}
                        </span>

                        <h3>
                          {problem.index}.{" "}
                          {problem.name}
                        </h3>

                      </div>


                      <div className="tags">

                        {problem.tags
                          .slice(0, 4)
                          .map((tag) => (

                            <span key={tag}>
                              {tag}
                            </span>

                          ))}

                      </div>


                      {problem.reflectionNote && (

                        <p className="reflection-note">
                          “
                          {problem.reflectionNote}
                          ”
                        </p>

                      )}

                    </div>


                    <div className="reflection-buttons">

                      <button
                        className={
                          problem.reflectionStatus ===
                          "green"
                            ? "selected green"
                            : ""
                        }

                        onClick={() =>
                          saveReflection(
                            problem,
                            "green"
                          )
                        }

                        title="Solved independently"
                      >
                        🟢
                      </button>


                      <button
                        className={
                          problem.reflectionStatus ===
                          "yellow"
                            ? "selected yellow"
                            : ""
                        }

                        onClick={() =>
                          saveReflection(
                            problem,
                            "yellow"
                          )
                        }

                        title="Small implementation mistake"
                      >
                        🟡
                      </button>


                      <button
                        className={
                          problem.reflectionStatus ===
                          "red"
                            ? "selected red"
                            : ""
                        }

                        onClick={() =>
                          saveReflection(
                            problem,
                            "red"
                          )
                        }

                        title="Needed help"
                      >
                        🔴
                      </button>

                    </div>

                  </article>

                );
              })}

          </div>

        </section>

      )}

    </main>
  );
}

export default App;