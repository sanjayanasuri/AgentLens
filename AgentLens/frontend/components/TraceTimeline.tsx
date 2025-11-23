"use client";

export default function TraceTimeline({ events }: { events: any[] }) {
  return (
    <div>
      {events.length === 0 ? (
        <p className="text-xs text-gray-400">No events yet...</p>
      ) : (
        <ul className="text-xs space-y-1 max-h-[200px] overflow-auto">
          {events.slice(-50).map((e, i) => (
            <li key={i} className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="font-mono text-xs">{e.name || "event"}</span>
              <span className="text-gray-500 text-xs">{e.event}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

