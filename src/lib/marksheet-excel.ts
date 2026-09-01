import ExcelJS from "exceljs";
import type { MarksheetModel } from "./marksheet";
import { splitRows } from "./marksheet";

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

export async function exportMarksheetExcel(
  filename: string,
  m: MarksheetModel,
  logoUrl?: string,
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Marksheet", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  const n = m.columns.length;
  const gap = 1;
  const totalCols = n * 2 + gap;

  // column widths
  ws.getColumn(n + 1).width = 2;
  for (let i = 0; i < n; i++) {
    ws.getColumn(i + 1).width = m.columns[i]!.width;
    ws.getColumn(n + gap + i + 1).width = m.columns[i]!.width;
  }


  const lastCol = totalCols;
  const titleRows: { text: string; size: number; bold: boolean; height: number }[] = [
    { text: m.title1, size: 10, bold: false, height: 16 },
    { text: m.university, size: 16, bold: true, height: 24 },
    { text: m.faculty, size: 14, bold: true, height: 20 },
    { text: m.department, size: 13, bold: true, height: 19 },
    { text: m.examLine, size: 11, bold: true, height: 17 },
    { text: "", size: 10, bold: false, height: 8 },
    { text: m.subjectLine, size: 12, bold: true, height: 20 },
    { text: "", size: 10, bold: false, height: 8 },
  ];

  titleRows.forEach((t, idx) => {
    const r = idx + 1;
    ws.mergeCells(r, 1, r, lastCol);
    const cell = ws.getCell(r, 1);
    cell.value = t.text;
    cell.font = { name: "Times New Roman", size: t.size, bold: t.bold };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(r).height = t.height;
  });

  // logo
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      const buf = await res.arrayBuffer();
      const ext = logoUrl.toLowerCase().endsWith(".png") ? "png" : "jpeg";
      const imageId = wb.addImage({ buffer: buf as ArrayBuffer, extension: ext });
      ws.addImage(imageId, { tl: { col: 0.1, row: 0.3 }, ext: { width: 78, height: 78 } });
    } catch {
      /* logo optional */
    }
  }

  const headerRow = titleRows.length + 1;
  const { left, right } = splitRows(m.rows);

  // table headers (two rows: label + sub), merged where no sub
  m.columns.forEach((c, i) => {
    [1, n + gap + 1].forEach((offset) => {
      const col = offset + i;
      const top = ws.getCell(headerRow, col);
      const bottom = ws.getCell(headerRow + 1, col);
      if (c.sub) {
        top.value = c.label;
        bottom.value = c.sub;
      } else {
        ws.mergeCells(headerRow, col, headerRow + 1, col);
        top.value = c.label;
      }
      [top, bottom].forEach((cell) => {
        cell.font = { name: "Times New Roman", size: 10, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = BORDER;
      });
    });
  });
  ws.getRow(headerRow).height = 15;
  ws.getRow(headerRow + 1).height = 15;

  const bodyStart = headerRow + 2;
  const maxRows = Math.max(left.length, right.length);
  for (let i = 0; i < maxRows; i++) {
    const r = bodyStart + i;
    ws.getRow(r).height = 15;
    const write = (row: (typeof left)[number] | undefined, offset: number) => {
      for (let ci = 0; ci < n; ci++) {
        const cell = ws.getCell(r, offset + ci);
        const raw = row?.cells[ci] ?? "";
        const num = Number(raw);
        cell.value = raw !== "" && Number.isFinite(num) && ci > 0 ? num : raw;
        cell.font = {
          name: "Times New Roman",
          size: 10,
          bold: ci === n - 1 && raw !== "",
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = BORDER;
      }
    };
    write(left[i], 1);
    write(right[i], n + gap + 1);
  }

  // signatures
  const sigRow = bodyStart + maxRows + 3;
  const half = Math.floor(lastCol / 2);
  ws.mergeCells(sigRow, 1, sigRow, half);
  ws.mergeCells(sigRow, half + 1, sigRow, lastCol);
  const sigLeft = ws.getCell(sigRow, 1);
  const sigRight = ws.getCell(sigRow, half + 1);
  sigLeft.value = "Signature of Course Teacher";
  sigRight.value = "Head of the Department";
  [sigLeft, sigRight].forEach((c) => {
    c.font = { name: "Times New Roman", size: 10, bold: true };
    c.alignment = { horizontal: "center" };
    c.border = { top: { style: "thin" } };
  });

  const nameRow = sigRow + 1;
  ws.mergeCells(nameRow, 1, nameRow, half);
  const nameCell = ws.getCell(nameRow, 1);
  nameCell.value = [m.teacherName, m.teacherDesignation].filter(Boolean).join(", ");
  nameCell.font = { name: "Times New Roman", size: 10 };
  nameCell.alignment = { horizontal: "center" };

  ws.pageSetup.printArea = `A1:${colLetter(lastCol)}${nameRow}`;

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function colLetter(n: number) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
