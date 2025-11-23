"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { openRunWebsocket } from "../../api-client";
import GraphViewer from "../../../components/GraphViewer";
import TraceTimeline from "../../../components/TraceTimeline";
import StateInspector from "../../../components/StateInspector";
import DiffViewer from "../../../components/DiffViewer";
import CostLatencyPanel from "../../../components/CostLatencyPanel";
import ReplayControls from "../../../components/ReplayControls";
import TraceDetails from "../../../components/TraceDetails";
import DriftPanel from "../../../components/DriftPanel";
import FinalAnswer from "../../../components/FinalAnswer";
import StatusLog from "../../../components/StatusLog";
import { diffStates, DiffItem } from "../../../components/diff";

type RunEvent = {
  run_id: string;
  event: string;
  name?: string;
  data?: any;
  metadata?: any;
  ts?: number;
  step_index?: number;
  state_snapshot?: any;
};

type Snapshot = { step: number; state: any };

function RunPageContent({ runId }: { runId: string }) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [actualRunId, setActualRunId] = useState<string>(runId);
  const searchParams = useSearchParams();
  const question = searchParams.get("question") || "";

  const latestSnapshot = snapshots[snapshots.length - 1];
  
  // Ensure replay index is valid
  const validReplayIndex = useMemo(() => {
    if (snapshots.length === 0) return 0;
    return Math.max(0, Math.min(replayIndex, snapshots.length - 1));
  }, [replayIndex, snapshots.length]);
  
  const replayState = snapshots[validReplayIndex]?.state;
  // Always fallback to latest if replay state is missing
  const shownState = (isLive ? latestSnapshot?.state : replayState) || latestSnapshot?.state || {};

  // Filter events based on replay index - only show events up to the current snapshot
  const filteredEvents = useMemo(() => {
    // If live mode or no snapshots, show all events
    if (isLive || snapshots.length === 0) {
      return events;
    }
    
    // If replay index is out of bounds, show all events
    if (validReplayIndex >= snapshots.length) {
      return events;
    }
    
    const currentSnapshot = snapshots[validReplayIndex];
    if (!currentSnapshot) return events;
    
    // Filter events that occurred before or at the current snapshot's step
    // Include events without step_index (they might be from before snapshots started)
    return events.filter(e => {
      if (e.step_index === undefined || e.step_index === null) {
        // Include events without step_index if we're at the beginning
        return validReplayIndex === 0;
      }
      return e.step_index <= currentSnapshot.step;
    });
  }, [events, snapshots, validReplayIndex, isLive]);

  // Compute diffs based on filtered events and state progression
  const computedDiffs = useMemo(() => {
    if (!filteredEvents.length) return [];
    
    // If we have a current state from replay, compute diff from previous snapshot
    if (!isLive && snapshots.length > 0 && validReplayIndex > 0) {
      const currentState = snapshots[validReplayIndex]?.state;
      const prevState = snapshots[validReplayIndex - 1]?.state;
      if (currentState && prevState) {
        return diffStates(prevState, currentState);
      }
    }
    
    // Otherwise, find state transitions in filtered events
    const stateTransitions: Array<{ before: any; after: any }> = [];
    let prevState: any = {};
    
    for (const e of filteredEvents) {
      if (e.event === "on_chain_end" && e.metadata?.langgraph_node) {
        const out = e.data?.output || e.state_snapshot;
        if (out && typeof out === "object") {
          const cleanOut: any = {};
          for (const [key, value] of Object.entries(out)) {
            if (key === "__end__" || key === "END" || key.startsWith("__")) {
              continue;
            }
            cleanOut[key] = value;
          }
          
          if (Object.keys(prevState).length > 0) {
            stateTransitions.push({ before: prevState, after: cleanOut });
          }
          prevState = cleanOut;
        }
      } else if (e.state_snapshot) {
        const cleanState: any = {};
        for (const [key, value] of Object.entries(e.state_snapshot)) {
          if (key === "__end__" || key === "END" || key.startsWith("__")) {
            continue;
          }
          cleanState[key] = value;
        }
        
        if (Object.keys(prevState).length > 0) {
          stateTransitions.push({ before: prevState, after: cleanState });
        }
        prevState = cleanState;
      }
    }
    
    // Compute diffs from the last transition
    if (stateTransitions.length > 0) {
      const lastTransition = stateTransitions[stateTransitions.length - 1];
      return diffStates(lastTransition.before, lastTransition.after);
    }
    
    return [];
  }, [filteredEvents, snapshots, validReplayIndex, isLive]);

  useEffect(() => {
    if (!question) return;
    
    const ws = openRunWebsocket(question);
    let eventBuffer: RunEvent[] = [];
    let bufferTimeout: NodeJS.Timeout | null = null;
    
    const flushBuffer = () => {
      if (eventBuffer.length === 0) return;
      
      setEvents((prev) => [...prev, ...eventBuffer]);
      
      // Process snapshots from buffer
      const newSnapshots: Snapshot[] = [];
      let newRunId: string | null = null;
      
      for (const e of eventBuffer) {
        if (e.run_id && e.run_id !== actualRunId) {
          newRunId = e.run_id;
        }
        
        if (e.state_snapshot) {
          newSnapshots.push({ step: e.step_index || 0, state: e.state_snapshot });
        }
      }
      
      if (newRunId) {
        setActualRunId(newRunId);
      }
      
      if (newSnapshots.length > 0) {
        setSnapshots((prev) => {
          const next = [...prev, ...newSnapshots];
          // Only auto-update replay index if live mode is on
          if (isLive) {
            setReplayIndex(next.length - 1);
          }
          return next;
        });
      }
      
      eventBuffer = [];
      bufferTimeout = null;
    };
    
    ws.onmessage = (msg) => {
      const e: RunEvent = JSON.parse(msg.data);
      
      // Process critical events immediately (state changes, node completions)
      if (e.state_snapshot || e.event === "on_chain_end" || e.event === "on_chain_start" || 
          e.event === "on_node_end" || e.event === "on_node_start") {
        // Flush buffer first
        if (eventBuffer.length > 0) {
          flushBuffer();
        }
        // Process this event immediately
        setEvents((prev) => [...prev, e]);
        
        if (e.run_id && e.run_id !== actualRunId) {
          setActualRunId(e.run_id);
        }
        
        if (e.state_snapshot) {
          setSnapshots((prev) => {
            const next = [...prev, { step: e.step_index || prev.length, state: e.state_snapshot }];
            // Only auto-update replay index if live mode is on
            if (isLive) {
              setReplayIndex(next.length - 1);
            }
            return next;
          });
        }
      } else {
        // Batch stream events (on_chat_model_stream) to reduce re-renders
        eventBuffer.push(e);
        if (!bufferTimeout) {
          bufferTimeout = setTimeout(flushBuffer, 100); // 100ms batching for stream events
        }
      }
    };
    
    ws.onclose = () => {
      // Flush any remaining events on close
      flushBuffer();
    };
    
    return () => {
      if (bufferTimeout) clearTimeout(bufferTimeout);
      flushBuffer();
      ws.close();
    };
  }, [question, isLive]);

  const hasFinalAnswer = shownState?.final || shownState?.draft;

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-gray-50 to-white">
      {/* Top Section: Question and Status */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">AgentLens</h1>
          <p className="text-gray-600 mb-4">{question || "No question provided"}</p>
          {!hasFinalAnswer && <StatusLog events={filteredEvents} />}
        </div>
        
        {/* Final Answer at Top */}
        {hasFinalAnswer && <FinalAnswer state={shownState || {}} />}
      </div>

      {/* Center: Graph Execution */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold mb-1">Graph Execution</h2>
            <p className="text-xs text-gray-500">Real-time visualization of agent workflow</p>
          </div>
          <GraphViewer events={filteredEvents} />
        </div>
      </div>

      {/* Bottom: Organized Info Boxes */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* State Inspector */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-1">State Inspector</h3>
            <p className="text-xs text-gray-500 mb-3">Current agent state at this point in execution</p>
            <div className="max-h-[200px] overflow-auto">
              <StateInspector state={shownState || {}} />
            </div>
          </div>

          {/* Latency & Cost */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-1">Performance Metrics</h3>
            <p className="text-xs text-gray-500 mb-3">Latency and token usage per node</p>
            <CostLatencyPanel events={filteredEvents} />
          </div>

          {/* Drift Detection */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-1">Quality Metrics</h3>
            <p className="text-xs text-gray-500 mb-3">Drift and hallucination detection</p>
            <DriftPanel state={shownState || {}} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* State Diff Viewer */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-1">State Changes</h3>
            <p className="text-xs text-gray-500 mb-3">What changed in the last step</p>
            <DiffViewer diffs={computedDiffs} />
          </div>

          {/* Trace Timeline */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-1">Event Timeline</h3>
            <p className="text-xs text-gray-500 mb-3">Chronological sequence of events</p>
            <TraceTimeline events={filteredEvents} />
          </div>
        </div>

        {/* Controls and Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-1">Replay Controls</h3>
            <p className="text-xs text-gray-500 mb-3">Scrub through execution history</p>
            <ReplayControls
              max={Math.max(0, snapshots.length - 1)}
              value={validReplayIndex}
              onChange={(v) => {
                const clamped = Math.max(0, Math.min(v, snapshots.length - 1));
                setReplayIndex(clamped);
              }}
              isLive={isLive}
              onToggleLive={() => {
                setIsLive((v) => {
                  const newLive = !v;
                  if (newLive) {
                    if (snapshots.length > 0) {
                      setReplayIndex(snapshots.length - 1);
                    }
                  } else {
                    if (snapshots.length > 0) {
                      const currentIndex = Math.min(replayIndex, snapshots.length - 1);
                      setReplayIndex(Math.max(0, currentIndex));
                    }
                  }
                  return newLive;
                });
              }}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-1">LangSmith Trace</h3>
            <p className="text-xs text-gray-500 mb-3">Detailed trace from LangSmith</p>
            <TraceDetails runId={actualRunId} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RunPage({ params }: { params: { runId: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RunPageContent runId={params.runId} />
    </Suspense>
  );
}

