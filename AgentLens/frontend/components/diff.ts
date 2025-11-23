export type DiffItem = {
  path: string;
  before: any;
  after: any;
};

export function diffStates(prev: any, next: any, basePath = ""): DiffItem[] {
  const diffs: DiffItem[] = [];

  // Skip diffing if either is null/undefined
  if (!prev && !next) return diffs;
  
  // If one is null/undefined and the other isn't, that's a diff
  if (!prev || !next) {
    // Only add diff if the non-null value isn't just __end__
    const nonNull = prev || next;
    if (nonNull !== "__end__" && nonNull !== "END") {
      diffs.push({ path: basePath || "root", before: prev, after: next });
    }
    return diffs;
  }

  // Skip if both are the __end__ marker
  if (prev === "__end__" && next === "__end__") return diffs;
  if (prev === "__end__" || next === "__end__") return diffs;

  // Handle arrays - compare as arrays, not recursively
  if (Array.isArray(prev) || Array.isArray(next)) {
    if (!Array.isArray(prev) || !Array.isArray(next)) {
      diffs.push({ path: basePath || "root", before: prev, after: next });
      return diffs;
    }
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      diffs.push({ path: basePath || "root", before: prev, after: next });
    }
    return diffs;
  }

  // Handle strings and primitives - compare directly
  if (typeof prev !== "object" || typeof next !== "object" || prev === null || next === null) {
    if (prev !== next) {
      diffs.push({ path: basePath || "root", before: prev, after: next });
    }
    return diffs;
  }

  // Handle objects - recurse
  const keys = new Set([
    ...Object.keys(prev || {}),
    ...Object.keys(next || {}),
  ]);

  for (const k of keys) {
    // Skip internal LangGraph fields
    if (k === "__end__" || k.startsWith("__") || k === "END") continue;
    
    const p = basePath ? `${basePath}.${k}` : k;
    const a = prev?.[k];
    const b = next?.[k];

    // Skip if both are undefined/null
    if (a === undefined && b === undefined) continue;
    
    // Skip if value is __end__ marker
    if (a === "__end__" || b === "__end__") continue;

    // If both are objects (but not arrays), recurse
    if (typeof a === "object" && a !== null && typeof b === "object" && b !== null && !Array.isArray(a) && !Array.isArray(b)) {
      diffs.push(...diffStates(a, b, p));
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push({ path: p, before: a, after: b });
    }
  }

  return diffs;
}

