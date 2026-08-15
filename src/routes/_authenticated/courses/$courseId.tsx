import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  courseKeys,
  getCourse,
  listAssessments,
  listAttendance,
  listMarks,
  listStudents,
} from "@/lib/api";
import { markKey, summarise } from "@/lib/calc";
import type { Attendance, Mark } from "@/lib/gradely-types";
import { OverviewTab } from "@/components/gradely/tabs/OverviewTab";
import { StudentsTab } from "@/components/gradely/tabs/StudentsTab";
import { MarksGrid } from "@/components/gradely/tabs/MarksGrid";
import { AttendanceTab } from "@/components/gradely/tabs/AttendanceTab";
import { SummaryTab } from "@/components/gradely/tabs/SummaryTab";
import { MarksheetTab } from "@/components/gradely/tabs/MarksheetTab";
import { SettingsTab } from "@/components/gradely/tabs/SettingsTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "students", label: "Students" },
  { id: "tests", label: "Class Tests" },
  { id: "attendance", label: "Attendance" },
  { id: "assignments", label: "Assignments" },
  { id: "lab", label: "Laboratory" },
  { id: "summary", label: "Marks Summary" },
  { id: "marksheet", label: "Marksheet" },
  { id: "settings", label: "Settings" },
] as const;

export const Route = createFileRoute("/_authenticated/courses/$courseId")({
  validateSearch: z.object({ tab: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Course workspace — GRADELY" },
      { name: "description", content: "Manage marks, attendance and marksheets for your course." },
      { property: "og:title", content: "Course workspace — GRADELY" },
      {
        property: "og:description",
        content: "Manage marks, attendance and marksheets for your course.",
      },
    ],
  }),
  component: CourseWorkspace,
});

function CourseWorkspace() {
  const { courseId } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();

  const courseQ = useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: () => getCourse(courseId),
    retry: false,
  });
  const studentsQ = useQuery({
    queryKey: courseKeys.students(courseId),
    queryFn: () => listStudents(courseId),
  });
  const assessmentsQ = useQuery({
    queryKey: courseKeys.assessments(courseId),
    queryFn: () => listAssessments(courseId),
  });
  const marksQ = useQuery({ queryKey: courseKeys.marks(courseId), queryFn: () => listMarks(courseId) });
  const attendanceQ = useQuery({
    queryKey: courseKeys.attendance(courseId),
    queryFn: () => listAttendance(courseId),
  });

  const students = studentsQ.data ?? [];
  const assessments = assessmentsQ.data ?? [];
  const marksList: Mark[] = marksQ.data ?? [];
  const attendanceList: Attendance[] = attendanceQ.data ?? [];

  const markMap = useMemo(() => {
    const m = new Map<string, Mark>();
    for (const mk of marksList) m.set(markKey(mk.assessment_id, mk.student_id), mk);
    return m;
  }, [marksList]);

  const attendanceMap = useMemo(() => {
    const m = new Map<string, Attendance>();
    for (const a of attendanceList) m.set(a.student_id, a);
    return m;
  }, [attendanceList]);

  const course = courseQ.data;
  const rows = useMemo(
    () => (course ? summarise(students, assessments, markMap, attendanceMap, course.settings) : []),
    [course, students, assessments, markMap, attendanceMap],
  );

  function goTab(next: string) {
    navigate({ to: "/courses/$courseId", params: { courseId }, search: { tab: next } });
  }

  if (courseQ.isLoading && !courseQ.isError) {
    return (
      <div className="soft-in space-y-3">
        <div className="pulse-soft h-8 w-64 rounded bg-muted" />
        <div className="pulse-soft h-10 w-full rounded bg-muted" />
        <div className="pulse-soft h-40 rounded-lg bg-muted" />
      </div>
    );
  }


  if (!course) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">Course not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted or you do not have access to it.
          </p>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-5">
        <header className="no-print">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {course.session} · {course.semester} · Section {course.section || "—"}
          </p>
          <h1 className="font-serif text-2xl font-bold">
            {course.code} — {course.title}
          </h1>
        </header>

        <nav className="no-print -mx-1 flex gap-1 overflow-x-auto border-b pb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => goTab(t.id)}
              className={`whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div key={tab} className="page-enter">
          {tab === "overview" && (
            <OverviewTab
              course={course}
              students={students}
              assessments={assessments}
              rows={rows}
              onGoTab={goTab}
            />
          )}
          {tab === "students" && <StudentsTab course={course} students={students} />}
          {tab === "tests" && (
            <MarksGrid
              course={course}
              category="ct"
              title="Class Tests"
              description={
                course.settings.ctPolicy === "best_n"
                  ? `Best ${course.settings.ctBestN} tests are converted to ${course.settings.ctConvertedMax} marks.`
                  : `All tests are averaged and converted to ${course.settings.ctConvertedMax} marks.`
              }
              students={students}
              assessments={assessments}
              marks={marksList}
            />
          )}
          {tab === "attendance" && (
            <AttendanceTab course={course} students={students} attendance={attendanceList} />
          )}
          {tab === "assignments" && (
            <MarksGrid
              course={course}
              category="assignment"
              title="Assignments"
              description={`Converted to ${course.settings.assignmentMax} marks.`}
              students={students}
              assessments={assessments}
              marks={marksList}
            />
          )}
          {tab === "lab" && (
            <MarksGrid
              course={course}
              category="lab"
              title="Laboratory"
              description={`Converted to ${course.settings.labMax} marks.`}
              students={students}
              assessments={assessments}
              marks={marksList}
            />
          )}
          {tab === "summary" && <SummaryTab course={course} rows={rows} />}
          {tab === "marksheet" && (
            <MarksheetTab course={course} assessments={assessments} rows={rows} marks={markMap} />
          )}
          {tab === "settings" && <SettingsTab course={course} />}
        </div>
    </div>
  );
}
