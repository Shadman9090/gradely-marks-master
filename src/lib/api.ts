import { supabase } from "@/integrations/supabase/client";
import type {
  Assessment,
  Attendance,
  Course,
  Mark,
  Student,
} from "./gradely-types";
import { withDefaults } from "./gradely-types";

export function friendlyError(error: unknown): string {
  const msg = (error as { message?: string })?.message ?? String(error);
  if (/duplicate key/i.test(msg) && /students_course_id_roll/i.test(msg))
    return "A student with this roll number already exists in this course.";
  if (/duplicate key/i.test(msg)) return "This record already exists.";
  if (/row-level security/i.test(msg)) return "You do not have permission to change this record.";
  if (/violates foreign key/i.test(msg)) return "This record is linked to data that no longer exists.";
  return msg || "Something went wrong. Please try again.";
}

const mapCourse = (row: Record<string, unknown>): Course =>
  ({ ...row, settings: withDefaults(row.settings) }) as Course;

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCourse);
}

export async function getCourse(id: string): Promise<Course> {
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
  if (error) throw error;
  return mapCourse(data);
}

export async function listStudents(courseId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("course_id", courseId)
    .order("roll");
  if (error) throw error;
  return (data ?? []) as Student[];
}

export async function listAssessments(courseId: string): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("course_id", courseId)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((a) => ({ ...a, max_marks: Number(a.max_marks) })) as Assessment[];
}

export async function listMarks(courseId: string): Promise<Mark[]> {
  const { data, error } = await supabase.from("marks").select("*").eq("course_id", courseId);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    ...m,
    value: m.value === null ? null : Number(m.value),
  })) as Mark[];
}

export async function listAttendance(courseId: string): Promise<Attendance[]> {
  const { data, error } = await supabase.from("attendance").select("*").eq("course_id", courseId);
  if (error) throw error;
  return (data ?? []).map((a) => ({
    ...a,
    classes_held: a.classes_held === null ? null : Number(a.classes_held),
    attended: a.attended === null ? null : Number(a.attended),
  })) as Attendance[];
}

export async function upsertMark(mark: Mark) {
  const { error } = await supabase
    .from("marks")
    .upsert(
      {
        course_id: mark.course_id,
        assessment_id: mark.assessment_id,
        student_id: mark.student_id,
        value: mark.value,
        status: mark.status,
      },
      { onConflict: "assessment_id,student_id" },
    );
  if (error) throw error;
}

export async function upsertAttendance(row: Attendance) {
  const { error } = await supabase
    .from("attendance")
    .upsert(row, { onConflict: "course_id,student_id" });
  if (error) throw error;
}

export const courseKeys = {
  all: ["courses"] as const,
  detail: (id: string) => ["courses", id] as const,
  students: (id: string) => ["courses", id, "students"] as const,
  assessments: (id: string) => ["courses", id, "assessments"] as const,
  marks: (id: string) => ["courses", id, "marks"] as const,
  attendance: (id: string) => ["courses", id, "attendance"] as const,
};
