/**
 * Converts a target line number to a webview scrollTop offset.
 *
 * Places the target line at the TOP of the viewport by computing
 * its pixel position within the document and using that as scrollTop.
 * The result is clamped to [0, scrollableHeight] so the viewport
 * never scrolls past the end of the document.
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
  if (!Number.isFinite(scrollHeight) || !Number.isFinite(viewportHeight)) { return 0; }
  if (totalLines <= 0) { return 0; }

  const scrollableHeight = Math.max(scrollHeight - viewportHeight, 0);
  const clampedLine = Math.max(0, Number.isNaN(line) ? 0 : line);
  const rawScrollTop = Math.round((clampedLine / totalLines) * scrollHeight);
  return Math.min(rawScrollTop, scrollableHeight);
}

/**
 * Converts webview scroll state to a target line number in the text editor.
 *
 * Inverse of lineToScrollState. Both share the same model:
 *   line N is at pixel (N / totalLines) × scrollHeight
 *
 * @param scrollTop     - Current scroll offset (px) from top of webview
 * @param scrollHeight  - Total scrollable height (px) of webview document
 * @param viewportHeight - Visible viewport height (px)
 * @param totalLines    - Total number of lines in the document
 * @returns Target line index (0-based), clamped to [0, totalLines-1]
 */
export function scrollStateToLine(
  scrollTop: number,
  scrollHeight: number,
  viewportHeight: number,
  totalLines: number
): number {
  if (!Number.isFinite(scrollTop) || !Number.isFinite(scrollHeight) || !Number.isFinite(viewportHeight)) { return 0; }
  if (totalLines <= 0 || scrollHeight <= 0) { return 0; }

  const scrollableHeight = Math.max(scrollHeight - viewportHeight, 0);
  const clampedScrollTop = Math.max(0, Math.min(scrollTop, scrollableHeight));
  return Math.min(Math.round((clampedScrollTop / scrollHeight) * totalLines), totalLines - 1);
}
