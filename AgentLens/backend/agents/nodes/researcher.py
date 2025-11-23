from agents.state import AgentState
from core.config import USE_TAVILY, OPENAI_API_KEY, OPENAI_MODEL
from agents.nodes.utils import fetch_page_text

try:
    from langchain_community.tools.tavily_search import TavilySearchResults
except ImportError:
    TavilySearchResults = None

try:
    from langchain_community.tools import DuckDuckGoSearchRun
except ImportError:
    DuckDuckGoSearchRun = None

from langchain_openai import ChatOpenAI
from langsmith import traceable


@traceable(run_type="chain", name="researcher")
async def researcher_node(state: AgentState) -> AgentState:
    question = state["question"]

    # 1) Generate search queries (simple first pass)
    queries = state.get("queries", [])
    if not queries:
        queries = [
            question,
            f"{question} overview",
            f"{question} examples",
        ]

    # 2) Search the web - try Tavily first, fallback to DuckDuckGo on SSL errors
    results = []
    search_tool = None
    
    if USE_TAVILY and TavilySearchResults:
        try:
            search_tool = TavilySearchResults(max_results=5)
            # Test with first query to check for SSL issues
            test_result = await search_tool.ainvoke(queries[0])
            if isinstance(test_result, list) and len(test_result) > 0:
                # Tavily works, use it for all queries
                for q in queries:
                    try:
                        tool_out = await search_tool.ainvoke(q)
                        if isinstance(tool_out, list):
                            results.extend(tool_out)
                        else:
                            results.append(tool_out)
                    except Exception as e:
                        import traceback
                        print(f"Error searching Tavily for query '{q}': {e}")
                        continue
            else:
                raise Exception("Tavily returned empty results")
        except Exception as e:
            error_str = str(e).lower()
            if "ssl" in error_str or "certificate" in error_str:
                print(f"Tavily SSL error detected, falling back to DuckDuckGo: {e}")
                search_tool = None  # Will use DuckDuckGo below
            else:
                print(f"Tavily error: {e}")
                search_tool = None
    
    # Fallback to DuckDuckGo if Tavily failed or not available
    if not results and DuckDuckGoSearchRun:
        print("Using DuckDuckGo search as fallback")
        search_tool = DuckDuckGoSearchRun()
        for q in queries:
            try:
                tool_out = await search_tool.ainvoke(q)
                # DDG returns string; normalize
                if isinstance(tool_out, str):
                    import json
                    try:
                        tool_out = json.loads(tool_out)
                    except:
                        # If not JSON, create a simple result structure
                        tool_out = [{"title": q, "snippet": tool_out, "url": ""}]
                if isinstance(tool_out, list):
                    results.extend(tool_out)
                else:
                    results.append(tool_out)
            except Exception as e:
                import traceback
                print(f"Error searching DuckDuckGo for query '{q}': {e}")
                print(traceback.format_exc())
                continue
    
    if not results:
        # No search tool available or all failed
        return {**state, "queries": queries, "documents": [], "notes": state.get("notes", [])}

    # 3) Build document objects from results
    documents = []
    for r in results[:6]:
        url = r.get("url") or r.get("link")
        title = r.get("title") or "untitled"
        snippet = r.get("snippet") or r.get("body") or ""
        
        # Tavily already provides content, so use it if available
        content = r.get("content") or ""
        
        if not url:
            continue

        # If Tavily didn't provide content, fetch it
        if not content:
            content = await fetch_page_text(url)
            if not content:
                continue

        documents.append({
            "title": title,
            "url": url,
            "snippet": snippet or content[:200],  # Use snippet or first 200 chars of content
            "content": content,
        })

    # 4) Extract notes with an LLM
    notes = state.get("notes", [])
    
    if not documents:
        # If no documents found, add a note about it
        notes.append("No documents retrieved from web search. Please try a different question or check search tool configuration.")
        return {
            **state,
            "queries": queries,
            "documents": [],
            "notes": notes,
        }
    
    try:
        # Debug: verify API key is loaded
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set in environment variables")
        
        llm = ChatOpenAI(
            model=OPENAI_MODEL,
            temperature=0.2,
            api_key=OPENAI_API_KEY
        )

        joined = "\n\n".join(
            f"TITLE: {d['title']}\nURL: {d['url']}\nCONTENT:\n{d['content']}"
            for d in documents
        )

        prompt = (
            "You are a careful research assistant.\n"
            f"Question: {question}\n\n"
            "Given the sources below, extract 5-10 bullet facts that answer the question.\n"
            "Each bullet must end with a citation like (source: URL).\n\n"
            f"SOURCES:\n{joined}\n"
        )

        notes_msg = await llm.ainvoke(prompt)
        notes_text = notes_msg.content if hasattr(notes_msg, "content") else str(notes_msg)
        notes.append(notes_text)
    except Exception as e:
        # If LLM call fails, at least return the documents
        import traceback
        print(f"Error in researcher LLM call: {e}")
        print(traceback.format_exc())
        notes.append(f"Error extracting notes: {str(e)}")

    return {
        **state,
        "queries": queries,
        "documents": documents,
        "notes": notes,
    }

