from fastapi import APIRouter
from pydantic import BaseModel
from agents.research_graph import build_graph, run_graph_once
from services.langsmith_service import fetch_trace
from services.analytics_service import compute_analytics
from services.drift_service import compute_drift

router = APIRouter()

class RunRequest(BaseModel):
    question: str

@router.post("/run-agent")
async def run_agent(req: RunRequest):
    graph = build_graph()
    run_id, final_state = await run_graph_once(graph, req.question)
    return {"run_id": run_id, "final_state": final_state}

@router.get("/trace/{run_id}")
async def trace(run_id: str):
    return await fetch_trace(run_id)

@router.get("/analytics/{run_id}")
async def analytics(run_id: str):
    return await compute_analytics(run_id)

@router.post("/drift")
async def drift(state: dict):
    return compute_drift(state)

