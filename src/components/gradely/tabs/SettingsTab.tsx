import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { courseKeys, friendlyError } from "@/lib/api";
import type { Course, CourseSettings } from "@/lib/gradely-types";
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
import { ConfirmDialog } from "../ConfirmDialog";

export function SettingsTab({ course }: { course: Course }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [meta, setMeta] = useState({
    code: course.code,
    title: course.title,
    university: course.university,
    department: course.department,
    academic_year: course.academic_year,
    session: course.session,
    semester: course.semester,
    level: course.level,
    section: course.section,
    teacher_name: course.teacher_name,
    teacher_designation: course.teacher_designation,
  });
  const [s, setS] = useState<CourseSettings>(course.settings);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function set<K extends keyof CourseSettings>(key: K, value: CourseSettings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!meta.code.trim() || !meta.title.trim()) {
      toast.error("Course code and title are required.");
      return;
    }
    if (s.totalMax <= 0) {
      toast.error("Total marks must be greater than zero.");
      return;
    }
    const componentSum =
      s.ctConvertedMax +
      (s.useAttendance ? s.attendanceMax : 0) +
      (s.useAssignment ? s.assignmentMax : 0) +
      (s.useLab ? s.labMax : 0);
    if (componentSum !== s.totalMax) {
      toast.error(
        `Component marks add up to ${componentSum}, but the total is set to ${s.totalMax}. Please align them.`,
      );
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("courses")
      .update({ ...meta, settings: JSON.parse(JSON.stringify(s)) })
      .eq("id", course.id);
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: courseKeys.detail(course.id) });
    queryClient.invalidateQueries({ queryKey: courseKeys.all });
    toast.success("Course settings saved.");
  }

  async function remove() {
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: courseKeys.all });
    toast.success("Course deleted.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Course details</h2>
          <p className="text-sm text-muted-foreground">These appear on the printed marksheet.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["code", "Course code"],
              ["title", "Course title"],
              ["university", "University"],
              ["department", "Department"],
              ["academic_year", "Academic year"],
              ["session", "Session"],
              ["semester", "Semester"],
              ["level", "Level / Term"],
              ["section", "Section"],
              ["teacher_name", "Teacher name"],
              ["teacher_designation", "Designation"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                value={meta[key]}
                maxLength={120}
                onChange={(e) => setMeta({ ...meta, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Calculation rules</h2>
          <p className="text-sm text-muted-foreground">
            Component marks must add up to the total marks.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Class test policy</Label>
            <Select value={s.ctPolicy} onValueChange={(v) => set("ctPolicy", v as "best_n" | "average")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="best_n">Best N tests</SelectItem>
                <SelectItem value="average">Average of all tests</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {s.ctPolicy === "best_n" && (
            <NumberField label="Number of best tests" value={s.ctBestN} onChange={(v) => set("ctBestN", v)} />
          )}
          <NumberField
            label="CT converted marks"
            value={s.ctConvertedMax}
            onChange={(v) => set("ctConvertedMax", v)}
          />
          <NumberField label="Total marks" value={s.totalMax} onChange={(v) => set("totalMax", v)} />
        </div>

        <ToggleBlock
          label="Attendance component"
          checked={s.useAttendance}
          onChange={(v) => set("useAttendance", v)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Conversion mode</Label>
              <Select
                value={s.attendanceMode}
                onValueChange={(v) => set("attendanceMode", v as "rules" | "proportional")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rules">Percentage bands</SelectItem>
                  <SelectItem value="proportional">Proportional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField
              label="Attendance marks"
              value={s.attendanceMax}
              onChange={(v) => set("attendanceMax", v)}
            />
          </div>
          {s.attendanceMode === "rules" && (
            <div className="mt-3 space-y-2">
              <Label className="text-xs">Bands (minimum % → marks)</Label>
              {s.attendanceRules.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="h-9 w-24"
                    value={r.min}
                    onChange={(e) => {
                      const rules = [...s.attendanceRules];
                      rules[i] = { ...r, min: Number(e.target.value) };
                      set("attendanceRules", rules);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">% or more →</span>
                  <Input
                    type="number"
                    className="h-9 w-24"
                    value={r.marks}
                    onChange={(e) => {
                      const rules = [...s.attendanceRules];
                      rules[i] = { ...r, marks: Number(e.target.value) };
                      set("attendanceRules", rules);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">marks</span>
                </div>
              ))}
            </div>
          )}
        </ToggleBlock>

        <ToggleBlock
          label="Assignment component"
          checked={s.useAssignment}
          onChange={(v) => set("useAssignment", v)}
        >
          <NumberField
            label="Assignment marks"
            value={s.assignmentMax}
            onChange={(v) => set("assignmentMax", v)}
          />
        </ToggleBlock>

        <ToggleBlock label="Laboratory component" checked={s.useLab} onChange={(v) => set("useLab", v)}>
          <NumberField label="Lab marks" value={s.labMax} onChange={(v) => set("labMax", v)} />
        </ToggleBlock>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Rounding</Label>
            <Select
              value={s.rounding}
              onValueChange={(v) => set("rounding", v as CourseSettings["rounding"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="round">Round to decimals</SelectItem>
                <SelectItem value="ceil">Always round up</SelectItem>
                <SelectItem value="floor">Always round down</SelectItem>
                <SelectItem value="none">No rounding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberField label="Decimal places" value={s.decimals} onChange={(v) => set("decimals", v)} />
          <div className="flex items-end gap-3 pb-1">
            <Switch checked={s.absentAsZero} onCheckedChange={(v) => set("absentAsZero", v)} />
            <Label className="text-sm">Count absent as zero</Label>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-between gap-3 border-t pt-6">
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete course
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${course.code}?`}
        description="All students, assessments, marks and attendance for this course will be permanently deleted."
        confirmLabel="Delete course"
        onConfirm={remove}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function ToggleBlock({
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
    <div className="rounded-lg border bg-surface p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      {checked && <div className="mt-4">{children}</div>}
    </div>
  );
}
