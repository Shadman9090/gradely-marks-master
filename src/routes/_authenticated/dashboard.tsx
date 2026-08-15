import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, ClipboardList, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listCourses, friendlyError } from "@/lib/api";
import type { Course } from "@/lib/gradely-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard } from "@/components/gradely/CourseCard";
import { EmptyState } from "@/components/gradely/EmptyState";
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

type Stat = { label: string; value: string | number; icon: typeof BookOpen };

function Dashboard() {
  const navigate = useNavigate();
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

  const stats: Stat[] = [
    { label: "Active courses", value: courses?.length ?? 0, icon: BookOpen },
    { label: "Total students", value: totalStudents, icon: Users },
    { label: "Courses with pending marks", value: pending < 0 ? 0 : pending, icon: ClipboardList },
    { label: "Completed marksheets", value: completed, icon: CheckCircle2 },
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

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Marks management, made simple.</p>
        </div>
        <Button onClick={() => navigate({ to: "/courses/new" })}>
          <Plus className="mr-1.5 h-4 w-4" /> Create new course
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="rise-in rounded-lg border bg-card p-4 shadow-card"
            style={{ animationDelay: `${i * 40}ms` }}
          >

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="numeric mt-2 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Your courses</h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by course code or title"
            className="h-9 w-full sm:w-64"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title={courses?.length ? "No course matches that search" : "No courses yet"}
            description={
              courses?.length
                ? "Try a different course code or title."
                : "Create your first course to start adding students and entering marks."
            }
            action={
              <Button onClick={() => navigate({ to: "/courses/new" })}>
                <Plus className="mr-1.5 h-4 w-4" /> Create new course
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => {
              const e = perCourse.get(c.id);
              const progress = e && e.expected > 0 ? Math.min(100, (e.entered / e.expected) * 100) : 0;
              return (
                <CourseCard
                  key={c.id}
                  course={c}
                  studentCount={e?.students ?? 0}
                  progress={progress}
                  onDuplicate={() => duplicate(c)}
                  onDelete={() => setPendingDelete(c)}
                />
              );
            })}
          </div>
        )}
      </div>

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
