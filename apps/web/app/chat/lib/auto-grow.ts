/**
 * 根据文本换行数计算 textarea 应显示的行数，上限 maxRows。
 */
export function computeRows(text: string, maxRows: number): number {
  if (maxRows < 1) return 1;
  if (text === '') return 1;
  const lineCount = text.split('\n').length;
  return Math.min(Math.max(lineCount, 1), maxRows);
}
