"use client";

import { useMemo } from "react";

type RunEvent = {
  event: string;
  name?: string;
  data?: any;
  metadata?: any;
  ts?: number;
};

const NODE_IDS = ["supervisor", "researcher", "synthesizer", "verifier"];

export default function CostLatencyPanel({ events }: { events: RunEvent[] }) {
  const stats = useMemo(() => {
    const startTs: Record<string, number> = {};
    const latencyMs: Record<string, number[]> = {};
    let totalTokens = 0;

    for (const e of events) {
      if (!e.ts) continue;
      

      // Track node start times
      const nodeName = e.metadata?.langgraph_node || e.name;
      if (nodeName && NODE_IDS.includes(nodeName)) {
        if (e.event === "on_chain_start" || e.event === "on_node_start") {
          startTs[nodeName] = e.ts;
        }

        if (e.event === "on_chain_end" || e.event === "on_node_end") {
          const st = startTs[nodeName];
          if (st) {
            const ms = (e.ts - st) * 1000;
            latencyMs[nodeName] = latencyMs[nodeName] || [];
            latencyMs[nodeName].push(ms);
          }
        }
      }

      // Extract token usage from various event types
      // Token usage can appear in multiple places depending on the event type
      let usage = null;
      
      if (e.event === "on_chat_model_end") {
        // Token usage is in usage_metadata dict with total_tokens, input_tokens, output_tokens
        const chunk = e.data?.chunk;
        const output = e.data?.output;
        
        // Check usage_metadata first (this is where OpenAI stores it)
        const usageMetadata = 
          output?.usage_metadata ||
          chunk?.usage_metadata ||
          e.data?.usage_metadata;
        
        if (usageMetadata && typeof usageMetadata === 'object') {
          // usage_metadata is a dict with total_tokens, input_tokens, output_tokens
          // Convert to token_usage format for compatibility
          usage = {
            total_tokens: usageMetadata.total_tokens,
            prompt_tokens: usageMetadata.input_tokens,
            completion_tokens: usageMetadata.output_tokens,
          };
        } else {
          // Fallback to old format
          usage =
            chunk?.response_metadata?.token_usage ||
            output?.response_metadata?.token_usage ||
            e.data?.response_metadata?.token_usage ||
            e.metadata?.token_usage;
        }
      } else if (e.event === "on_chat_model_stream") {
        // Token usage might appear in stream chunks (usually in the last chunk with finish_reason)
        const chunk = e.data?.chunk;
        const usageMetadata = chunk?.usage_metadata;
        if (usageMetadata && typeof usageMetadata === 'object') {
          usage = {
            total_tokens: usageMetadata.total_tokens,
            prompt_tokens: usageMetadata.input_tokens,
            completion_tokens: usageMetadata.output_tokens,
          };
        } else {
          usage = chunk?.response_metadata?.token_usage;
        }
      } else if (e.event === "on_chain_end" && (e.name === "ChatOpenAI" || e.name?.includes("ChatOpenAI"))) {
        // For ChatOpenAI chain end, check usage_metadata first
        const usageMetadata = 
          e.data?.output?.usage_metadata ||
          e.data?.usage_metadata;
        
        if (usageMetadata && typeof usageMetadata === 'object') {
          usage = {
            total_tokens: usageMetadata.total_tokens,
            prompt_tokens: usageMetadata.input_tokens,
            completion_tokens: usageMetadata.output_tokens,
          };
        } else {
          usage =
            e.data?.output?.response_metadata?.token_usage ||
            e.data?.response_metadata?.token_usage ||
            e.metadata?.token_usage;
        }
      }

      if (usage) {
        if (usage.total_tokens) {
          totalTokens += usage.total_tokens;
        } else if (typeof usage === "number") {
          totalTokens += usage;
        } else if (usage.prompt_tokens && usage.completion_tokens) {
          totalTokens += (usage.prompt_tokens + usage.completion_tokens);
        }
      }
    }

    const avgLatency: Record<string, number> = {};
    for (const k of Object.keys(latencyMs)) {
      const arr = latencyMs[k];
      avgLatency[k] = arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    const estCostUsd = (totalTokens / 1_000_000) * 0.15; // coarse estimate

    return { avgLatency, totalTokens, estCostUsd };
  }, [events]);

  return (
    <div className="space-y-2 text-sm">

      <div className="space-y-2 text-sm">
        {Object.entries(stats.avgLatency).map(([node, ms]) => (
          <div key={node} className="flex justify-between">
            <span>{node}</span>
            <span className="text-muted-foreground">
              {ms.toFixed(0)} ms avg
            </span>
          </div>
        ))}

        <div className="pt-2 border-t flex justify-between">
          <span>Total tokens</span>
          <span className="text-muted-foreground">{stats.totalTokens}</span>
        </div>

        <div className="flex justify-between">
          <span>Estimated cost</span>
          <span className="text-muted-foreground">
            ${stats.estCostUsd.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}

