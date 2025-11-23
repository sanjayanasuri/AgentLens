"use client";

import { useEffect, useMemo, useState, memo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

type RunEvent = {
  event: string;
  name?: string;
  metadata?: any;
};

type SchemaNode = { id: string; label: string };
type SchemaEdge = { source: string; target: string; label?: string };

// Memoize layout function outside component to avoid recreation
const layoutNodes = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(n.id, { width: 180, height: 50 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - 90, y: pos.y - 25 },
    };
  });
};

// Default schema fallback
const DEFAULT_NODES: SchemaNode[] = [
  { id: "supervisor", label: "supervisor" },
  { id: "researcher", label: "researcher" },
  { id: "synthesizer", label: "synthesizer" },
  { id: "verifier", label: "verifier" },
];

const DEFAULT_EDGES: SchemaEdge[] = [
  { source: "supervisor", target: "researcher" },
  { source: "researcher", target: "synthesizer" },
  { source: "synthesizer", target: "verifier" },
  { source: "verifier", target: "researcher", label: "retry if issues" },
];

const GraphViewer = memo(function GraphViewer({ events }: { events: RunEvent[] }) {
  const [schemaNodes, setSchemaNodes] = useState<SchemaNode[]>(DEFAULT_NODES);
  const [schemaEdges, setSchemaEdges] = useState<SchemaEdge[]>(DEFAULT_EDGES);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());

  const NODE_IDS = useMemo(() => new Set(schemaNodes.map(n => n.id)), [schemaNodes]);

  useEffect(() => {
    async function loadSchema() {
      try {
        const res = await fetch("http://localhost:8000/api/graph-schema");
        const data = await res.json();
        setSchemaNodes(data.nodes || []);
        setSchemaEdges(data.edges || []);
      } catch (err) {
        console.error("Failed to load schema:", err);
        // Fallback to known structure if API fails
        setSchemaNodes(DEFAULT_NODES);
        setSchemaEdges(DEFAULT_EDGES);
      }
    }
    loadSchema();
  }, []);

  useEffect(() => {
    if (!schemaNodes.length) return;
    
    // If no events yet, show all nodes as pending
    if (!events.length) {
      setActiveNode(null);
      setCompletedNodes(new Set());
      return;
    }

    // Process all events to track node states accurately
    const activeNodes = new Set<string>();
    const completedNodesSet = new Set<string>();
    let mostRecentActive: string | null = null;
    const nodeStartTimes: Map<string, number> = new Map();

    // Process events in order to track state accurately
    for (const e of events) {
      const nodeName = e.metadata?.langgraph_node || e.name;
      
      if (!nodeName || !NODE_IDS.has(nodeName)) continue;

      if (e.event === "on_chain_start" || e.event === "on_node_start") {
        activeNodes.add(nodeName);
        // Track when each node started (use timestamp or event index)
        nodeStartTimes.set(nodeName, e.ts || events.indexOf(e));
        // Most recent active is the one with the latest start time
        if (!mostRecentActive || (nodeStartTimes.get(nodeName) || 0) > (nodeStartTimes.get(mostRecentActive) || 0)) {
          mostRecentActive = nodeName;
        }
      }

      if (e.event === "on_chain_end" || e.event === "on_node_end") {
        activeNodes.delete(nodeName);
        completedNodesSet.add(nodeName);
        nodeStartTimes.delete(nodeName);
        // If the most recent active node just ended, find the next most recent
        if (mostRecentActive === nodeName) {
          mostRecentActive = null;
          // Find the most recently started node that's still active
          for (const [node, time] of nodeStartTimes.entries()) {
            if (activeNodes.has(node)) {
              if (!mostRecentActive || time > (nodeStartTimes.get(mostRecentActive) || 0)) {
                mostRecentActive = node;
              }
            }
          }
        }
      }
    }

    // Determine current active node
    // Priority: most recently started node that's still active
    if (mostRecentActive && activeNodes.has(mostRecentActive)) {
      setActiveNode(mostRecentActive);
    } else if (activeNodes.size > 0) {
      // Fallback to any active node
      const activeArray = Array.from(activeNodes);
      // Prefer nodes in execution order
      const nodeOrder = ["supervisor", "researcher", "synthesizer", "verifier"];
      const orderedActive = activeArray.sort((a, b) => {
        const aIdx = nodeOrder.indexOf(a);
        const bIdx = nodeOrder.indexOf(b);
        return aIdx - bIdx;
      });
      setActiveNode(orderedActive[0]);
    } else {
      // No active nodes
      setActiveNode(null);
    }

    setCompletedNodes(completedNodesSet);
  }, [events, schemaNodes, NODE_IDS]);

  const edges: Edge[] = useMemo(
    () =>
      schemaEdges.map((e, i) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: Boolean(e.label),
      })),
    [schemaEdges]
  );

  // Determine next node in sequence
  const nextNode = useMemo(() => {
    if (!activeNode || !schemaNodes.length) return null;
    
    const nodeOrder = ["supervisor", "researcher", "synthesizer", "verifier"];
    const currentIndex = nodeOrder.indexOf(activeNode);
    if (currentIndex >= 0 && currentIndex < nodeOrder.length - 1) {
      return nodeOrder[currentIndex + 1];
    }
    return null;
  }, [activeNode, schemaNodes]);

  const nodes: Node[] = useMemo(() => {
    const base: Node[] = schemaNodes.map((n) => {
      const isActive = n.id === activeNode;
      const isNext = n.id === nextNode && !completedNodes.has(n.id);
      const isDone = completedNodes.has(n.id);
      const isPending = !isActive && !isNext && !isDone;

      // Color coding:
      // - Active (currently executing): Bright blue with pulsing border
      // - Next (upcoming): Light blue
      // - Completed: Green
      // - Pending: Gray/white

      let style: any = {
        padding: 10,
        borderRadius: 12,
        width: 180,
        fontWeight: isActive ? 700 : 500,
      };

      if (isActive) {
        // Currently executing - bright blue with animation
        style.border = "3px solid #3b82f6";
        style.background = "#dbeafe";
        style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.2)";
        style.animation = "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite";
      } else if (isNext) {
        // Next up - light blue
        style.border = "2px solid #93c5fd";
        style.background = "#eff6ff";
      } else if (isDone) {
        // Completed - green
        style.border = "2px solid #10b981";
        style.background = "#ecfdf3";
      } else {
        // Pending - gray
        style.border = "1px solid #d1d5db";
        style.background = "#f9fafb";
        style.opacity = 0.6;
      }

      return {
        id: n.id,
        data: { 
          label: (
            <div className="text-center">
              <div className="font-semibold">{n.label}</div>
              {isActive && (
                <div className="text-xs text-blue-600 mt-1 font-medium">Executing...</div>
              )}
              {isNext && (
                <div className="text-xs text-blue-500 mt-1">Next</div>
              )}
              {isDone && (
                <div className="text-xs text-green-600 mt-1">✓ Complete</div>
              )}
            </div>
          )
        },
        position: { x: 0, y: 0 },
        style,
      };
    });

    return layoutNodes(base, edges);
  }, [schemaNodes, edges, activeNode, completedNodes, nextNode]);

  return (
    <div className="min-h-[420px]">
      {/* Status indicator */}
      {activeNode && (
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
            <span className="text-sm font-medium text-blue-700">
              Currently executing: <span className="font-bold capitalize">{activeNode}</span>
            </span>
          </div>
        </div>
      )}
      
      <div className="h-[400px] w-full">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-100"></div>
          <span>Executing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-blue-300 bg-blue-50"></div>
          <span>Next</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-100"></div>
          <span>Complete</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300 bg-gray-50 opacity-60"></div>
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
});

export default GraphViewer;
