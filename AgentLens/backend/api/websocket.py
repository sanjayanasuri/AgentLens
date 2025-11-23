from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from agents.research_graph import build_graph, stream_graph

ws_router = APIRouter()

@ws_router.websocket("/run")
async def run_stream(ws: WebSocket):
    await ws.accept()
    try:
        payload = await ws.receive_json()
        question = payload.get("question", "")
        graph = build_graph()
        async for event in stream_graph(graph, question):
            await ws.send_json(event)
    except WebSocketDisconnect:
        return

