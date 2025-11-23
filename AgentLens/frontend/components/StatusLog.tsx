"use client";

import { useMemo } from "react";

type RunEvent = {
  event: string;
  name?: string;
  metadata?: any;
  ts?: number;
};

export default function StatusLog({ events }: { events: RunEvent[] }) {
  const currentStatus = useMemo(() => {
    if (!events.length) {
      return "Initializing agent...";
    }

    const lastEvent = events[events.length - 1];
    const nodeName = lastEvent.metadata?.langgraph_node || lastEvent.name;

    // Determine current status based on last event
    if (lastEvent.event === "on_chain_start" || lastEvent.event === "on_node_start") {
      if (nodeName === "supervisor") {
        return "📋 Planning research approach...";
      } else if (nodeName === "researcher") {
        return "🔍 Searching the web for sources...";
      } else if (nodeName === "synthesizer") {
        return "✍️ Synthesizing answer from notes...";
      } else if (nodeName === "verifier") {
        return "✅ Verifying citations and quality...";
      } else if (nodeName) {
        return `🔄 Processing in ${nodeName}...`;
      }
    } else if (lastEvent.event === "on_chain_end" || lastEvent.event === "on_node_end") {
      if (nodeName === "supervisor") {
        return "✓ Plan created. Moving to researcher...";
      } else if (nodeName === "researcher") {
        return "✓ Sources gathered. Moving to synthesizer...";
      } else if (nodeName === "synthesizer") {
        return "✓ Draft complete. Moving to verifier...";
      } else if (nodeName === "verifier") {
        return "✓ Verification complete. Finalizing answer...";
      }
    } else if (lastEvent.event === "on_chat_model_stream") {
      return "💭 Generating response...";
    } else if (lastEvent.event === "on_tool_start") {
      if (lastEvent.name?.includes("tavily") || lastEvent.name?.includes("search")) {
        return "🌐 Searching the web...";
      } else if (lastEvent.name) {
        return `🔧 Using tool: ${lastEvent.name}...`;
      }
    } else if (lastEvent.event === "on_tool_end") {
      if (lastEvent.name?.includes("tavily") || lastEvent.name?.includes("search")) {
        return "✓ Search complete. Processing results...";
      }
    }

    // Default status
    return "⚙️ Processing...";
  }, [events]);

  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200 shadow-sm">
        <span className="text-base font-medium text-gray-700">{currentStatus}</span>
      </div>
    </div>
  );
}

