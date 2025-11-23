from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict, total=False):
    question: str
    plan: str
    queries: List[str]
    documents: List[Dict[str, Any]]
    notes: List[str]
    draft: str
    citations: List[Dict[str, Any]]
    verification: Dict[str, Any]
    final: str

