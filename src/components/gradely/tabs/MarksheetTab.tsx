import { useMemo, useRef, useState } from "react";
import { Printer, FileDown, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { MarkMap, StudentSummary } from "@/lib/calc";
import { fmt, markKey } from "@/lib/calc";
import type { Assessment, Course } from "@/lib/gradely-types";
import { exportSheet } from "@/lib/excel";
import ruetLogo from "@/assets/ruet-logo.jpeg.asset.json";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "../EmptyState";

export function MarksheetTab({
  course,
  assessments,
  rows,
  marks,
}: {
  course: Course;
  assessments: Assessment[];
  rows: StudentSummary[];
  marks: MarkMap;
}) {
  const s = course.settings;
  const [showName, setShowName] = useState(s.showNameOnSheet);
  const [showComponents, setShowComponents] = useState(true);
  const [landscape, setLandscape] = useState(s.sheetOrientation === "landscape");
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const cts = useMemo(
    () => assessments.filter((a) => a.category === "ct").sort((a, b) => a.position - b.position),
    [assessments],
  );

  if (rows.length === 0)
    return <EmptyState title="Nothing to print yet" description="Add students and marks first." />;

  async function exportPdf() {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgWidth = landscape ? 297 : 210; // A4 mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = landscape ? 210 : 297;

      const pdf = new jsPDF({
        orientation: landscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      let heightLeft = imgHeight;
      let position = 0;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${course.code}-marksheet.pdf`);
    } catch {
      // Fallback to browser print if PDF generation fails
      window.print();
    } finally {
      setExporting(false);
    }
  }

  function exportExcel() {
    const header: (string | number)[] = ["SL", "Roll"];
    if (showName) header.push("Name");
    if (showComponents) {
      cts.forEach((c) => header.push(`${c.name} (${c.max_marks})`));
    }
    header.push(`CT (${s.ctConvertedMax})`);
    if (s.useAttendance) header.push(`Att. (${s.attendanceMax})`);
    if (s.useAssignment) header.push(`Assign. (${s.assignmentMax})`);
    if (s.useLab) header.push(`Lab (${s.labMax})`);
    header.push(`Total (${s.totalMax})`);
    header.push("Grade");

    const data: (string | number | null)[][] = [header];

    rows.forEach((r, i) => {
      const row: (string | number | null)[] = [i + 1, r.student.roll];
      if (showName) row.push(r.student.name || "—");
      if (showComponents) {
        cts.forEach((c) => {
          const m = marks.get(markKey(c.id, r.student.id));
          if (!m) row.push("—");
          else if (m.status === "absent") row.push("A");
          else if (m.status === "na") row.push("NA");
          else if (m.status === "missing" || m.value === null) row.push("—");
          else row.push(m.value);
        });
      }
      row.push(fmt(r.ct.converted, s));
      if (s.useAttendance) row.push(fmt(r.attendanceMark, s));
      if (s.useAssignment) row.push(fmt(r.assignment.converted, s));
      if (s.useLab) row.push(fmt(r.lab.converted, s));
      row.push(fmt(r.total, s));
      row.push(r.grade);
      data.push(row);
    });

    exportSheet(`${course.code}-marksheet.xlsx`, [
      { name: "Marksheet", rows: data },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Marksheet</h2>
          <p className="text-sm text-muted-foreground">
            Print-ready A4 sheet. Export to PDF or Excel, or use your browser's print dialog.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showName} onCheckedChange={(v) => setShowName(!!v)} /> Student names
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showComponents} onCheckedChange={(v) => setShowComponents(!!v)} />
            Component breakdown
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={landscape} onCheckedChange={(v) => setLandscape(!!v)} /> Landscape
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Export Excel
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={exporting}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            {exporting ? "Generating…" : "Export PDF"}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      <style>{`@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 14mm; }`}</style>

      <div className="soft-in overflow-x-auto">
        <div
          ref={sheetRef}
          className="print-sheet mx-auto bg-card p-8 text-[11px] text-foreground shadow-card"
        >
          <header className="flex items-center gap-4 border-b-2 border-foreground pb-3">
            <img
              src={ruetLogo.url}
              alt="RUET"
              crossOrigin="anonymous"
              className="h-20 w-20 shrink-0 object-contain"
            />
            <div className="flex-1 text-center">
              <h1 className="font-serif text-lg font-bold uppercase tracking-wide">
                {course.university || "University"}
              </h1>
              <p className="text-xs">{course.department}</p>
              <p className="mt-2 font-serif text-sm font-semibold">Continuous Assessment Marksheet</p>
            </div>
            <div className="h-20 w-20 shrink-0" aria-hidden />
          </header>

          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
            <Row label="Course code" value={course.code} />
            <Row label="Session" value={course.session} />
            <Row label="Course title" value={course.title} />
            <Row label="Semester" value={course.semester} />
            <Row label="Level / Term" value={course.level} />
            <Row label="Section" value={course.section} />
            <Row label="Academic year" value={course.academic_year} />
            <Row label="Course teacher" value={course.teacher_name} />
          </div>

          <table className="mt-4 w-full border-collapse border border-foreground/70">
            <thead>
              <tr className="bg-muted/60">
                <Th>SL</Th>
                <Th>Roll</Th>
                {showName && <Th className="text-left">Name</Th>}
                {showComponents &&
                  cts.map((c) => (
                    <Th key={c.id}>
                      {c.name}
                      <span className="block font-normal">({c.max_marks})</span>
                    </Th>
                  ))}
                <Th>
                  CT<span className="block font-normal">({s.ctConvertedMax})</span>
                </Th>
                {s.useAttendance && (
                  <Th>
                    Att.<span className="block font-normal">({s.attendanceMax})</span>
                  </Th>
                )}
                {s.useAssignment && (
                  <Th>
                    Assign.<span className="block font-normal">({s.assignmentMax})</span>
                  </Th>
                )}
                {s.useLab && (
                  <Th>
                    Lab<span className="block font-normal">({s.labMax})</span>
                  </Th>
                )}
                <Th>
                  Total<span className="block font-normal">({s.totalMax})</span>
                </Th>
                <Th>Grade</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.student.id} className="avoid-break">
                  <Td>{i + 1}</Td>
                  <Td className="font-mono">{r.student.roll}</Td>
                  {showName && <Td className="text-left">{r.student.name}</Td>}
                  {showComponents &&
                    cts.map((c) => (
                      <Td key={c.id}>{markCell(marks, r.student.id, c)}</Td>
                    ))}
                  <Td>{fmt(r.ct.converted, s)}</Td>
                  {s.useAttendance && <Td>{fmt(r.attendanceMark, s)}</Td>}
                  {s.useAssignment && <Td>{fmt(r.assignment.converted, s)}</Td>}
                  {s.useLab && <Td>{fmt(r.lab.converted, s)}</Td>}
                  <Td className="font-semibold">{fmt(r.total, s)}</Td>
                  <Td>{r.grade}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-14 flex justify-between text-[11px]">
            <div className="text-center">
              <div className="w-52 border-t border-foreground pt-1">Signature of Course Teacher</div>
              <p className="mt-1">{course.teacher_name}</p>
              <p className="text-muted-foreground">{course.teacher_designation}</p>
            </div>
            <div className="text-center">
              <div className="w-52 border-t border-foreground pt-1">Head of the Department</div>
              <p className="mt-1">{course.department}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function markCell(marks: MarkMap, studentId: string, c: Assessment) {
  const m = marks.get(markKey(c.id, studentId));
  if (!m) return "—";
  if (m.status === "absent") return "A";
  if (m.status === "na") return "NA";
  if (m.status === "missing" || m.value === null) return "—";
  return String(m.value);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="inline-block w-28 text-muted-foreground">{label}</span>
      <span className="font-medium">: {value || "—"}</span>
    </p>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-foreground/70 px-1.5 py-1 text-center font-semibold ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`numeric border border-foreground/70 px-1.5 py-1 text-center ${className}`}>
      {children}
    </td>
  );
}
