"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RunControls from "../components/RunControls";

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const router = useRouter();

  function handleRun() {
    // Encode the question in the URL to pass it to the run page
    const encodedQuestion = encodeURIComponent(question);
    router.push(`/run/new?question=${encodedQuestion}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AgentLens
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Visualize and debug LangGraph agent runs in real time
          </p>
          <p className="text-sm text-gray-500">
            A developer cockpit for understanding multi-step agent behavior
          </p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ask a question to the research agent
            </label>
            <textarea
              className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all h-32 resize-none"
              placeholder="e.g., What is machine learning? Explain RLHF in one sentence..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && question.trim()) {
                  handleRun();
                }
              }}
            />
          </div>
          <RunControls onRun={handleRun} disabled={!question.trim()} />
          <p className="text-xs text-gray-400 mt-3 text-center">
            Press Cmd/Ctrl + Enter to run
          </p>
        </div>
      </div>
    </main>
  );
}

