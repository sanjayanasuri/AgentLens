"use client";

export default function StateInspector({ state }: { state: any }) {
  return (
    <pre className="text-xs overflow-auto bg-gray-50 p-2 rounded">
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}

