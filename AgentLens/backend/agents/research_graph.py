import time
import json
from langgraph.graph import StateGraph, END
from langsmith import uuid7
from agents.state import AgentState
from agents.nodes.supervisor import supervisor_node
from agents.nodes.researcher import researcher_node
from agents.nodes.synthesizer import synthesizer_node
from agents.nodes.verifier import verifier_node

def serialize_for_json(obj):
    """Recursively serialize objects for JSON, handling LangChain message types"""
    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    
    # Special handling for objects with usage_metadata (token usage) - this is where OpenAI stores it
    if hasattr(obj, 'usage_metadata'):
        try:
            usage_metadata = obj.usage_metadata
            if isinstance(usage_metadata, dict):
                # Preserve usage_metadata dict directly
                return {
                    'usage_metadata': usage_metadata
                }
            elif hasattr(usage_metadata, '__dict__'):
                return {
                    'usage_metadata': serialize_for_json(usage_metadata.__dict__)
                }
        except Exception:
            pass
    
    # Also handle response_metadata for compatibility
    if hasattr(obj, 'response_metadata'):
        try:
            metadata = obj.response_metadata
            if isinstance(metadata, dict):
                return {
                    'response_metadata': metadata
                }
            elif hasattr(metadata, 'token_usage'):
                token_usage = metadata.token_usage
                if isinstance(token_usage, dict):
                    return {
                        'response_metadata': {
                            'token_usage': token_usage
                        }
                    }
        except Exception:
            pass
    
    # Handle LangChain message objects (HumanMessage, AIMessage, etc.)
    if hasattr(obj, 'content'):
        try:
            content = obj.content
            # If content is a string, return it directly
            if isinstance(content, str):
                return content
            # Otherwise, serialize it recursively
            return serialize_for_json(content)
        except Exception:
            # Fallback: try to get content as string
            try:
                return str(obj.content) if hasattr(obj, 'content') else str(obj)
            except:
                return str(obj)
    # Try to convert to dict if it has __dict__
    if hasattr(obj, '__dict__'):
        try:
            # Skip certain attributes that might cause recursion
            d = {}
            for k, v in obj.__dict__.items():
                # Preserve response_metadata and usage_metadata (where token usage is stored)
                if k in ['response_metadata', 'usage_metadata', 'token_usage']:
                    if isinstance(v, dict):
                        d[k] = v  # Keep dicts as-is for usage_metadata
                    elif hasattr(v, '__dict__'):
                        d[k] = serialize_for_json(v.__dict__)
                    else:
                        d[k] = serialize_for_json(v)
                elif not k.startswith('_') or k in ['_type', '_name']:
                    d[k] = serialize_for_json(v)
            return d
        except Exception:
            return str(obj)
    # Final fallback: convert to string
    return str(obj)

def build_graph():
    g = StateGraph(AgentState)

    g.add_node("supervisor", supervisor_node)
    g.add_node("researcher", researcher_node)
    g.add_node("synthesizer", synthesizer_node)
    g.add_node("verifier", verifier_node)

    g.set_entry_point("supervisor")

    g.add_edge("supervisor", "researcher")
    g.add_edge("researcher", "synthesizer")
    g.add_edge("synthesizer", "verifier")

    def route_after_verify(state: AgentState):
        issues = (state.get("verification") or {}).get("issues") or []
        if issues:
            return "researcher"
        return END

    g.add_conditional_edges("verifier", route_after_verify)

    return g.compile()

async def run_graph_once(graph, question: str):
    run_id_uuid = uuid7()
    run_id = str(run_id_uuid)
    initial_state: AgentState = {"question": question, "queries": [], "documents": [], "notes": []}
    final_state = await graph.ainvoke(initial_state, config={"run_id": run_id_uuid})
    return run_id, final_state

async def stream_graph(graph, question: str):
    run_id_uuid = uuid7()
    run_id = str(run_id_uuid)
    initial_state: AgentState = {"question": question, "queries": [], "documents": [], "notes": []}
    step_index = 0
    
    async for step in graph.astream_events(initial_state, version="v2", config={"run_id": run_id_uuid}):
        # Serialize data to handle non-JSON-serializable objects
        serialized_data = serialize_for_json(step.get("data"))
        serialized_metadata = serialize_for_json(step.get("metadata", {}))
        
        payload = {
            "run_id": run_id,
            "event": step["event"],
            "name": step.get("name"),
            "data": serialized_data,
            "metadata": serialized_metadata,
            "ts": time.time(),
            "step_index": step_index,
        }
        
        # On node end, include full output state for replay
        # Check both on_chain_end and on_node_end events, and look in multiple places for state
        if (step["event"] in ["on_chain_end", "on_node_end"]) and step.get("metadata", {}).get("langgraph_node"):
            # Try to get state from output first, then from data directly
            out_state = serialized_data.get("output") or serialized_data.get("data") or serialized_data
            if out_state and isinstance(out_state, dict):
                # Clean state for replay (remove internal LangGraph fields)
                clean_state = {}
                for k, v in out_state.items():
                    if not (k == "__end__" or k == "END" or k.startswith("__")):
                        clean_state[k] = v
                if clean_state:  # Only add snapshot if we have actual state data
                    payload["state_snapshot"] = clean_state
        
        step_index += 1
        yield payload

