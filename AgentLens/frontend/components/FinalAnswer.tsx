"use client";

export default function FinalAnswer({ state }: { state: any }) {
  const finalAnswer = state?.final || state?.draft || "";
  
  if (!finalAnswer) {
    return null; // Don't show anything if no answer yet
  }

  return (
    <section className="mb-6">
      <div className="text-center mb-3">
        <h2 className="text-2xl font-semibold mb-1">
          {state?.final ? "Final Answer" : "Draft Answer"}
        </h2>
        {state?.final && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            ✓ Verified and ready
          </span>
        )}
      </div>
      <div className="text-sm whitespace-pre-wrap bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border shadow-sm max-h-[300px] overflow-auto">
        {finalAnswer}
      </div>
    </section>
  );
}

