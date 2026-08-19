import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { courseKeys, friendlyError } from "@/lib/api";
import { guessColumn, readWorkbook, type SheetRow } from "@/lib/excel";
import type { Assessment, Course, Mark, Student } from "@/lib/gradely-types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MarksImportDialog({
  open,
  onOpenChange,
  course,
  students,
  assessments,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: Course;
  students: Student[];
  assessments: Assessment[];
}) {
  const queryClient = useQueryClient();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [rollCol, setRollCol] = useState("");
  const [nameCol, setNameCol] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function reset() {
    setHeaders([]);
    setRows([]);
    setRollCol("");
    setNameCol("");
    setMapping({});
    setErrors([]);
  }

  async function onFile(file: File) {
    try {
      const wb = await readWorkbook(file);
      const first = wb.sheetNames[0]!;
      const { headers: h, rows: r } = wb.read(first);
      setHeaders(h);
      setRows(r);
      setRollCol(guessColumn(h, ["roll", "roll no", "roll number", "student id"]));
      setNameCol(guessColumn(h, ["name", "student name", "full name"]));
      const next: Record<string, string> = {};
      for (const a of assessments) next[a.id] = guessColumn(h, [a.name]);
      setMapping(next);
      setErrors([]);
    } catch {
      toast.error("That file could not be read. Please upload a valid .xlsx or .csv file.");
    }
  }

  function buildMarks(extra: Student[] = []): {
    marks: Mark[];
    problems: string[];
    newStudents: { roll: string; name: string }[];
  } {
    const byRoll = new Map(
      [...students, ...extra].map((s) => [String(s.roll).trim(), s]),
    );
    const marks: Mark[] = [];
    const problems: string[] = [];
    const newStudents: { roll: string; name: string }[] = [];
    const seen = new Set<string>();

    rows.forEach((row, i) => {
      const roll = String(row[rollCol] ?? "").trim();
      if (!roll) {
        problems.push(`Row ${i + 2}: missing roll number.`);
        return;
      }
      if (seen.has(roll)) {
        problems.push(`Row ${i + 2}: duplicate roll number ${roll}.`);
        return;
      }
      seen.add(roll);
      const student = byRoll.get(roll);
      if (!student) {
        newStudents.push({
          roll,
          name: nameCol ? String(row[nameCol] ?? "").trim() : "",
        });
        return;
      }
      for (const a of assessments) {
        const col = mapping[a.id];
        if (!col) continue;
        const raw = row[col];
        if (raw === null || raw === undefined || String(raw).trim() === "") continue;
        const token = String(raw).trim().toLowerCase();
        if (["a", "ab", "absent"].includes(token)) {
          marks.push({
            course_id: course.id,
            assessment_id: a.id,
            student_id: student.id,
            value: null,
            status: "absent",
          });
          continue;
        }
        if (["na", "n/a", "n"].includes(token)) {
          marks.push({
            course_id: course.id,
            assessment_id: a.id,
            student_id: student.id,
            value: null,
            status: "na",
          });
          continue;
        }
        const num = Number(token);
        if (!Number.isFinite(num)) {
          problems.push(`Row ${i + 2}: "${raw}" in ${a.name} is not a valid mark.`);
          continue;
        }
        if (num < 0 || num > a.max_marks) {
          problems.push(
            `Row ${i + 2}: ${a.name} value ${num} is outside the allowed range 0–${a.max_marks}.`,
          );
          continue;
        }
        marks.push({
          course_id: course.id,
          assessment_id: a.id,
          student_id: student.id,
          value: num,
          status: "graded",
        });
      }
    });
    return { marks, problems, newStudents };
  }

  async function confirm() {
    const first = buildMarks();
    if (first.problems.length > 0) {
      setErrors(first.problems);
      toast.error("Please fix the problems listed before importing.");
      return;
    }
    setBusy(true);

    let created: Student[] = [];
    if (first.newStudents.length > 0) {
      const base = students.length;
      const { data, error } = await supabase
        .from("students")
        .insert(
          first.newStudents.map((s, i) => ({
            course_id: course.id,
            roll: s.roll,
            name: s.name,
            position: base + i,
          })),
        )
        .select();
      if (error) {
        setBusy(false);
        toast.error(friendlyError(error));
        return;
      }
      created = (data ?? []) as Student[];
    }

    const { marks, problems } = buildMarks(created);
    setErrors(problems);
    if (problems.length > 0) {
      setBusy(false);
      queryClient.invalidateQueries({ queryKey: courseKeys.students(course.id) });
      toast.error("Please fix the problems listed before importing.");
      return;
    }
    if (marks.length === 0) {
      setBusy(false);
      queryClient.invalidateQueries({ queryKey: courseKeys.students(course.id) });
      toast.error("No marks were found to import. Check your column mapping.");
      return;
    }
    const { error } = await supabase
      .from("marks")
      .upsert(marks, { onConflict: "assessment_id,student_id" });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: courseKeys.students(course.id) });
    queryClient.invalidateQueries({ queryKey: courseKeys.marks(course.id) });
    toast.success(
      created.length
        ? `${marks.length} marks imported, ${created.length} students enrolled.`
        : `${marks.length} marks imported.`,
    );
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import marks from Excel</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet, map its columns, and review any problems before importing.
            Existing marks for mapped columns will be replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Spreadsheet file</Label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </div>

          {headers.length > 0 && (
            <>
              <div className="space-y-1.5">
                <Label>Roll number column</Label>
                <Select value={rollCol} onValueChange={setRollCol}>
                  <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Student name column (used for new enrolments)</Label>
                <Select value={nameCol || "__none"} onValueChange={(v) => setNameCol(v === "__none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No name column</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Roll numbers not yet in this course will be enrolled automatically.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Match assessments to columns</Label>
                {assessments.map((a) => (
                  <div key={a.id} className="grid grid-cols-2 items-center gap-3">
                    <span className="text-sm">
                      {a.name} <span className="text-muted-foreground">[{a.max_marks}]</span>
                    </span>
                    <Select
                      value={mapping[a.id] || "__skip"}
                      onValueChange={(v) =>
                        setMapping((m) => ({ ...m, [a.id]: v === "__skip" ? "" : v }))
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip">Do not import</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="rounded-md border bg-surface p-3 text-xs">
                <p className="font-medium">{rows.length} rows detected</p>
                {errors.length > 0 && (
                  <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-4 text-destructive">
                    {errors.slice(0, 40).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={!rollCol}
            onClick={() => {
              const { problems } = buildMarks();
              setErrors(problems);
              toast[problems.length ? "error" : "success"](
                problems.length ? `${problems.length} problems found.` : "No problems found.",
              );
            }}
          >
            Validate
          </Button>
          <Button onClick={confirm} disabled={!rollCol || busy}>
            Import marks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
