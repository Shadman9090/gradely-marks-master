import type { MarkMap, StudentSummary } from "./calc";
import { fmt, markKey } from "./calc";
import type { Assessment, Course } from "./gradely-types";

export type MarksheetColumn = { key: string; label: string; sub?: string; width: number };

export type MarksheetRow = { cells: string[] };

export type MarksheetModel = {
  title1: string; // Heaven's Light is Our Guide
  university: string;
  faculty: string;
  department: string;
  examLine: string;
  subjectLine: string;
  columns: MarksheetColumn[];
  rows: MarksheetRow[];
  teacherName: string;
  teacherDesignation: string;
};

export function buildMarksheet(
  course: Course,
  assessments: Assessment[],
  rows: StudentSummary[],
  marks: MarkMap,
): MarksheetModel {
  const s = course.settings;
  const cts = assessments
    .filter((a) => a.category === "ct")
    .sort((a, b) => a.position - b.position);

  const columns: MarksheetColumn[] = [{ key: "roll", label: "Roll", width: 11 }];
  cts.forEach((c, i) => columns.push({ key: c.id, label: "CT#", sub: String(i + 1), width: 6 }));
  columns.push({ key: "avg", label: "Avg", sub: `[${s.ctConvertedMax}]`, width: 6 });
  if (s.useAttendance)
    columns.push({ key: "atnd", label: "Atnd", sub: `[${s.attendanceMax}]`, width: 6 });
  if (s.useAssignment)
    columns.push({ key: "asgn", label: "Asgn", sub: `[${s.assignmentMax}]`, width: 6 });
  if (s.useLab) columns.push({ key: "lab", label: "Lab", sub: `[${s.labMax}]`, width: 6 });
  columns.push({ key: "total", label: "Total", sub: `[${s.totalMax}]`, width: 7 });

  const dataRows: MarksheetRow[] = rows.map((r) => {
    const cells: string[] = [r.student.roll];
    cts.forEach((c) => cells.push(cellFor(marks, r.student.id, c)));
    cells.push(fmt(r.ct.converted, s));
    if (s.useAttendance) cells.push(fmt(r.attendanceMark, s));
    if (s.useAssignment) cells.push(fmt(r.assignment.converted, s));
    if (s.useLab) cells.push(fmt(r.lab.converted, s));
    cells.push(fmt(r.total, s));
    return { cells };
  });

  const dept = course.department || "";
  const faculty = /^faculty/i.test(dept) ? dept : dept ? `Faculty of ${dept}` : "";
  const examParts = [course.level, course.semester, "Examination"].filter(Boolean).join(" ");
  const year = course.academic_year ? `, ${course.academic_year}` : "";
  const session = course.session ? ` (Session: ${course.session})` : "";

  const compNames = ["Class Test"];
  if (s.useAttendance) compNames.push("Attendance");
  if (s.useAssignment) compNames.push("Assignment");
  if (s.useLab) compNames.push("Laboratory");

  return {
    title1: "Heaven's Light is Our Guide",
    university: (course.university || "University").toUpperCase(),
    faculty,
    department: dept ? `Department of ${dept.replace(/^Faculty of\s*/i, "")}` : "",
    examLine: `${examParts}${year}${session}`,
    subjectLine: `${compNames.join(" + ")} Marks on ${course.code}${
      course.title ? ` ( ${course.title} )` : ""
    }`,
    columns,
    rows: dataRows,
    teacherName: course.teacher_name || "",
    teacherDesignation: course.teacher_designation || "",
  };
}

function cellFor(marks: MarkMap, studentId: string, c: Assessment) {
  const m = marks.get(markKey(c.id, studentId));
  if (!m) return "";
  if (m.status === "absent") return "A";
  if (m.status === "na") return "NA";
  if (m.status === "missing" || m.value === null) return "";
  return String(m.value);
}

/** Split rows into two side-by-side blocks like the official sheet. */
export function splitRows(rows: MarksheetRow[]) {
  const half = Math.ceil(rows.length / 2);
  return { left: rows.slice(0, half), right: rows.slice(half) };
}
