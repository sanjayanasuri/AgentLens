from agents.state import AgentState
from langsmith import traceable

@traceable(run_type="chain", name="supervisor")
async def supervisor_node(state: AgentState) -> AgentState:
    question = state["question"]
    plan = f"""
    Plan:
    1. Break question into search queries
    2. Gather documents
    3. Extract notes
    4. Draft answer
    5. Verify citations and factual coverage
    """
    return {**state, "plan": plan.strip()}

