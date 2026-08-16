import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Table2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listCourses, friendlyError } from "@/lib/api";
import type { Course } from "@/lib/gradely-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/components/gradely/CourseCard";
import { ConfirmDialog } from "@/components/gradely/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GRADELY" },
      { name: "description", content: "All your courses, students and marks progress in one place." },
      { property: "og:title", content: "Dashboard — GRADELY" },
      { property: "og:description", content: "All your courses, students and marks progress in one place." },
    ],
  }),
  component: Dashboard,
});

type Stat = {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof BookOpen;
};


function Dashboard() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);

  const { data: courses, isLoading } = useQuery({ queryKey: ["courses"], queryFn: listCourses });

  const { data: overview } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const [{ data: students }, { data: assessments }, { data: marks }] = await Promise.all([
        supabase.from("students").select("id,course_id"),
        supabase.from("assessments").select("id,course_id"),
        supabase.from("marks").select("id,course_id"),
      ]);
      return {
        students: students ?? [],
        assessments: assessments ?? [],
        marks: marks ?? [],
      };
    },
  });

  const perCourse = useMemo(() => {
    const map = new Map<string, { students: number; expected: number; entered: number }>();
    for (const c of courses ?? []) map.set(c.id, { students: 0, expected: 0, entered: 0 });
    for (const s of overview?.students ?? []) {
      const e = map.get(s.course_id);
      if (e) e.students += 1;
    }
    const assessCount = new Map<string, number>();
    for (const a of overview?.assessments ?? [])
      assessCount.set(a.course_id, (assessCount.get(a.course_id) ?? 0) + 1);
    for (const [id, e] of map) e.expected = e.students * (assessCount.get(id) ?? 0);
    for (const m of overview?.marks ?? []) {
      const e = map.get(m.course_id);
      if (e) e.entered += 1;
    }
    return map;
  }, [courses, overview]);

  const totalStudents = overview?.students.length ?? 0;
  const completed = (courses ?? []).filter((c) => {
    const e = perCourse.get(c.id);
    return e && e.expected > 0 && e.entered >= e.expected;
  }).length;
  const pending = (courses ?? []).length - completed;

  const courseCount = courses?.length ?? 0;
  const stats: Stat[] = [
    {
      label: "Active courses",
      value: courseCount,
      hint: courseCount === 1 ? "1 course this semester" : `${courseCount} courses this semester`,
      icon: BookOpen,
    },
    {
      label: "Total students",
      value: totalStudents,
      hint: courseCount ? "Enrolled across all courses" : "Add students to a course",
      icon: Users,
    },
    {
      label: "Pending marks",
      value: pending < 0 ? 0 : pending,
      hint: pending > 0 ? "Courses awaiting entries" : "Everything is up to date",
      icon: ClipboardList,
    },
    {
      label: "Completed marksheets",
      value: completed,
      hint: completed ? "Ready to print" : "None finalised yet",
      icon: CheckCircle2,
    },
  ];

  const firstCourse = courses?.[0];
  const quickActions = [
    {
      label: "Create course",
      icon: Plus,
      onClick: () => navigate({ to: "/courses/new" }),
    },
    {
      label: "Import students",
      icon: Upload,
      onClick: () =>
        firstCourse
          ? navigate({
              to: "/courses/$courseId",
              params: { courseId: firstCourse.id },
              search: { tab: "students" },
            })
          : navigate({ to: "/courses/new" }),
    },
    {
      label: "Enter marks",
      icon: Table2,
      onClick: () =>
        firstCourse
          ? navigate({
              to: "/courses/$courseId",
              params: { courseId: firstCourse.id },
              search: { tab: "tests" },
            })
          : navigate({ to: "/courses/new" }),
    },
    {
      label: "Generate marksheet",
      icon: FileText,
      onClick: () =>
        firstCourse
          ? navigate({
              to: "/courses/$courseId",
              params: { courseId: firstCourse.id },
              search: { tab: "marksheet" },
            })
          : navigate({ to: "/courses/new" }),
    },
  ];

  const filtered = (courses ?? []).filter((c) =>
    `${c.code} ${c.title} ${c.session}`.toLowerCase().includes(search.toLowerCase()),
  );


  async function duplicate(course: Course) {
    try {
      const { data: created, error } = await supabase
        .from("courses")
        .insert({
          teacher_id: course.teacher_id,
          code: `${course.code} (copy)`,
          title: course.title,
          university: course.university,
          department: course.department,
          academic_year: course.academic_year,
          session: course.session,
          semester: course.semester,
          level: course.level,
          section: course.section,
          course_type: course.course_type,
          teacher_name: course.teacher_name,
          teacher_designation: course.teacher_designation,
          settings: course.settings,
        })
        .select()
        .single();
      if (error) throw error;
      const { data: assessments } = await supabase
        .from("assessments")
        .select("*")
        .eq("course_id", course.id);
      if (assessments?.length) {
        await supabase.from("assessments").insert(
          assessments.map((a) => ({
            course_id: created.id,
            category: a.category,
            name: a.name,
            max_marks: a.max_marks,
            position: a.position,
          })),
        );
      }
      toast.success("Course duplicated (students and marks were not copied).");
      queryClient.invalidateQueries();
      navigate({ to: "/courses/$courseId", params: { courseId: created.id }, search: { tab: "overview" } });
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function remove(course: Course) {
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(`${course.code} deleted.`);
    queryClient.invalidateQueries();
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName =
    (user?.user_metadata?.["full_name"] as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="page-enter space-y-8">
      {/* Header */}
      <header className="rise-in overflow-hidden rounded-xl border border-primary/10 bg-card p-5 shadow-card sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Dashboard
            </p>
            <h1 className="mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {greeting}, {displayName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your courses, assessments and marksheets from one place.
            </p>
          </div>
          <Button className="press w-full sm:w-auto" onClick={() => navigate({ to: "/courses/new" })}>
            <Plus className="mr-1.5 h-4 w-4" /> Create new course
          </Button>
        </div>
      </header>

      {/* Statistics */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="rise-in card-lift rounded-xl border border-border/80 bg-card p-4 shadow-card hover:border-primary/25"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <s.icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <p className="numeric mt-3 text-2xl font-semibold leading-none sm:text-[28px]">
              {s.value}
            </p>
            <p className="mt-2 truncate text-[11px] text-muted-foreground">{s.hint}</p>
          </div>
        ))}
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="rise-in press group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card px-3.5 py-3 text-left text-sm font-medium shadow-card transition-colors hover:border-primary/30 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <a.icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Courses */}
      <section>
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Your courses</h2>
            <p className="text-xs text-muted-foreground">
              {courseCount === 1 ? "1 course" : `${courseCount} courses`} in your workspace
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search course code or title"
              aria-label="Search courses"
              className="h-10 rounded-lg border-border/80 bg-card pl-9 pr-9 shadow-card transition-shadow focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/25"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-60 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="soft-in flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-6 py-14 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-card text-primary shadow-card">
              {courses?.length ? (
                <Search className="h-6 w-6" />
              ) : (
                <FileSpreadsheet className="h-6 w-6" />
              )}
            </span>
            <h3 className="text-sm font-semibold">
              {courses?.length ? "No course matches that search" : "No courses yet"}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {courses?.length
                ? "Try a different course code or title."
                : "Create your first course to start managing students and marks."}
            </p>
            <div className="mt-5">
              {courses?.length ? (
                <Button variant="outline" className="press" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <Button className="press" onClick={() => navigate({ to: "/courses/new" })}>
                  <Plus className="mr-1.5 h-4 w-4" /> Create your first course
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c, i) => {
              const e = perCourse.get(c.id);
              const progress = e && e.expected > 0 ? Math.min(100, (e.entered / e.expected) * 100) : 0;
              return (
                <div key={c.id} className="rise-in" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                  <CourseCard
                    course={c}
                    studentCount={e?.students ?? 0}
                    progress={progress}
                    onDuplicate={() => duplicate(c)}
                    onDelete={() => setPendingDelete(c)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>


      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.code ?? "course"}?`}
        description="This permanently removes the course together with its students, assessments, marks and attendance. This cannot be undone."
        confirmLabel="Delete course"
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
