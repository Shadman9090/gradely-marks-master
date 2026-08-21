import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/api";
import { DEFAULT_SETTINGS, type CourseSettings } from "@/lib/gradely-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/courses/new")({
  head: () => ({
    meta: [
      { title: "Create a course — GRADELY" },
      { name: "description", content: "Set up a new course with its assessment structure and marks policy." },
      { property: "og:title", content: "Create a course — GRADELY" },
      { property: "og:description", content: "Set up a new course with its assessment structure and marks policy." },
    ],
  }),
  component: NewCourse,
});

const SEMESTERS = ["Odd Semester", "Even Semester"];
const LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Masters"];

function NewCourse() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    code: "",
    title: "",
    university: "Rajshahi University of Engineering & Technology",
    department: "Department of Electrical and Computer Engineering",
    academic_year: String(new Date().getFullYear()),
    session: "",
    semester: "Even Semester",
    level: "3rd Year",
    section: "",
    course_type: "theory",
    teacher_name: "",
    teacher_designation: "",
  });
  const [settings, setSettings] = useState<CourseSettings>(DEFAULT_SETTINGS);
  const [ctCount, setCtCount] = useState(5);
  const [ctMax, setCtMax] = useState(20);

  // ---- student roster configuration ----
  const [autoRolls, setAutoRolls] = useState(true);
  const [series, setSeries] = useState("");
  const [studentCount, setStudentCount] = useState(60);
  const [excludeInput, setExcludeInput] = useState("");
  const [extraInput, setExtraInput] = useState("");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterError, setRosterError] = useState("");

  function buildRoster() {
    const problems: string[] = [];
    const list: RosterEntry[] = [];
    const seen = new Set<string>();

    if (autoRolls) {
      const s = series.trim();
      if (!/^\d{2,4}$/.test(s)) problems.push("Series must be a number, for example 21.");
      if (!Number.isFinite(studentCount) || studentCount < 1 || studentCount > 500)
        problems.push("Number of students must be between 1 and 500.");
      if (problems.length === 0) {
        for (let i = 1; i <= studentCount; i++) {
          const roll = `${s}${10000 + i}`;
          list.push({ roll, kind: "generated", excluded: false });
          seen.add(roll);
        }
      }
    }

    const excluded = parseRolls(excludeInput);
    for (const raw of excluded) {
      const roll = normaliseExclusion(raw, series, list);
      const hit = list.find((r) => r.roll === roll);
      if (!hit) {
        problems.push(`Excluded roll "${raw}" is not in the generated roster.`);
        continue;
      }
      hit.excluded = true;
    }

    for (const roll of parseRolls(extraInput)) {
      if (!/^\d{3,}$/.test(roll)) {
        problems.push(`"${roll}" does not look like a valid roll number.`);
        continue;
      }
      if (seen.has(roll)) {
        problems.push(`Roll ${roll} is already in the roster.`);
        continue;
      }
      seen.add(roll);
      list.push({ roll, kind: "other_series", excluded: false });
    }

    if (problems.length) {
      setRosterError(problems.join(" "));
      return false;
    }
    setRosterError("");
    setRoster(list);
    return true;
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile) {
        setForm((f) => ({
          ...f,
          teacher_name: profile.full_name || f.teacher_name,
          teacher_designation: profile.designation || f.teacher_designation,
          department: profile.department || f.department,
          university: profile.university || f.university,
        }));
      }
    });
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setS = <K extends keyof CourseSettings>(k: K, v: CourseSettings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  async function create() {
    if (!form.code.trim() || !form.title.trim()) {
      toast.error("Course code and title are required.");
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: course, error } = await supabase
        .from("courses")
        .insert({ ...form, teacher_id: userData.user!.id, settings })
        .select()
        .single();
      if (error) throw error;

      const rows = Array.from({ length: ctCount }, (_, i) => ({
        course_id: course.id,
        category: "ct",
        name: `CT ${i + 1}`,
        max_marks: ctMax,
        position: i,
      }));
      if (settings.useAssignment) {
        rows.push({
          course_id: course.id,
          category: "assignment",
          name: "Assignment",
          max_marks: settings.assignmentMax,
          position: 0,
        });
      }
      if (settings.useLab) {
        rows.push(
          {
            course_id: course.id,
            category: "lab",
            name: "Lab performance",
            max_marks: 20,
            position: 0,
          },
          { course_id: course.id, category: "lab", name: "Lab report", max_marks: 20, position: 1 },
          { course_id: course.id, category: "lab", name: "Lab viva", max_marks: 5, position: 2 },
        );
      }
      if (rows.length) {
        const { error: aErr } = await supabase.from("assessments").insert(rows);
        if (aErr) throw aErr;
      }

      queryClient.invalidateQueries();
      toast.success(`${course.code} created.`);
      navigate({
        to: "/courses/$courseId",
        params: { courseId: course.id },
        search: { tab: "students" },
      });
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const steps = ["Course information", "Assessment structure", "Review"];

  return (
    <div className="page-enter mx-auto max-w-3xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to dashboard
        </Button>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Create a new course</h1>
      </div>

      <ol className="flex items-center gap-2 text-sm">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                step > i + 1
                  ? "bg-success text-success-foreground"
                  : step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={step === i + 1 ? "font-medium" : "text-muted-foreground"}>{s}</span>
            {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-border sm:block" />}
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{steps[step - 1]}</CardTitle>
          <CardDescription>
            {step === 1
              ? "This information appears on the printed marksheet."
              : step === 2
                ? "You can change any of this later in course settings."
                : "Check everything looks right before creating the course."}
          </CardDescription>
        </CardHeader>
        <CardContent key={step} className="page-enter space-y-5">
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course code" required>
                <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="ECE 3205" />
              </Field>
              <Field label="Course title" required>
                <Input
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Industrial Electronics"
                />
              </Field>
              <Field label="University" className="sm:col-span-2">
                <Input value={form.university} onChange={(e) => set("university", e.target.value)} />
              </Field>
              <Field label="Department" className="sm:col-span-2">
                <Input value={form.department} onChange={(e) => set("department", e.target.value)} />
              </Field>
              <Field label="Year / Level">
                <Select value={form.level} onValueChange={(v) => set("level", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Semester">
                <Select value={form.semester} onValueChange={(v) => set("semester", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Academic year">
                <Input value={form.academic_year} onChange={(e) => set("academic_year", e.target.value)} />
              </Field>
              <Field label="Session">
                <Input value={form.session} onChange={(e) => set("session", e.target.value)} placeholder="2020-21" />
              </Field>
              <Field label="Section">
                <Input value={form.section} onChange={(e) => set("section", e.target.value)} placeholder="A" />
              </Field>
              <Field label="Course type">
                <Select value={form.course_type} onValueChange={(v) => set("course_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="sessional">Sessional / Lab</SelectItem>
                    <SelectItem value="mixed">Theory + Lab</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Teacher name">
                <Input value={form.teacher_name} onChange={(e) => set("teacher_name", e.target.value)} />
              </Field>
              <Field label="Designation">
                <Input
                  value={form.teacher_designation}
                  onChange={(e) => set("teacher_designation", e.target.value)}
                  placeholder="Assistant Professor"
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Number of class tests">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={ctCount}
                    onChange={(e) => setCtCount(Number(e.target.value))}
                  />
                </Field>
                <Field label="Marks per class test">
                  <Input type="number" min={1} value={ctMax} onChange={(e) => setCtMax(Number(e.target.value))} />
                </Field>
                <Field label="Class test policy">
                  <Select
                    value={settings.ctPolicy}
                    onValueChange={(v) => setS("ctPolicy", v as CourseSettings["ctPolicy"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best_n">Best N tests</SelectItem>
                      <SelectItem value="average">Average of all tests</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {settings.ctPolicy === "best_n" && (
                  <Field label="Best N">
                    <Input
                      type="number"
                      min={1}
                      value={settings.ctBestN}
                      onChange={(e) => setS("ctBestN", Number(e.target.value))}
                    />
                  </Field>
                )}
                <Field label="Converted class test marks">
                  <Input
                    type="number"
                    min={0}
                    value={settings.ctConvertedMax}
                    onChange={(e) => setS("ctConvertedMax", Number(e.target.value))}
                  />
                </Field>
              </div>

              <Toggle
                label="Attendance marks"
                checked={settings.useAttendance}
                onChange={(v) => setS("useAttendance", v)}
              >
                <Input
                  type="number"
                  className="w-24"
                  value={settings.attendanceMax}
                  onChange={(e) => setS("attendanceMax", Number(e.target.value))}
                />
              </Toggle>
              <Toggle
                label="Assignment & presentation"
                checked={settings.useAssignment}
                onChange={(v) => setS("useAssignment", v)}
              >
                <Input
                  type="number"
                  className="w-24"
                  value={settings.assignmentMax}
                  onChange={(e) => setS("assignmentMax", Number(e.target.value))}
                />
              </Toggle>
              <Toggle label="Laboratory" checked={settings.useLab} onChange={(v) => setS("useLab", v)}>
                <Input
                  type="number"
                  className="w-24"
                  value={settings.labMax}
                  onChange={(e) => setS("labMax", Number(e.target.value))}
                />
              </Toggle>

              <Field label="Total marks for this course">
                <Input
                  type="number"
                  className="w-32"
                  value={settings.totalMax}
                  onChange={(e) => setS("totalMax", Number(e.target.value))}
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Review k="Course" v={`${form.code} — ${form.title}`} />
              <Review k="Department" v={form.department} />
              <Review k="Session" v={[form.level, form.semester, form.session].filter(Boolean).join(" · ")} />
              <Review k="Teacher" v={[form.teacher_name, form.teacher_designation].filter(Boolean).join(", ")} />
              <Review k="Class tests" v={`${ctCount} × ${ctMax} marks`} />
              <Review
                k="Class test policy"
                v={
                  settings.ctPolicy === "best_n"
                    ? `Best ${settings.ctBestN} → ${settings.ctConvertedMax} marks`
                    : `Average of all → ${settings.ctConvertedMax} marks`
                }
              />
              <Review
                k="Attendance"
                v={settings.useAttendance ? `${settings.attendanceMax} marks` : "Not used"}
              />
              <Review
                k="Assignment"
                v={settings.useAssignment ? `${settings.assignmentMax} marks` : "Not used"}
              />
              <Review k="Laboratory" v={settings.useLab ? `${settings.labMax} marks` : "Not used"} />
              <Review k="Course total" v={`${settings.totalMax} marks`} />
            </dl>
          )}

          <div className="flex justify-between border-t pt-4">
            <Button
              variant="outline"
              onClick={() => (step === 1 ? navigate({ to: "/dashboard" }) : setStep(step - 1))}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={create} disabled={busy}>
                Create course
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3">
        <Switch checked={checked} onCheckedChange={onChange} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {checked && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Max marks {children}
        </div>
      )}
    </div>
  );
}

function Review({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border bg-surface px-3 py-2">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v || "—"}</dd>
    </div>
  );
}
