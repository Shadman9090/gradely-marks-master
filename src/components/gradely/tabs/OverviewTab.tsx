import { Link } from "@tanstack/react-router";
import { Users, ClipboardList, CalendarCheck, FlaskConical, AlertTriangle } from "lucide-react";
import type { StudentSummary } from "@/lib/calc";
import { fmt, stats } from "@/lib/calc";
import type { Assessment, Course, Student } from "@/lib/gradely-types";
import { Button } from "@/components/ui/button";

export function OverviewTab({
  course,
  students,
  assessments,
  rows,
  onGoTab,
}: {
  course: Course;
  students: Student[];
  assessments: Assessment[];
  rows: StudentSummary[];
  onGoTab: (tab: string) => void;
}) {
  const s = course.settings;
  const st = stats(rows);
  const cts = assessments.filter((a) => a.category === "ct").length;
  const assigns = assessments.filter((a) => a.category === "assignment").length;
  const labs = assessments.filter((a) => a.category === "lab").length;
  const incomplete = rows.filter((r) => r.missingCount > 0);

  const cards = [
    { label: "Students", value: students.length, icon: Users, tab: "students" },
    { label: "Class tests", value: cts, icon: ClipboardList, tab: "tests" },
    { label: "Assignments", value: assigns, icon: CalendarCheck, tab: "assignments" },
    { label: "Lab items", value: labs, icon: FlaskConical, tab: "lab" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => onGoTab(c.tab)}
            className="rounded-lg border bg-card p-4 text-left shadow-card transition-colors hover:border-ring"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="numeric mt-2 text-2xl font-semibold">{c.value}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="text-sm font-semibold">Class performance</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Average total" value={fmt(st.avg, s)} suffix={`/ ${s.totalMax}`} />
            <Stat label="Highest" value={fmt(st.high, s)} />
            <Stat label="Lowest" value={fmt(st.low, s)} />
            <Stat label="Avg attendance" value={`${st.attendanceAvg.toFixed(1)}%`} />
          </div>
          <div className="mt-5 space-y-2">
            {gradeDistribution(rows).map((g) => (
              <div key={g.grade} className="flex items-center gap-3">
                <span className="w-10 text-xs font-medium">{g.grade}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${rows.length ? (g.count / rows.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="numeric w-8 text-right text-xs text-muted-foreground">{g.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">Data readiness</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {incomplete.length === 0
              ? "All students have complete records. You are ready to generate the marksheet."
              : `${incomplete.length} student${incomplete.length > 1 ? "s have" : " has"} missing entries.`}
          </p>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm">
            {incomplete.slice(0, 12).map((r) => (
              <li key={r.student.id} className="flex justify-between">
                <span className="font-mono text-xs">{r.student.roll}</span>
                <span className="text-xs text-muted-foreground">{r.missingCount} missing</span>
              </li>
            ))}
          </ul>
          <Button className="mt-4 w-full" size="sm" variant="outline" onClick={() => onGoTab("summary")}>
            Open marks summary
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-surface p-5">
        <h3 className="text-sm font-semibold">Course details</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <Detail label="Course" value={`${course.code} — ${course.title}`} />
          <Detail label="University" value={course.university} />
          <Detail label="Department" value={course.department} />
          <Detail label="Session" value={course.session} />
          <Detail label="Semester" value={course.semester} />
          <Detail label="Section" value={course.section} />
        </dl>
        <Link to="/courses/$courseId" params={{ courseId: course.id }} search={{ tab: "settings" }}>
          <Button className="mt-4" size="sm" variant="outline">
            Edit course settings
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="numeric mt-1 text-lg font-semibold">
        {value}
        {suffix && <span className="ml-1 text-xs font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}

function gradeDistribution(rows: StudentSummary[]) {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.grade, (map.get(r.grade) ?? 0) + 1);
  return [...map.entries()].map(([grade, count]) => ({ grade, count }));
}
