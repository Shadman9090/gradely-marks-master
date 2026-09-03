import * as XLSX from "xlsx";

export type SheetRow = Record<string, unknown>;

export async function readWorkbook(file: File): Promise<{
  sheetNames: string[];
  read: (sheet: string) => { headers: string[]; rows: SheetRow[] };
}> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return {
    sheetNames: wb.SheetNames,
    read: (sheet: string) => {
      const ws = wb.Sheets[sheet]!;
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
      // find the header row: first row with >= 2 non-empty string cells
      let headerIndex = 0;
      for (let i = 0; i < Math.min(matrix.length, 30); i++) {
        const filled = (matrix[i] ?? []).filter(
          (c) => c !== null && c !== undefined && String(c).trim() !== "",
        );
        if (filled.length >= 2) {
          headerIndex = i;
          break;
        }
      }
      const headerRow = (matrix[headerIndex] ?? []).map((c, i) =>
        String(c ?? "").trim() === "" ? `Column ${i + 1}` : String(c).trim(),
      );
      const rows: SheetRow[] = [];
      for (let i = headerIndex + 1; i < matrix.length; i++) {
        const r = matrix[i] ?? [];
        if (r.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
        const obj: SheetRow = {};
        headerRow.forEach((h, idx) => (obj[h] = r[idx]));
        rows.push(obj);
      }
      return { headers: headerRow, rows };
    },
  };
}

export function exportSheet(
  filename: string,
  sheets: { name: string; rows: (string | number | null)[][] }[],
) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

/**
 * Detects spreadsheet footer/statistics rows (e.g. "Absent Students",
 * "Average CT Mark", "Summary") that must never be treated as a student roll.
 */
const SUMMARY_ROLL =
  /^(absent|present|average|avg|highest|high|lowest|low|maximum|max(?!\d)|minimum|min(?!\d)|total|summary|mean|median|count|no\.?\s*of|number\s*of|passed|failed|pass\b|fail\b|gpa|grade|class\s*of|date|signature|remarks?)/i;

export function isSummaryRoll(roll: string): boolean {
  return SUMMARY_ROLL.test(roll.trim());
}

export function guessColumn(headers: string[], candidates: string[]): string {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const c of candidates) {
    const hit = headers.find((h) => norm(h) === norm(c));
    if (hit) return hit;
  }
  for (const c of candidates) {
    const hit = headers.find((h) => norm(h).includes(norm(c)));
    if (hit) return hit;
  }
  return "";
}
