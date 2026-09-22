import stringWidth from "string-width";
import type { InputStylesConfig, PhysicalPos } from "../types.js";

export function getContentWidth(
  cols: number,
  prefixWidth: number,
  marginHorizontal: number,
  paddingRight: number
): number {
  const horizontalSpace = marginHorizontal * 2 + prefixWidth + paddingRight;
  return Math.max(1, cols - horizontalSpace);
}

export function wrapTextToRows(text: string, contentWidth: number): string[] {
  if (!text) return [""];
  const rows: string[] = [];
  let current = "";
  let currentVisWidth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const w = stringWidth(char);
    if (currentVisWidth + w > contentWidth && current.length > 0) {
      rows.push(current);
      current = char;
      currentVisWidth = w;
    } else {
      current += char;
      currentVisWidth += w;
    }
  }
  if (current.length > 0 || rows.length === 0) {
    rows.push(current);
  }
  return rows;
}

export function getCursorFromPhysicalPos(
  targetRow: number,
  targetCol: number,
  cols: number,
  value: string,
  prefixWidth: number,
  styles: InputStylesConfig
): number {
  if (value.length === 0) return 0;

  const { marginHorizontal = 0, paddingRight = 1 } = styles;
  const contentWidth = getContentWidth(cols, prefixWidth, marginHorizontal, paddingRight);
  const minCol = marginHorizontal + prefixWidth;

  let currentRow = 0;
  let charIdx = 0;
  const logicalLines = value.split("\n");

  for (let l = 0; l < logicalLines.length; l++) {
    const lineText = logicalLines[l];
    const lineLen = lineText.length;
    const subRows = wrapTextToRows(lineText, contentWidth);
    const physicalRowsInLine = subRows.length;

    if (currentRow + physicalRowsInLine > targetRow) {
      const subRowIdx = targetRow - currentRow;
      let charsBeforeSubRow = 0;
      for (let s = 0; s < subRowIdx; s++) {
        charsBeforeSubRow += subRows[s].length;
      }

      const targetSubRowText = subRows[subRowIdx] || "";
      let lineCharIdx = charsBeforeSubRow;
      let currentVisWidth = minCol;

      for (let i = 0; i < targetSubRowText.length; i++) {
        const charWidth = stringWidth(targetSubRowText[i]);
        if (currentVisWidth + charWidth > targetCol) {
          break;
        }
        currentVisWidth += charWidth;
        lineCharIdx++;
      }

      return charIdx + lineCharIdx;
    }

    currentRow += physicalRowsInLine;
    charIdx += lineLen + 1;
  }

  return value.length;
}

export function getPhysicalPos(
  cursorIdx: number,
  cols: number,
  value: string,
  placeholder: string,
  prefixWidth: number,
  styles: InputStylesConfig
): PhysicalPos {
  const {
    marginHorizontal = 0,
    marginVertical = 1,
    paddingTop = 1,
    paddingBottom = 1,
    paddingRight = 1,
  } = styles;

  const contentWidth = getContentWidth(cols, prefixWidth, marginHorizontal, paddingRight);
  const minCol = marginHorizontal + prefixWidth;

  const textBefore = value.slice(0, cursorIdx);
  const logicalLinesBefore = textBefore.split("\n");
  const currentLogicalLineIdx = logicalLinesBefore.length - 1;

  const allLogicalLines = value.split("\n");
  let cursorRow = 0;

  for (let i = 0; i < currentLogicalLineIdx; i++) {
    const subRows = wrapTextToRows(allLogicalLines[i] || "", contentWidth);
    cursorRow += subRows.length;
  }

  const activeLineTextBeforeCursor = logicalLinesBefore[currentLogicalLineIdx];
  const activeSubRowsBefore = wrapTextToRows(activeLineTextBeforeCursor, contentWidth);

  const subRowIdx = activeSubRowsBefore.length - 1;
  cursorRow += subRowIdx;

  const lastSubRowText = activeSubRowsBefore[subRowIdx] || "";
  const cursorCol = minCol + stringWidth(lastSubRowText);

  let totalContentRows = 0;
  const plainLines = (value || placeholder).split("\n");
  for (let i = 0; i < plainLines.length; i++) {
    const subRows = wrapTextToRows(plainLines[i], contentWidth);
    totalContentRows += subRows.length;
  }

  const absoluteRow = marginVertical + paddingTop + cursorRow;
  const totalRows = marginVertical + paddingTop + totalContentRows + paddingBottom + marginVertical;

  return {
    row: absoluteRow,
    col: cursorCol,
    totalRows,
  };
}

