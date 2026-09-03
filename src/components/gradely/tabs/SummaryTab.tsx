import { useState } from "react";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { StudentSummary } from "@/lib/calc";
import { fmt } from "@/lib/calc";
import type { Course } from "@/lib/gradely-types";
import { exportSheet } from "@/lib/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "../EmptyState";

export function SummaryTab({ course, rows }: { course: Course; rows: StudentSummary[] }) {
  const s = course.settings;
  const [search, setSearch] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);

  const filtered = rows.filter(
    (r) =>
      `${r.student.roll} ${r.student.name}`.toLowerCase().includes(search.toLowerCase()) &&
      (!onlyIssues || r.missingCount > 0),
  );

  function exportSummary() {
    const header = [
      "Roll",
      "Name",
      `CT (${s.ctConvertedMax})`,
      ...(s.useAttendance ? [`Attendance (${s.attendanceMax})`] : []),
      ...(s.useAssignment ? [`Assignment (${s.assignmentMax})`] : []),
      ...(s.useLab ? [`Lab (${s.labMax})`] : []),
      `Total (${s.totalMax})`,
      "Percentage",
      "Grade",
      "Point",
    ];
    const body = rows.map((r) => [
      r.student.roll,
      r.student.name,
      fmt(r.ct.converted, s),
      ...(s.useAttendance ? [fmt(r.attendanceMark, s)] : []),
      ...(s.useAssignment ? [fmt(r.assignment.converted, s)] : []),
      ...(s.useLab ? [fmt(r.lab.converted, s)] : []),
      fmt(r.total, s),
      `${r.percentage.toFixed(1)}%`,
      r.grade,
      r.point,
    ]);
    exportSheet(`${course.code}-marks-summary.xlsx`, [{ name: "Summary", rows: [header, ...body] }]);
  }

  if (rows.length === 0)
    return <EmptyState title="Nothing to summarise yet" description="Add students and marks first." />;

  const issues = rows.filter((r) => r.missingCount > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Marks summary</h2>
          <p className="text-sm text-muted-foreground">
            All components combined out of {s.totalMax} marks.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportSummary}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export summary
        </Button>
      </div>

      <div
        className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
          issues ? "border-warning/40 bg-warning/10" : "border-success/40 bg-success/10"
        }`}
      >
        {issues ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
        )}
        <p>
          {issues
            ? `${issues} student${issues > 1 ? "s have" : " has"} missing marks or attendance. Marks are still calculated from available data.`
            : "Every student has complete records."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="h-9 w-full sm:w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roll or name"
        />
        <Button
          size="sm"
          variant={onlyIssues ? "default" : "outline"}
          onClick={() => setOnlyIssues((v) => !v)}
        >
          Show only incomplete
        </Button>
      </div>

      <div className="soft-in overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Roll</th>
              <th className="px-3 py-2 text-left font-medium">Student</th>
              <th className="px-3 py-2 text-right font-medium">CT<span className="block text-[11px] font-normal text-muted-foreground">/{s.ctConvertedMax}</span></th>
              {s.useAttendance && (
                <th className="px-3 py-2 text-right font-medium">Attend.<span className="block text-[11px] font-normal text-muted-foreground">/{s.attendanceMax}</span></th>
              )}
              {s.useAssignment && (
                <th className="px-3 py-2 text-right font-medium">Assign.<span className="block text-[11px] font-normal text-muted-foreground">/{s.assignmentMax}</span></th>
              )}
              {s.useLab && (
                <th className="px-3 py-2 text-right font-medium">Lab<span className="block text-[11px] font-normal text-muted-foreground">/{s.labMax}</span></th>
              )}
              <th className="px-3 py-2 text-right font-medium">Total<span className="block text-[11px] font-normal text-muted-foreground">/{s.totalMax}</span></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.student.id} className="border-t transition-colors hover:bg-muted/40">
                <td className="px-3 py-1.5 font-mono text-xs">{r.student.roll}</td>
                <td className="px-3 py-1.5">
                  {r.student.name || "—"}
                  {r.missingCount > 0 && (
                    <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[11px] text-warning-foreground">
                      {r.missingCount} missing
                    </span>
                  )}
                </td>
                <td className="numeric px-3 py-1.5 text-right">{fmt(r.ct.converted, s)}</td>
                {s.useAttendance && (
                  <td className="numeric px-3 py-1.5 text-right">{fmt(r.attendanceMark, s)}</td>
                )}
                {s.useAssignment && (
                  <td className="numeric px-3 py-1.5 text-right">{fmt(r.assignment.converted, s)}</td>
                )}
                {s.useLab && <td className="numeric px-3 py-1.5 text-right">{fmt(r.lab.converted, s)}</td>}
                <td className="numeric px-3 py-1.5 text-right font-semibold">{fmt(r.total, s)}</td>
                <td className="numeric px-3 py-1.5 text-right">{r.percentage.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-center font-medium">{r.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
