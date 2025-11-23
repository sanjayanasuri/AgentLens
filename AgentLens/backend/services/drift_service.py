from typing import Dict, Any
import re

def compute_drift(state: Dict[str, Any]) -> Dict[str, Any]:
    question = state.get("question", "")
    draft = state.get("draft", "") or state.get("final", "")
    citations = state.get("citations", []) or []
    docs = state.get("documents", []) or []

    # Early return if no content to analyze
    if not question or not draft:
        return {
            "drift_score": 1.0,
            "overlap": 0.0,
            "cite_score": 0.0,
            "length_score": 0.0,
            "flags": ["No question or draft available for analysis."]
        }

    # heuristics that work without extra models
    q_words = set(re.findall(r"\w+", question.lower()))
    d_words = set(re.findall(r"\w+", draft.lower()))
    
    if not q_words:
        overlap = 0.0
    else:
        overlap = len(q_words & d_words) / len(q_words)

    cite_score = min(1.0, len(citations) / 4.0)
    doc_score = 1.0 if docs else 0.0
    length_score = min(1.0, len(draft) / 800.0)

    # Drift score: lower is better (0 = perfect, 1 = completely off)
    # Weighted combination where higher scores = less drift
    quality_score = 0.5 * overlap + 0.3 * cite_score + 0.2 * length_score
    drift_score = 1.0 - quality_score
    drift_score = max(0.0, min(1.0, drift_score))

    flags = []
    if overlap < 0.25:
        flags.append("Answer may be off topic relative to question.")
    if cite_score < 0.5:
        flags.append("Citation coverage is low.")
    if length_score < 0.4:
        flags.append("Answer seems shallow.")

    return {
        "drift_score": drift_score,
        "overlap": overlap,
        "cite_score": cite_score,
        "length_score": length_score,
        "flags": flags
    }

