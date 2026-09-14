import type { Student } from "./gradely-types";

/** The series part of a roll, e.g. "2410001" -> "24". */
export function seriesOf(roll: string): string {
  const digits = (roll ?? "").replace(/\D/g, "");
  return digits.slice(0, 2);
}

/**
 * The course's primary series, inferred from the roster itself (never hardcoded):
 * the most common series among students who were not explicitly flagged as
 * belonging to another series. Ties resolve to the lower series number.
 */
export function primarySeries(students: Student[]): string {
  const count = (list: Student[]) => {
    const m = new Map<string, number>();
    for (const s of list) {
      const k = seriesOf(s.roll);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  let tally = count(students.filter((s) => s.status !== "other_series"));
  if (tally.size === 0) tally = count(students);
  let best = "";
  let bestN = -1;
  for (const [k, n] of tally) {
    if (n > bestN || (n === bestN && k < best)) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

const rollValue = (roll: string) => {
  const digits = (roll ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : Number.MAX_SAFE_INTEGER;
};

/**
 * Single source of truth for student ordering everywhere in the app:
 * primary-series students first (ascending roll), then all other-series
 * students (ascending roll).
 */
export function sortStudents<T extends Student>(students: T[]): T[] {
  const primary = primarySeries(students);
  return [...students].sort((a, b) => {
    const ap = seriesOf(a.roll) === primary ? 0 : 1;
    const bp = seriesOf(b.roll) === primary ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const av = rollValue(a.roll);
    const bv = rollValue(b.roll);
    if (av !== bv) return av - bv;
    return (a.roll ?? "").localeCompare(b.roll ?? "");
  });
}
