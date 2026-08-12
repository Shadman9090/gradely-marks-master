import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { courseKeys, friendlyError } from "@/lib/api";
import { attendanceMarks, attendancePercent, fmt } from "@/lib/calc";
import type { Attendance, Course, Student } from "@/lib/gradely-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SaveIndicator, type SaveState } from "../SaveIndicator";
import { EmptyState } from "../EmptyState";

export function AttendanceTab({
  course,
  students,
  attendance,
}: {
  course: Course;
  students: Student[];
  attendance: Attendance[];
}) {
  const queryClient = useQueryClient();
  const s = course.settings;
  const [rows, setRows] = useState<Map<string, { held: string; attended: string }>>(new Map());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [bulkHeld, setBulkHeld] = useState("");
  const queue = useRef<Map<string, Attendance>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next = new Map<string, { held: string; attended: string }>();
    for (const a of attendance) {
      next.set(a.student_id, {
        held: a.classes_held === null ? "" : String(a.classes_held),
        attended: a.attended === null ? "" : String(a.attended),
      });
    }
    setRows(next);
  }, [attendance]);

  function flush() {
    const batch = [...queue.current.values()];
    queue.current.clear();
    if (!batch.length) return;
    setSaveState("saving");
    supabase
      .from("attendance")
      .upsert(batch, { onConflict: "course_id,student_id" })
      .then(({ error }) => {
        if (error) {
          setSaveState("dirty");
          toast.error(friendlyError(error));
          return;
        }
        setSaveState("saved");
        queryClient.invalidateQueries({ queryKey: courseKeys.attendance(course.id) });
        setTimeout(() => setSaveState((v) => (v === "saved" ? "idle" : v)), 2000);
      });
  }

  function update(studentId: string, field: "held" | "attended", raw: string) {
    const current = rows.get(studentId) ?? { held: "", attended: "" };
    const next = { ...current, [field]: raw };
    if (raw !== "" && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
      toast.error("Please enter a positive number of classes.");
      return;
    }
    if (
      next.held !== "" &&
      next.attended !== "" &&
      Number(next.attended) > Number(next.held)
    ) {
      toast.error("Classes attended cannot be more than classes held.");
      return;
    }
    setRows((prev) => new Map(prev).set(studentId, next));
    queue.current.set(studentId, {
      course_id: course.id,
      student_id: studentId,
      classes_held: next.held === "" ? null : Number(next.held),
      attended: next.attended === "" ? null : Number(next.attended),
    });
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }

  function applyBulkHeld() {
    const held = Number(bulkHeld);
    if (!Number.isFinite(held) || held <= 0) {
      toast.error("Enter a valid number of classes held.");
      return;
    }
    const next = new Map(rows);
    for (const st of students) {
      const cur = next.get(st.id) ?? { held: "", attended: "" };
      next.set(st.id, { ...cur, held: String(held) });
      queue.current.set(st.id, {
        course_id: course.id,
        student_id: st.id,
        classes_held: held,
        attended: cur.attended === "" ? null : Number(cur.attended),
      });
    }
    setRows(next);
    flush();
  }

  if (students.length === 0)
    return <EmptyState title="No students yet" description="Add students before recording attendance." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Attendance</h2>
          <p className="text-sm text-muted-foreground">
            {s.attendanceMode === "rules"
              ? `Converted to marks using your attendance rules (max ${s.attendanceMax}).`
              : `Converted proportionally to a maximum of ${s.attendanceMax} marks.`}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <SaveIndicator state={saveState} />
          <div className="space-y-1">
            <Label className="text-xs">Set classes held for all</Label>
            <div className="flex gap-2">
              <Input
                className="h-9 w-28"
                type="number"
                min={1}
                value={bulkHeld}
                onChange={(e) => setBulkHeld(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={applyBulkHeld}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Roll</th>
              <th className="px-3 py-2 text-left font-medium">Student</th>
              <th className="px-3 py-2 text-center font-medium">Classes held</th>
              <th className="px-3 py-2 text-center font-medium">Attended</th>
              <th className="px-3 py-2 text-right font-medium">Percentage</th>
              <th className="px-3 py-2 text-right font-medium">Marks</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const r = rows.get(st.id) ?? { held: "", attended: "" };
              const record: Attendance = {
                course_id: course.id,
                student_id: st.id,
                classes_held: r.held === "" ? null : Number(r.held),
                attended: r.attended === "" ? null : Number(r.attended),
              };
              const pct = attendancePercent(record);
              const mark = attendanceMarks(pct, s);
              return (
                <tr key={st.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-1.5 font-mono text-xs">{st.roll}</td>
                  <td className="px-3 py-1.5">{st.name || "—"}</td>
                  <td className="px-2 py-1 text-center">
                    <input
                      className="numeric h-8 w-20 rounded border border-transparent bg-transparent text-center outline-none focus:border-ring focus:bg-background hover:border-input"
                      defaultValue={r.held}
                      key={`h-${st.id}-${r.held}`}
                      onBlur={(e) => e.target.value !== r.held && update(st.id, "held", e.target.value.trim())}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      className="numeric h-8 w-20 rounded border border-transparent bg-transparent text-center outline-none focus:border-ring focus:bg-background hover:border-input"
                      defaultValue={r.attended}
                      key={`a-${st.id}-${r.attended}`}
                      onBlur={(e) =>
                        e.target.value !== r.attended && update(st.id, "attended", e.target.value.trim())
                      }
                    />
                  </td>
                  <td className="numeric px-3 py-1.5 text-right">
                    {pct === null ? "—" : `${pct.toFixed(1)}%`}
                  </td>
                  <td className="numeric px-3 py-1.5 text-right font-medium">{fmt(mark, s)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
