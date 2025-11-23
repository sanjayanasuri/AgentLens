"use client";

import { useEffect, useState } from "react";

export default function TraceDetails({ runId }: { runId: string }) {
  const [trace, setTrace] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`http://localhost:8000/api/trace/${runId}`);
        const data = await res.json();
        setTrace(data);
      } catch {
        setTrace(null);
      }
    }
    if (runId) {
      load();
    }
  }, [runId]);

  return (
    <div>

      {!trace ? (
        <p className="text-sm text-muted-foreground">Loading trace...</p>
      ) : trace.error ? (
        <div className="text-sm">
          <p className="text-red-600 mb-1">Error: {trace.error}</p>
          <p className="text-muted-foreground text-xs">
            Make sure LANGSMITH_API_KEY and LANGSMITH_PROJECT are set in backend/.env
          </p>
        </div>
      ) : !trace.runs?.length ? (
        <p className="text-sm text-muted-foreground">
          No trace found for run_id: {runId}
          <br />
          <span className="text-xs">Make sure LangSmith tracing is enabled.</span>
        </p>
      ) : (
        <ul className="text-xs space-y-2 max-h-[260px] overflow-auto">
          {trace.runs.map((r: any) => (
            <li key={r.id} className="border rounded-lg p-2">
              <div className="font-semibold">{r.name}</div>
              <div className="text-muted-foreground">
                type: {r.run_type} | status: {r.status}
              </div>
              {r.error ? (
                <div className="text-red-600 mt-1">error: {String(r.error)}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

