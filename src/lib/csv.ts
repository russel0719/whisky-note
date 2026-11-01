export type CsvValue = string | number | boolean | null | undefined;

/** RFC 4180 셀 — 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표는 두 번 쓴다 */
export function csvCell(value: CsvValue): string {
  if (value == null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 헤더 + 행 → CSV 문자열. Excel이 UTF-8 한글을 바로 읽도록 BOM을 붙인다 */
export function toCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}
