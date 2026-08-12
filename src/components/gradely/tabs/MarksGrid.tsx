import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Download, Upload, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, courseKeys } from "@/lib/api";
import { markKey, fmt } from "@/lib/calc";
import type {
  Assessment,
  AssessmentCategory,
  Course,
  Mark,
  MarkStatus,
  Student,
} from "@/lib/gradely-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SaveIndicator, type SaveState } from "../SaveIndicator";
import { ConfirmDialog } from "../ConfirmDialog";
import { EmptyState } from "../EmptyState";
import { exportSheet } from "@/lib/excel";
import { MarksImportDialog } from "../MarksImportDialog";

type Draft = { value: string; status: MarkStatus };

const STATUS_TOKENS: Record<string, MarkStatus> = {
  a: "absent",
  ab: "absent",
  absent: "absent",
  n: "na",
  na: "na",
  "n/a": "na",
  "-": "missing",
};

export function MarksGrid({
  course,
  category,
  title,
  description,
  students,
  assessments,
  marks,
}: {
  course: Course;
  category: AssessmentCategory;
  title: string;
  description: string;
  students: Student[];
  assessments: Assessment[];
  marks: Mark[];
}) {
  const queryClient = useQueryClient();
  const items = useMemo(
    () => assessments.filter((a) => a.category === category).sort((a, b) => a.position - b.position),
    [assessments, category],
  );

  const [drafts, setDrafts] = useState<Map<string, Draft>>(new Map());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Assessment | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const queue = useRef<Map<string, Mark>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next = new Map<string, Draft>();
    for (const m of marks) {
      next.set(markKey(m.assessment_id, m.student_id), {
        value: m.status === "graded" && m.value !== null ? String(m.value) : "",
        status: m.status,
      });
    }
    setDrafts(next);
  }, [marks]);

  function flush() {
    const batch = [...queue.current.values()];
    queue.current.clear();
    if (batch.length === 0) return;
    setSaveState("saving");
    supabase
      .from("marks")
      .upsert(batch, { onConflict: "assessment_id,student_id" })
      .then(({ error }) => {
        if (error) {
          setSaveState("dirty");
          toast.error(friendlyError(error));
          return;
        }
        setSaveState("saved");
        queryClient.invalidateQueries({ queryKey: courseKeys.marks(course.id) });
        setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 2000);
      });
  }

  function schedule(mark: Mark) {
    queue.current.set(markKey(mark.assessment_id, mark.student_id), mark);
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }

  function onCellChange(assessment: Assessment, student: Student, raw: string) {
    const key = markKey(assessment.id, student.id);
    const trimmed = raw.trim().toLowerCase();
    let status: MarkStatus = "graded";
    let value: number | null = null;

    if (trimmed === "") {
      status = "missing";
    } else if (STATUS_TOKENS[trimmed]) {
      status = STATUS_TOKENS[trimmed]!;
    } else {
      const num = Number(trimmed);
      if (!Number.isFinite(num)) {
        toast.error(`"${raw}" is not a valid mark. Use a number, A for absent, or NA.`);
        return;
      }
      if (num < 0) {
        toast.error("Marks cannot be negative.");
        return;
      }
      if (num > assessment.max_marks) {
        toast.error(
          `Could not save this mark because it exceeds the maximum allowed mark of ${assessment.max_marks}.`,
        );
        return;
      }
      value = num;
    }

    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(key, { value: status === "graded" ? String(value) : raw.trim().toUpperCase(), status });
      return next;
    });
    schedule({
      course_id: course.id,
      assessment_id: assessment.id,
      student_id: student.id,
      value,
      status,
    });
  }

  async function saveAssessment(form: {
    id?: string;
    name: string;
    max_marks: number;
    assessed_on: string;
  }) {
    try {
      if (form.id) {
        const { error } = await supabase
          .from("assessments")
          .update({
            name: form.name,
            max_marks: form.max_marks,
            assessed_on: form.assessed_on || null,
          })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("assessments").insert({
          course_id: course.id,
          category,
          name: form.name,
          max_marks: form.max_marks,
          assessed_on: form.assessed_on || null,
          position: items.length,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: courseKeys.assessments(course.id) });
      toast.success("Assessment saved.");
      setEditing(null);
      setCreating(false);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  async function removeAssessment(a: Assessment) {
    const { error } = await supabase.from("assessments").delete().eq("id", a.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: courseKeys.assessments(course.id) });
    queryClient.invalidateQueries({ queryKey: courseKeys.marks(course.id) });
    toast.success(`${a.name} deleted.`);
  }

  const filtered = students.filter((s) =>
    `${s.roll} ${s.name}`.toLowerCase().includes(search.toLowerCase()),
  );

  function exportMarks() {
    const header = ["Roll", "Name", ...items.map((a) => `${a.name} [${a.max_marks}]`)];
    const rows = filtered.map((s) => [
      s.roll,
      s.name,
      ...items.map((a) => {
        const d = drafts.get(markKey(a.id, s.id));
        if (!d || d.status === "missing") return "";
        if (d.status === "absent") return "A";
        if (d.status === "na") return "NA";
        return Number(d.value);
      }),
    ]);
    exportSheet(`${course.code}-${category}-marks.xlsx`, [
      { name: title, rows: [header, ...rows] },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SaveIndicator state={saveState} />
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} disabled={!items.length}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import Excel
          </Button>
          <Button size="sm" variant="outline" onClick={exportMarks} disabled={!items.length}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add assessment
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No assessments yet"
          description={`Create your first ${title.toLowerCase()} entry to start recording marks.`}
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add assessment
            </Button>
          }
        />
      ) : students.length === 0 ? (
        <EmptyState title="No students in this course" description="Add students before entering marks." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roll or name"
              className="h-9 w-full sm:w-64"
            />
            <div className="flex flex-wrap gap-1.5">
              {items.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs"
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="numeric text-muted-foreground">[{a.max_marks}]</span>
                  <button className="text-muted-foreground hover:text-foreground" onClick={() => setEditing(a)}>
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button className="text-muted-foreground hover:text-destructive" onClick={() => setDeleting(a)}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/60 px-3 py-2 text-left font-medium">Roll</th>
                  <th className="min-w-40 px-3 py-2 text-left font-medium">Student</th>
                  {items.map((a) => (
                    <th key={a.id} className="px-2 py-2 text-center font-medium">
                      {a.name}
                      <span className="numeric block text-[11px] font-normal text-muted-foreground">
                        max {a.max_marks}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  let total = 0;
                  for (const a of items) {
                    const d = drafts.get(markKey(a.id, s.id));
                    if (d?.status === "graded" && d.value !== "") total += Number(d.value);
                  }
                  return (
                    <tr key={s.id} className="border-t hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-mono text-xs">{s.roll}</td>
                      <td className="truncate px-3 py-1.5">{s.name || "—"}</td>
                      {items.map((a) => {
                        const d = drafts.get(markKey(a.id, s.id));
                        const display =
                          d?.status === "absent" ? "A" : d?.status === "na" ? "NA" : (d?.value ?? "");
                        return (
                          <td key={a.id} className="px-1 py-1 text-center">
                            <input
                              className="numeric h-8 w-16 rounded border border-transparent bg-transparent text-center outline-none transition-colors focus:border-ring focus:bg-background hover:border-input"
                              defaultValue={display}
                              key={`${a.id}-${s.id}-${display}`}
                              onBlur={(e) => {
                                if (e.target.value.trim().toUpperCase() === display) return;
                                onCellChange(a, s, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              }}
                            />
                          </td>
                        );
                      })}
                      <td className="numeric px-3 py-1.5 text-right font-medium">
                        {fmt(total, course.settings)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Type a number, <span className="font-medium">A</span> for absent, or{" "}
            <span className="font-medium">NA</span> if the assessment does not apply. Changes save
            automatically.
          </p>
        </>
      )}

      <AssessmentDialog
        open={creating || !!editing}
        assessment={editing}
        defaultMax={category === "ct" ? 20 : 10}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={saveAssessment}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="All marks recorded for this assessment will be permanently removed."
        onConfirm={() => {
          if (deleting) removeAssessment(deleting);
          setDeleting(null);
        }}
      />

      <MarksImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        course={course}
        students={students}
        assessments={items}
      />
    </div>
  );
}

function AssessmentDialog({
  open,
  assessment,
  defaultMax,
  onClose,
  onSave,
}: {
  open: boolean;
  assessment: Assessment | null;
  defaultMax: number;
  onClose: () => void;
  onSave: (f: { id?: string; name: string; max_marks: number; assessed_on: string }) => void;
}) {
  const [name, setName] = useState("");
  const [max, setMax] = useState(defaultMax);
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(assessment?.name ?? "");
    setMax(assessment?.max_marks ?? defaultMax);
    setDate(assessment?.assessed_on ?? "");
  }, [open, assessment, defaultMax]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{assessment ? "Edit assessment" : "New assessment"}</DialogTitle>
          <DialogDescription>Give it a clear name and its maximum mark.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CT 1" maxLength={60} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Maximum marks</Label>
              <Input type="number" min={1} value={max} onChange={(e) => setMax(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Please give the assessment a name.");
                return;
              }
              if (!(max > 0)) {
                toast.error("Maximum marks must be greater than zero.");
                return;
              }
              onSave({
                ...(assessment ? { id: assessment.id } : {}),
                name: name.trim(),
                max_marks: max,
                assessed_on: date,
              });
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
