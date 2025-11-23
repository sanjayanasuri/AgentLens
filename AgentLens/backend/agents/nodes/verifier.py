from agents.state import AgentState
from langsmith import traceable


@traceable(run_type="chain", name="verifier")
async def verifier_node(state: AgentState) -> AgentState:
    draft = state.get("draft", "")
    citations = state.get("citations", [])

    issues = []
    if len(citations) < 2:
        issues.append("Not enough citations, need more sources.")
    if len(draft) < 200:
        issues.append("Draft too short, likely missing depth.")

    verification = {
        "coverage_score": min(1.0, len(citations) / 4.0),
        "issues": issues
    }

    final = draft if not issues else ""

    return {**state, "verification": verification, "final": final}

