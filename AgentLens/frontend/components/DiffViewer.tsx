"use client";

import { DiffItem } from "./diff";

export default function DiffViewer({ diffs }: { diffs: DiffItem[] }) {
  return (
    <div>

      {!diffs.length ? (
        <p className="text-sm text-muted-foreground">No diffs yet.</p>
      ) : (
        <ul className="space-y-3 max-h-[260px] overflow-auto text-sm">
          {diffs.map((d, i) => (
            <li key={i} className="border rounded-xl p-2">
              <div className="font-mono text-xs mb-1">{d.path}</div>
              <div className="grid grid-cols-2 gap-2">
                <pre className="text-xs bg-gray-50 p-2 rounded-lg overflow-auto">
                  {JSON.stringify(d.before, null, 2)}
                </pre>
                <pre className="text-xs bg-gray-50 p-2 rounded-lg overflow-auto">
                  {JSON.stringify(d.after, null, 2)}
                </pre>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

