"use client";

import { useEffect, useState, useRef } from "react";

export default function DriftPanel({ state }: { state: any }) {
  const [drift, setDrift] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const prevStateRef = useRef<string>("");

  useEffect(() => {
    async function run() {
      if (!state || !Object.keys(state).length) {
        setDrift(null);
        prevStateRef.current = "";
        return;
      }
      
      // Only recalculate if state actually changed
      const stateStr = JSON.stringify(state);
      if (stateStr === prevStateRef.current) {
        return;
      }
      prevStateRef.current = stateStr;
      
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/api/drift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: stateStr,
        });
        const data = await res.json();
        setDrift(data);
      } catch (err) {
        console.error("Drift calculation error:", err);
        setDrift(null);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [state]);

  return (
    <div className="text-sm space-y-2">

      {loading ? (
        <p className="text-sm text-muted-foreground">Calculating...</p>
      ) : !drift ? (
        <p className="text-sm text-muted-foreground">No drift computed yet.</p>
      ) : (
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>Drift score</span>
            <span className="font-semibold">{drift.drift_score.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Question overlap</span>
            <span>{drift.overlap.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Citation score</span>
            <span>{drift.cite_score.toFixed(2)}</span>
          </div>

          {drift.flags?.length ? (
            <ul className="pt-2 border-t space-y-1">
              {drift.flags.map((f: string, i: number) => (
                <li key={i} className="text-muted-foreground">
                  {f}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

