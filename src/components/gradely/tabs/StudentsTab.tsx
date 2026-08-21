import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Download, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { courseKeys, friendlyError } from "@/lib/api";
import { exportSheet, guessColumn, readWorkbook, type SheetRow } from "@/lib/excel";
import type { Course, Student } from "@/lib/gradely-types";
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
import { EmptyState } from "../EmptyState";
import { ConfirmDialog } from "../ConfirmDialog";

type Form = { id?: string; roll: string; name: string; reg_no: string; section: string };

const blank: Form = { roll: "", name: "", reg_no: "", section: "" };

export function StudentsTab({ course, students }: { course: Course; students: Student[] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(
    () =>
      students.filter((s) =>
        `${s.roll} ${s.name} ${s.reg_no}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [students, search],
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: courseKeys.students(course.id) });
  }

  async function save(f: Form) {
    if (!f.roll.trim()) {
      toast.error("Roll number is required.");
      return;
    }
    const payload = {
      course_id: course.id,
      roll: f.roll.trim(),
      name: f.name.trim(),
      reg_no: f.reg_no.trim(),
      section: f.section.trim(),
      position: students.length,
    };
    const { error } = f.id
      ? await supabase.from("students").update(payload).eq("id", f.id)
      : await supabase.from("students").insert(payload);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    invalidate();
    setForm(null);
    toast.success("Student saved.");
  }

  async function setStatus(s: Student, status: string) {
    const { error } = await supabase.from("students").update({ status }).eq("id", s.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    queryClient.invalidateQueries();
    toast.success(
      status === "excluded"
        ? `${s.roll} excluded from this course.`
        : `${s.roll} restored to the active list.`,
    );
  }

  async function remove(s: Student) {
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    invalidate();
    toast.success(`${s.roll} removed.`);
  }

  function exportStudents() {
    exportSheet(`${course.code}-students.xlsx`, [
      {
        name: "Students",
        rows: [
          ["Roll", "Name", "Registration No", "Section"],
          ...students.map((s) => [s.roll, s.name, s.reg_no, s.section]),
        ],
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Students</h2>
          <p className="text-sm text-muted-foreground">
            {students.filter((s) => s.status !== "excluded").length} active in {course.code}
            {students.some((s) => s.status === "excluded") &&
              ` · ${students.filter((s) => s.status === "excluded").length} excluded`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import Excel
          </Button>
          <Button size="sm" variant="outline" onClick={exportStudents} disabled={!students.length}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setForm({ ...blank })}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add student
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="No students yet"
          description="Add students one by one, or import an existing class list from Excel."
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setForm({ ...blank })}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add student
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Import Excel
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by roll, name or registration number"
            className="h-9 sm:max-w-sm"
          />
          <div className="soft-in overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Roll</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Registration</th>
                  <th className="px-3 py-2 text-left font-medium">Section</th>
                  <th className="w-20 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t transition-colors hover:bg-muted/40">
                    <td className="px-3 py-2 font-mono text-xs">{s.roll}</td>
                    <td className="px-3 py-2">{s.name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.reg_no || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.section || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() =>
                            setForm({
                              id: s.id,
                              roll: s.roll,
                              name: s.name ?? "",
                              reg_no: s.reg_no ?? "",
                              section: s.section ?? "",
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit student" : "Add student"}</DialogTitle>
            <DialogDescription>Roll number must be unique within the course.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Roll number</Label>
                <Input
                  value={form.roll}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, roll: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Registration no.</Label>
                <Input
                  value={form.reg_no}
                  maxLength={50}
                  onChange={(e) => setForm({ ...form, reg_no: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Input
                  value={form.section}
                  maxLength={20}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={() => form && save(form)}>Save student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Remove ${deleting?.roll}?`}
        description="This student and all of their marks and attendance records will be deleted."
        onConfirm={() => {
          if (deleting) remove(deleting);
          setDeleting(null);
        }}
      />

      <StudentImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        course={course}
        existing={students}
      />
    </div>
  );
}

function StudentImportDialog({
  open,
  onOpenChange,
  course,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: Course;
  existing: Student[];
}) {
  const queryClient = useQueryClient();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [map, setMap] = useState({ roll: "", name: "", reg_no: "", section: "" });
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    try {
      const wb = await readWorkbook(file);
      const { headers: h, rows: r } = wb.read(wb.sheetNames[0]!);
      setHeaders(h);
      setRows(r);
      setMap({
        roll: guessColumn(h, ["roll", "roll no", "student id"]),
        name: guessColumn(h, ["name", "student name"]),
        reg_no: guessColumn(h, ["registration", "reg no", "reg"]),
        section: guessColumn(h, ["section", "group"]),
      });
      setErrors([]);
    } catch {
      toast.error("That file could not be read. Please upload a valid .xlsx or .csv file.");
    }
  }

  async function confirm() {
    const problems: string[] = [];
    const seen = new Set(existing.map((s) => s.roll.trim()));
    const payload: {
      course_id: string;
      roll: string;
      name: string;
      reg_no: string;
      section: string;
      position: number;
    }[] = [];
    rows.forEach((row, i) => {
      const roll = String(row[map.roll] ?? "").trim();
      if (!roll) {
        problems.push(`Row ${i + 2}: missing roll number.`);
        return;
      }
      if (seen.has(roll)) {
        problems.push(`Row ${i + 2}: roll ${roll} already exists and was skipped.`);
        return;
      }
      seen.add(roll);
      payload.push({
        course_id: course.id,
        roll,
        name: String(row[map.name] ?? "").trim(),
        reg_no: String(row[map.reg_no] ?? "").trim(),
        section: String(row[map.section] ?? "").trim(),
        position: existing.length + payload.length,
      });
    });
    setErrors(problems);
    if (payload.length === 0) {
      toast.error("No new students found to import.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("students").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    queryClient.invalidateQueries({ queryKey: courseKeys.students(course.id) });
    toast.success(`${payload.length} students imported.`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import student list</DialogTitle>
          <DialogDescription>
            Upload your class list and match the columns. Existing roll numbers are skipped.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {headers.length > 0 &&
            (["roll", "name", "reg_no", "section"] as const).map((field) => (
              <div key={field} className="grid grid-cols-2 items-center gap-3">
                <Label className="capitalize">{field.replace("_", " ")}</Label>
                <Select
                  value={map[field] || "__skip"}
                  onValueChange={(v) => setMap({ ...map, [field]: v === "__skip" ? "" : v })}
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
          {errors.length > 0 && (
            <ul className="max-h-36 list-disc space-y-0.5 overflow-y-auto rounded-md border p-3 pl-6 text-xs text-destructive">
              {errors.slice(0, 30).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!map.roll || busy}>
            Import students
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
