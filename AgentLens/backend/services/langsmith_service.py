from langsmith import Client
from core.config import LANGSMITH_PROJECT

client = Client()

async def fetch_trace(run_id: str):
    try:
        # Try to find the run by ID first
        try:
            runs = list(
                client.list_runs(
                    project_name=LANGSMITH_PROJECT,
                    filter=f'eq(id,"{run_id}")',
                    limit=1
                )
            )
        except Exception as e:
            # If filter fails, try without project filter
            try:
                runs = list(
                    client.list_runs(
                        filter=f'eq(id,"{run_id}")',
                        limit=1
                    )
                )
            except:
                # Last resort: try to get by trace_id if run_id looks like a trace_id
                runs = []
        
        if not runs:
            # Try searching by trace_id as fallback
            try:
                runs = list(
                    client.list_runs(
                        project_name=LANGSMITH_PROJECT,
                        trace_id=run_id,
                        limit=10
                    )
                )
            except:
                runs = []
        
        if not runs:
            return {"run_id": run_id, "runs": [], "error": "No runs found. Make sure LangSmith tracing is enabled and the run_id is correct."}

        root = runs[0]
        # fetch full tree by trace_id
        trace_id = root.trace_id
        tree = list(client.list_runs(project_name=LANGSMITH_PROJECT, trace_id=trace_id, limit=100))
        return {
            "run_id": run_id,
            "trace_id": str(trace_id),
            "runs": [r.dict() for r in tree],
        }
    except Exception as e:
        return {
            "run_id": run_id,
            "runs": [],
            "error": f"Error fetching trace: {str(e)}"
        }

