from agents.state import AgentState
from langchain_openai import ChatOpenAI
from langsmith import traceable
from core.config import OPENAI_API_KEY, OPENAI_MODEL
import re


@traceable(run_type="chain", name="synthesizer")
async def synthesizer_node(state: AgentState) -> AgentState:
    question = state["question"]
    notes = state.get("notes", [])

    # Debug: verify API key is loaded
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set in environment variables")
    
    llm = ChatOpenAI(
        model=OPENAI_MODEL,
        temperature=0.2,
        api_key=OPENAI_API_KEY
    )

    prompt = (
        "Write a clear, structured answer to the user's question using ONLY the notes.\n"
        "Cite sources inline like (source: URL).\n\n"
        f"Question: {question}\n\n"
        f"Notes:\n{notes[-1] if notes else ''}\n"
    )

    draft_msg = await llm.ainvoke(prompt)
    draft = draft_msg.content if hasattr(draft_msg, "content") else str(draft_msg)

    # pull cited urls into citations list
    urls = re.findall(r"\(source:\s*(https?://[^\s\)]+)\)", draft)
    citations = [{"url": u, "used_in": "draft"} for u in urls]

    return {**state, "draft": draft, "citations": citations}

