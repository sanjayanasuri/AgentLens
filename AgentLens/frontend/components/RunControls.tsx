"use client";

export default function RunControls({
  onRun,
  disabled
}: {
  onRun: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      onClick={onRun}
      disabled={disabled}
    >
      🚀 Run Agent
    </button>
  );
}

