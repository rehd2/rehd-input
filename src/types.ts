import type { ForegroundColorName, BackgroundColorName } from "chalk";

export type ChalkColorInput =
  | ForegroundColorName
  | BackgroundColorName
  | (string & {})
  | ((text: string) => string);

export interface WordHighlightConfig {
  prefix?: string;
  color?: ChalkColorInput;
}

export interface InputStylesConfig {
  backgroundColor?: ChalkColorInput;
  colorPrefixBg?: boolean;
  paddingTop?: number;
  paddingBottom?: number;
  paddingRight?: number;
  marginVertical?: number;
  marginHorizontal?: number;
  wordHighlight?: WordHighlightConfig;
}

export interface InputOptions {
  prefixText?: string;
  required?: boolean;
  prefixColor?: ChalkColorInput;
  placeholder?: string;
  history?: string[];
  MAX_HISTORY_SIZE?: number;
  styles?: InputStylesConfig;
}

export interface PhysicalPos {
  row: number;
  col: number;
  totalRows: number;
}

