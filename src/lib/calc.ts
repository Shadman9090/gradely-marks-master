import type {
  Assessment,
  Attendance,
  CourseSettings,
  Mark,
  Student,
} from "./gradely-types";

export function roundTo(value: number, s: CourseSettings): number {
  if (!Number.isFinite(value)) return 0;
  if (s.rounding === "ceil") return Math.ceil(value);
  if (s.rounding === "floor") return Math.floor(value);
  const f = Math.pow(10, s.rounding === "none" ? 6 : s.decimals);
  return Math.round(value * f) / f;
}

export function fmt(value: number | null | undefined, s: CourseSettings): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const r = roundTo(value, s);
  return s.rounding === "none" ? String(r) : r.toFixed(s.decimals);
}

export type MarkMap = Map<string, Mark>; // key: `${assessmentId}:${studentId}`

export const markKey = (assessmentId: string, studentId: string) =>
  `${assessmentId}:${studentId}`;

export type ComponentResult = {
  raw: number | null;
  rawMax: number;
  converted: number | null;
  missing: number;
};

/** Contribution of a mark: null means excluded from the calculation. */
function contribution(mark: Mark | undefined, s: CourseSettings): number | null {
  if (!mark) return null;
  if (mark.status === "na") return null;
  if (mark.status === "absent") return s.absentAsZero ? 0 : null;
  if (mark.status === "missing") return null;
  return typeof mark.value === "number" ? mark.value : null;
}

export function computeCt(
  assessments: Assessment[],
  marks: MarkMap,
  studentId: string,
  s: CourseSettings,
): ComponentResult & { ratios: number[] } {
  const ratios: number[] = [];
  let missing = 0;
  for (const a of assessments) {
    const m = marks.get(markKey(a.id, studentId));
    const c = contribution(m, s);
    if (c === null) {
      missing += 1;
      continue;
    }
    ratios.push(a.max_marks > 0 ? c / a.max_marks : 0);
  }
  if (ratios.length === 0) {
    return { raw: null, rawMax: 0, converted: null, missing, ratios };
  }
  const sorted = [...ratios].sort((a, b) => b - a);
  const take =
    s.ctPolicy === "best_n" ? Math.max(1, Math.min(s.ctBestN, sorted.length)) : sorted.length;
  const used = sorted.slice(0, take);
  const avgRatio = used.reduce((x, y) => x + y, 0) / used.length;
  return {
    raw: avgRatio * s.ctConvertedMax,
    rawMax: s.ctConvertedMax,
    converted: avgRatio * s.ctConvertedMax,
    missing,
    ratios,
  };
}

export function computeCategory(
  assessments: Assessment[],
  marks: MarkMap,
  studentId: string,
  convertedMax: number,
  s: CourseSettings,
): ComponentResult {
  let raw = 0;
  let rawMax = 0;
  let missing = 0;
  let any = false;
  for (const a of assessments) {
    const m = marks.get(markKey(a.id, studentId));
    const c = contribution(m, s);
    if (c === null) {
      missing += 1;
      continue;
    }
    any = true;
    raw += c;
    rawMax += a.max_marks;
  }
  if (!any) return { raw: null, rawMax: 0, converted: null, missing };
  const converted = rawMax > 0 ? (raw / rawMax) * convertedMax : 0;
  return { raw, rawMax, converted, missing };
}

export function attendancePercent(a: Attendance | undefined): number | null {
  if (!a || !a.classes_held || a.attended === null || a.attended === undefined) return null;
  if (a.classes_held <= 0) return null;
  return Math.min(100, (Number(a.attended) / Number(a.classes_held)) * 100);
}

export function attendanceMarks(pct: number | null, s: CourseSettings): number | null {
  if (pct === null) return null;
  if (s.attendanceMode === "proportional") return (pct / 100) * s.attendanceMax;
  const rules = [...s.attendanceRules].sort((a, b) => b.min - a.min);
  for (const r of rules) if (pct >= r.min) return r.marks;
  return 0;
}

export function gradeFor(percentage: number | null, s: CourseSettings) {
  if (percentage === null) return { grade: "—", point: 0 };
  const bands = [...s.gradeScale].sort((a, b) => b.min - a.min);
  for (const b of bands) if (percentage >= b.min) return { grade: b.grade, point: b.point };
  return { grade: "—", point: 0 };
}

export type StudentSummary = {
  student: Student;
  ct: ComponentResult & { ratios: number[] };
  attendancePct: number | null;
  attendanceMark: number | null;
  assignment: ComponentResult;
  lab: ComponentResult;
  total: number;
  percentage: number;
  grade: string;
  point: number;
  missingCount: number;
  complete: boolean;
};

export function summarise(
  students: Student[],
  assessments: Assessment[],
  marks: MarkMap,
  attendance: Map<string, Attendance>,
  s: CourseSettings,
): StudentSummary[] {
  const cts = assessments.filter((a) => a.category === "ct");
  const assigns = assessments.filter((a) => a.category === "assignment");
  const labs = assessments.filter((a) => a.category === "lab");

  return students.map((student) => {
    const ct = computeCt(cts, marks, student.id, s);
    const pct = attendancePercent(attendance.get(student.id));
    const attMark = s.useAttendance ? attendanceMarks(pct, s) : null;
    const assignment = s.useAssignment
      ? computeCategory(assigns, marks, student.id, s.assignmentMax, s)
      : { raw: null, rawMax: 0, converted: null, missing: 0 };
    const lab = s.useLab
      ? computeCategory(labs, marks, student.id, s.labMax, s)
      : { raw: null, rawMax: 0, converted: null, missing: 0 };

    const total =
      (ct.converted ?? 0) + (attMark ?? 0) + (assignment.converted ?? 0) + (lab.converted ?? 0);
    const percentage = s.totalMax > 0 ? (total / s.totalMax) * 100 : 0;
    const g = gradeFor(percentage, s);

    const missingCount =
      ct.missing +
      (s.useAssignment ? assignment.missing : 0) +
      (s.useLab ? lab.missing : 0) +
      (s.useAttendance && pct === null ? 1 : 0);

    return {
      student,
      ct,
      attendancePct: pct,
      attendanceMark: attMark,
      assignment,
      lab,
      total,
      percentage,
      grade: g.grade,
      point: g.point,
      missingCount,
      complete: missingCount === 0,
    };
  });
}

export function stats(rows: StudentSummary[]) {
  if (rows.length === 0)
    return { avg: 0, high: 0, low: 0, attendanceAvg: 0, missing: 0, complete: 0 };
  const totals = rows.map((r) => r.total);
  const atts = rows.map((r) => r.attendancePct).filter((v): v is number => v !== null);
  return {
    avg: totals.reduce((a, b) => a + b, 0) / totals.length,
    high: Math.max(...totals),
    low: Math.min(...totals),
    attendanceAvg: atts.length ? atts.reduce((a, b) => a + b, 0) / atts.length : 0,
    missing: rows.filter((r) => r.missingCount > 0).length,
    complete: rows.filter((r) => r.complete).length,
  };
}
