import chalk from "chalk";
import type { ChalkColorInput } from "../types.ts";

/**
 * Resolves any Chalk color name, hex code, or custom function into a styling function.
 */
export function resolveColorFn(
  color?: ChalkColorInput,
  isBackground = false
): (text: string) => string {
  if (!color) return (text: string) => text;
  if (typeof color === "function") return color;

  if (typeof color === "string" && color in chalk) {
    const fn = chalk[color as keyof typeof chalk];
    if (typeof fn === "function") return fn as (text: string) => string;
  }

  if (typeof color === "string" && color.startsWith("#")) {
    return isBackground ? chalk.bgHex(color) : chalk.hex(color);
  }

  return isBackground ? chalk.bgHex("#121212") : (text: string) => text;
}

/**
 * Applies styling to tokens starting with the configured prefix.
 */
export function formatInputTokens(
  prefix: string,
  text: string,
  color: ChalkColorInput = "blue"
): string {
  const colorFn = resolveColorFn(color, false);

  return text
    .split(/(\s+)/)
    .map((word) => {
      if (word.startsWith(prefix) && word.length > 1) {
        return chalk.bold(colorFn(word));
      }
      return word;
    })
    .join("");
}

