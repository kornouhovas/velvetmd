/**
 * Pure utility functions extracted from MarkdownEditorProvider
 * for isolated unit testing without VS Code API dependencies.
 */

/**
 * Returns true if a webview update is still within the cooldown window.
 *
 * Used to detect echo: after a webview update triggers a document change,
 * the change event fires within WEBVIEW_UPDATE_COOLDOWN_MS. If we're still
 * within that window, the change is assumed to be an echo, not an external edit.
 *
 * @param lastUpdateTimestamp - Timestamp (ms) when the webview last sent an update
 * @param now                 - Current timestamp (ms)
 * @param cooldownMs          - Cooldown window in milliseconds
 */
export function isWithinCooldown(
  lastUpdateTimestamp: number,
  now: number,
  cooldownMs: number
): boolean {
  return now - lastUpdateTimestamp < cooldownMs;
}

/**
 * Returns true if the current document content matches the last content
 * sent by the webview, indicating a slow echo rather than an external edit.
 *
 * @param currentContent     - Current text of the VS Code document
 * @param lastWebviewContent - Last content string sent from webview (may be undefined)
 */
export function isEchoContent(
  currentContent: string,
  lastWebviewContent: string | undefined
): boolean {
  return lastWebviewContent !== undefined && currentContent === lastWebviewContent;
}

/**
 * Returns true if a scroll dimension value is safe to use.
 *
 * Rejects NaN, Infinity, and negative values which can cause
 * undefined behavior when stored and later passed to scroll APIs.
 *
 * @param value - A scroll dimension (scrollTop, scrollHeight, viewportHeight)
 */
export function isValidScrollDimension(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
