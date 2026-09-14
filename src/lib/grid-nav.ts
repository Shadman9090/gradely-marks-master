/**
 * Shared grid-style keyboard navigation for every student mark input table.
 *
 * ROW = student, COLUMN = input field.
 *  - Tab / ArrowDown / Enter  -> same column, next student
 *  - Shift+Tab / ArrowUp      -> same column, previous student
 *  - ArrowRight / ArrowLeft   -> same student, next/previous column
 *
 * Only cells currently rendered (i.e. visible after search/filter) participate,
 * so navigation always follows the visual table.
 */
import type { KeyboardEvent } from "react";

export type GridCellProps = {
  "data-grid": string;
  "data-row": number;
  "data-col": number;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
};

function cellsIn(grid: string): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[data-grid="${CSS.escape(grid)}"]`),
  );
}

function focusCell(grid: string, row: number, col: number): boolean {
  const cells = cellsIn(grid);
  const target = cells.find(
    (el) => Number(el.dataset['row']) === row && Number(el.dataset['col']) === col,
  );
  if (!target) return false;
  target.focus({ preventScroll: true });
  target.select?.();
  target.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}

export function onGridKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const grid = el.dataset['grid'];
  if (!grid) return;
  const row = Number(el.dataset['row']);
  const col = Number(el.dataset['col']);
  if (!Number.isFinite(row) || !Number.isFinite(col)) return;

  let dr = 0;
  let dc = 0;

  switch (e.key) {
    case "Tab":
      dr = e.shiftKey ? -1 : 1;
      break;
    case "Enter":
    case "ArrowDown":
      dr = 1;
      break;
    case "ArrowUp":
      dr = -1;
      break;
    case "ArrowRight":
      // Only leave the field when the caret is already at the end.
      if (el.selectionStart !== el.value.length || el.selectionStart !== el.selectionEnd) return;
      dc = 1;
      break;
    case "ArrowLeft":
      if (el.selectionStart !== 0 || el.selectionStart !== el.selectionEnd) return;
      dc = -1;
      break;
    default:
      return;
  }

  e.preventDefault();
  if (!focusCell(grid, row + dr, col + dc)) {
    // Nothing to move to — commit the current value.
    if (e.key === "Enter") el.blur();
  }
}

export function gridCell(grid: string, row: number, col: number): GridCellProps {
  return { "data-grid": grid, "data-row": row, "data-col": col, onKeyDown: onGridKeyDown };
}
