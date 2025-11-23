from fastapi import APIRouter
from agents.research_graph import build_graph

router = APIRouter()

@router.get("/graph-schema")
async def graph_schema():
    graph = build_graph()
    schema = {"nodes": [], "edges": []}

    # Best effort introspection, LangGraph API can vary by version
    try:
        g = graph.get_graph()
        schema["nodes"] = [{"id": n.id, "label": n.id} for n in g.nodes]
        schema["edges"] = [{"source": e.source, "target": e.target} for e in g.edges]
        return schema
    except Exception:
        # Fallback to known structure
        schema["nodes"] = [
            {"id": "supervisor", "label": "supervisor"},
            {"id": "researcher", "label": "researcher"},
            {"id": "synthesizer", "label": "synthesizer"},
            {"id": "verifier", "label": "verifier"},
        ]
        schema["edges"] = [
            {"source": "supervisor", "target": "researcher"},
            {"source": "researcher", "target": "synthesizer"},
            {"source": "synthesizer", "target": "verifier"},
            {"source": "verifier", "target": "researcher", "label": "retry if issues"},
        ]
        return schema

