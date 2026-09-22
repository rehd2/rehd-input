import chalk from "chalk";
import ansiEscapes from "ansi-escapes";
import stringWidth from "string-width";

import type { InputOptions } from "./types.js";
import { resolveColorFn, formatInputTokens } from "./utils/style.js";
import { wrapTextToRows, getContentWidth, getPhysicalPos, getCursorFromPhysicalPos } from "./utils/layout.js";

export * from "./types.js";

export default function TextInput(
  prefixOrOptions: string | InputOptions = " ❯",
  options: InputOptions = {}
): Promise<string> {
  let prefixText = " ❯";
  let opts: InputOptions = {};

  if (typeof prefixOrOptions === "string") {
    prefixText = prefixOrOptions;
    opts = options || {};
  } else if (typeof prefixOrOptions === "object" && prefixOrOptions !== null) {
    opts = prefixOrOptions;
    if (opts.prefixText) {
      prefixText = opts.prefixText;
    }
  }

  const {
    required = true,
    prefixColor,
    placeholder = "Type a message or mention someone with @username...",
    history = [],
    MAX_HISTORY_SIZE = 10,
    styles = {},
  } = opts;

  const {
    backgroundColor = "#121212",
    colorPrefixBg = true,
    paddingTop = 1,
    paddingBottom = 1,
    paddingRight = 1,
    marginVertical = 1,
    marginHorizontal = 0,
    wordHighlight = {},
  } = styles;

  const { prefix: highlightPrefix = "@", color: highlightColor = "blue" } = wordHighlight;

  return new Promise<string>((resolve) => {
    const { stdin, stdout } = process;

    let value = "";
    let cursor = 0;
    let historyIndex = -1;
    let printedLines = 0;
    let lastCursorRow = 0;

    const rawPrefix = `${prefixText} `;
    const prefixWidth = stringWidth(rawPrefix);

    const prefixColorFn = resolveColorFn(prefixColor, false);
    const bgFn = resolveColorFn(backgroundColor, true);
    const indentGutter = " ".repeat(prefixWidth);

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function renderFullWidthLine(prefixContent: string, bodyContent: string, cols: number): string {
      const leftMargin = " ".repeat(marginHorizontal);
      const rightMargin = " ".repeat(marginHorizontal);

      const usableWidth = cols - marginHorizontal * 2;
      const pWidth = stringWidth(prefixContent);
      const bWidth = stringWidth(bodyContent);

      const trailingSpacesCount = Math.max(0, usableWidth - pWidth - bWidth);
      const paddedBody = bodyContent + " ".repeat(trailingSpacesCount);

      const styledPrefix = colorPrefixBg
        ? bgFn(prefixColorFn(prefixContent))
        : prefixColorFn(prefixContent);

      const styledBody = bgFn(paddedBody);

      return leftMargin + styledPrefix + styledBody + rightMargin;
    }

    function render(): void {
      const cols = stdout.columns || 80;
      const contentWidth = getContentWidth(cols, prefixWidth, marginHorizontal, paddingRight);
      let out = "";

      const linesFromCursorToBottom = printedLines - lastCursorRow;
      if (linesFromCursorToBottom > 0) {
        out += ansiEscapes.cursorDown(linesFromCursorToBottom);
      }

      for (let i = 0; i < printedLines; i++) {
        out += ansiEscapes.eraseLine;
        out += ansiEscapes.cursorUp(1);
      }

      out += ansiEscapes.eraseLine;
      out += ansiEscapes.cursorLeft;

      const formattedLines: string[] = [];

      for (let m = 0; m < marginVertical; m++) formattedLines.push("");
      for (let p = 0; p < paddingTop; p++) formattedLines.push(renderFullWidthLine("", "", cols));

      if (!value) {
        const subRows = wrapTextToRows(placeholder, contentWidth);
        for (let s = 0; s < subRows.length; s++) {
          const lineContent = chalk.dim(subRows[s]);
          const pText = s === 0 ? rawPrefix : indentGutter;
          formattedLines.push(renderFullWidthLine(pText, lineContent, cols));
        }
      } else {
        const logicalLines = value.split("\n");
        for (let l = 0; l < logicalLines.length; l++) {
          const lineText = logicalLines[l];
          const subRows = wrapTextToRows(lineText, contentWidth);

          for (let s = 0; s < subRows.length; s++) {
            const formattedSubRow = formatInputTokens(
              highlightPrefix,
              subRows[s],
              highlightColor
            );
            const pText = l === 0 && s === 0 ? rawPrefix : indentGutter;
            formattedLines.push(renderFullWidthLine(pText, formattedSubRow, cols));
          }
        }
      }

      for (let p = 0; p < paddingBottom; p++) formattedLines.push(renderFullWidthLine("", "", cols));
      for (let m = 0; m < marginVertical; m++) formattedLines.push("");

      out += formattedLines.join("\n");

      const pos = getPhysicalPos(cursor, cols, value, placeholder, prefixWidth, styles);
      printedLines = pos.totalRows - 1;

      const moveUp = printedLines - pos.row;
      if (moveUp > 0) {
        out += ansiEscapes.cursorUp(moveUp);
      }

      out += ansiEscapes.cursorTo(pos.col);
      lastCursorRow = pos.row;

      stdout.write(out);
    }

    function cleanup(): void {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", handleInput);
      stdout.removeListener("resize", render);
    }

    function submit(): void {
      const text = value.trim();

      if (required && !text) {
        render();
        return;
      }

      if (text) {
        if (history[0] !== text) {
          history.unshift(text);
        }
        if (history.length >= MAX_HISTORY_SIZE) {
          history.splice(MAX_HISTORY_SIZE);
        }
      }

      const moveDown = printedLines - lastCursorRow;
      if (moveDown > 0) {
        stdout.write(ansiEscapes.cursorDown(moveDown));
      }

      stdout.write(ansiEscapes.cursorLeft + "\n");
      cleanup();
      resolve(text);
    }

    function handleKey(key: string): void {
      const cols = stdout.columns || 80;

      // CTRL + C 
      if (key === "\u0003") {
        cleanup();
        stdout.write("\n\n\n");
        process.exit(0);
      }

      // Home key for different terminals
      if (
        key === "\u001b[H" ||
        key === "\u001b[1~" ||
        key === "\u001bOH" ||
        key === "\u0001"
      ) {
        cursor = 0;
        render();
        return;
      }

      // End key for different terminals
      if (
        key === "\u001b[F" ||
        key === "\u001b[4~" ||
        key === "\u001bOF" ||
        key === "\u0005"
      ) {
        cursor = value.length;
        render();
        return;
      }

      // Shift+Enter / Alt+Enter for new line
      if (
        key === "\u001b\r" ||
        key === "\u001b\n" ||
        key === "\x1b[13;2u"
      ) {
        historyIndex = -1;
        value = value.slice(0, cursor) + "\n" + value.slice(cursor);
        cursor++;
        render();
        return;
      }

      // Enter key
      if (key === "\r" || key === "\n") {
        submit();
        return;
      }

      // backspace (delete text)
      if (key === "\x7f" || key === "\b") {
        if (cursor > 0) {
          historyIndex = -1;
          value = value.slice(0, cursor - 1) + value.slice(cursor);
          cursor--;
          render();
        }
        return;
      }

      const pos = getPhysicalPos(cursor, cols, value, placeholder, prefixWidth, styles);
      const minCol = marginHorizontal + prefixWidth;
      const contentRow = pos.row - marginVertical - paddingTop;

      // Arrow left key
      if (key === ansiEscapes.cursorLeft || key === "\u001b[D") {
        if (pos.col > minCol) {
          cursor--;
          render();
        }
        return;
      }

      // Arrow right key
      if (key === "\u001b[C" || key === "\u001b[C") {
        if (cursor < value.length) {
          const nextPos = getPhysicalPos(cursor + 1, cols, value, placeholder, prefixWidth, styles);
          if (nextPos.row === pos.row) {
            cursor++;
            render();
          }
        }
        return;
      }

      // Arrow up key
      if (key === "\u001b[A") {
        if (contentRow > 0) {
          cursor = getCursorFromPhysicalPos(
            contentRow - 1,
            pos.col,
            cols,
            value,
            prefixWidth,
            styles
          );
          render();
        } else if (history.length > 0 && historyIndex < history.length - 1) {
          historyIndex++;
          value = history[historyIndex];
          cursor = value.length;
          render();
        }
        return;
      }

      // Arrow down key
      if (key === "\u001b[B") {
        const totalContentRows =
          pos.totalRows - marginVertical * 2 - paddingTop - paddingBottom;

        if (contentRow < totalContentRows - 1) {
          cursor = getCursorFromPhysicalPos(
            contentRow + 1,
            pos.col,
            cols,
            value,
            prefixWidth,
            styles
          );
          render();
        } else if (historyIndex !== -1) {
          if (historyIndex > 0) {
            historyIndex--;
            value = history[historyIndex];
            cursor = value.length;
          } else {
            historyIndex = -1;
            value = "";
            cursor = 0;
          }
          render();
        }
        return;
      }

      // ignore if ESC
      if (key.startsWith("\u001b")) return;

      if (key >= " ") {
        historyIndex = -1;
        value = value.slice(0, cursor) + key + value.slice(cursor);
        cursor += key.length;
        render();
      }
    }

    function handleInput(data: string): void {
      if (data.includes("\n") || data.includes("\r")) {
        if (
          ![
            "\r",
            "\n",
            "\r\n",
            "\u001b\r",
            "\u001b\n",
            "\x1b[13;2u",
          ].includes(data)
        ) {
          historyIndex = -1;
          const cleanPaste = data
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");

          value = value.slice(0, cursor) + cleanPaste + value.slice(cursor);
          cursor += cleanPaste.length;
          render();
          return;
        }
      }

      handleKey(data);
    }

    stdout.on("resize", render);
    render();
    stdin.on("data", handleInput);
  });
}

