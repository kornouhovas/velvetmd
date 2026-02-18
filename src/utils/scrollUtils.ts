/**
 * Converts webview scroll state to a target line number in the text editor.
 *
 * @param scrollTop     - Current scroll offset (px) from top of webview
 * @param scrollHeight  - Total scrollable height (px) of webview document
 * @param viewportHeight - Visible viewport height (px)
 * @param totalLines    - Total number of lines in the document
 * @returns Target line index (0-based), clamped to [0, totalLines-1]
 */
/**
 * Converts a target line number to a webview scrollTop offset.
 *
 * Inverse of scrollStateToLine. Maps a 0-based line index to the
 * pixel offset needed to restore an equivalent scroll position.
 *
 * @param line           - Target line index (0-based)
 * @param totalLines     - Total number of lines in the document
 * @param scrollHeight   - Total scrollable height (px) of webview document
 * @param viewportHeight - Visible viewport height (px)
 * @returns scrollTop value (px), clamped to [0, scrollableHeight]
 */
export function lineToScrollState(
  line: number,
  totalLines: number,
  scrollHeight: number,
  viewportHeight: number
): number {
  if (totalLines <= 1) { return 0; }

  const scrollableHeight = Math.max(scrollHeight - viewportHeight, 0);
  if (scrollableHeight === 0) { return 0; }

  const maxLine = totalLines - 1;
  const linePercent = Math.max(0, Math.min(line / maxLine, 1));
  return Math.round(linePercent * scrollableHeight);
}

export function scrollStateToLine(
  scrollTop: number,
  scrollHeight: number,
  viewportHeight: number,
  totalLines: number
): number {
  if (totalLines <= 0) { return 0; }

  const scrollableHeight = Math.max(scrollHeight - viewportHeight, 0);
  if (scrollableHeight === 0) { return 0; }

  const scrollPercent = Math.max(0, Math.min(scrollTop / scrollableHeight, 1));
  const maxLine = Math.max(0, totalLines - 1);
  return Math.min(Math.round(scrollPercent * maxLine), maxLine);
}
