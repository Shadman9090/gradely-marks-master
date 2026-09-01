import { useMemo, useRef, useState } from "react";
import { Printer, FileDown, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { MarkMap, StudentSummary } from "@/lib/calc";
import type { Assessment, Course } from "@/lib/gradely-types";
import { buildMarksheet, splitRows, type MarksheetModel, type MarksheetRow } from "@/lib/marksheet";
import { exportMarksheetExcel } from "@/lib/marksheet-excel";
import ruetLogo from "@/assets/ruet-logo.jpeg.asset.json";
import { Button } from "@/components/ui/button";
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
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const model = useMemo(
    () => buildMarksheet(course, assessments, rows, marks),
    [course, assessments, rows, marks],
  );

  if (rows.length === 0)
    return <EmptyState title="Nothing to print yet" description="Add students and marks first." />;

  async function exportPdf() {
    if (!sheetRef.current) return;
    setExporting("pdf");
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      let heightLeft = imgHeight;
      let position = 0;
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
      window.print();
    } finally {
      setExporting(null);
    }
  }

  async function exportExcel() {
    setExporting("xlsx");
    try {
      await exportMarksheetExcel(`${course.code}-marksheet.xlsx`, model, ruetLogo.url);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Marksheet</h2>
          <p className="text-sm text-muted-foreground">
            Official format sheet. PDF and Excel exports use the same layout.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportExcel} disabled={exporting !== null}>
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            {exporting === "xlsx" ? "Generating…" : "Export Excel"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={exporting !== null}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            {exporting === "pdf" ? "Generating…" : "Export PDF"}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
          </Button>
        </div>
      </div>

      <style>{`@page { size: A4 portrait; margin: 12mm; }`}</style>

      <div className="soft-in overflow-x-auto">
        <div
          ref={sheetRef}
          className="print-sheet mx-auto bg-white p-8 font-serif text-[11px] text-black shadow-card"
        >
          <SheetHeader model={model} />
          <SheetTable model={model} />
          <div className="mt-16 flex justify-between text-[11px]">
            <div className="text-center">
              <div className="w-56 border-t border-black pt-1 font-semibold">
                Signature of Course Teacher
              </div>
              <p className="mt-1">{model.teacherName}</p>
              <p>{model.teacherDesignation}</p>
            </div>
            <div className="text-center">
              <div className="w-56 border-t border-black pt-1 font-semibold">
                Head of the Department
              </div>
              <p className="mt-1">{course.department}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetHeader({ model }: { model: MarksheetModel }) {
  return (
    <header className="relative text-center">
      <img
        src={ruetLogo.url}
        alt="RUET"
        crossOrigin="anonymous"
        className="absolute left-0 top-1 h-20 w-20 object-contain"
      />
      <p className="text-[11px] italic">{model.title1}</p>
      <h1 className="text-[19px] font-bold leading-tight">{model.university}</h1>
      {model.faculty && <p className="text-[16px] font-bold leading-tight">{model.faculty}</p>}
      {model.department && (
        <p className="text-[15px] font-bold leading-tight">{model.department}</p>
      )}
      <p className="mt-0.5 text-[12px] font-semibold">{model.examLine}</p>
      <p className="mt-3 text-[13px] font-bold">{model.subjectLine}</p>
    </header>
  );
}

function SheetTable({ model }: { model: MarksheetModel }) {
  const { left, right } = splitRows(model.rows);
  const max = Math.max(left.length, right.length);
  return (
    <div className="mt-4 flex gap-4">
      <Block model={model} rows={left} count={max} />
      <Block model={model} rows={right} count={max} />
    </div>
  );
}

function Block({
  model,
  rows,
  count,
}: {
  model: MarksheetModel;
  rows: MarksheetRow[];
  count: number;
}) {
  return (
    <table className="w-1/2 border-collapse border border-black">
      <thead>
        <tr>
          {model.columns.map((c) => (
            <th
              key={c.key}
              className="border border-black px-1 py-0.5 text-center text-[10px] font-bold"
            >
              {c.label}
              {c.sub && <span className="block font-bold">{c.sub}</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }).map((_, i) => {
          const r = rows[i];
          return (
            <tr key={i} className="avoid-break">
              {model.columns.map((c, ci) => (
                <td
                  key={c.key}
                  className={`border border-black px-1 py-0.5 text-center text-[10px] ${
                    ci === model.columns.length - 1 ? "font-semibold" : ""
                  }`}
                >
                  {r?.cells[ci] ?? ""}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
