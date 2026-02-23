/**
 * Markdown Serializer Utility
 *
 * Provides custom markdown serialization and postprocessing to ensure
 * high-fidelity round-trip conversion (Editor → Markdown → Editor).
 */

/**
 * Postprocess markdown content after serialization
 *
 * Handles edge cases and normalizes output:
 * - Removes trailing &nbsp; entities
 * - Ensures consistent line endings
 */
export function postprocessMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let processed = markdown;

  // Remove trailing &nbsp; entities (added by some Tiptap serializers)
  processed = processed.replace(/&nbsp;\s*$/g, '');

  // Remove &nbsp; at end of lines
  processed = processed.replace(/&nbsp;$/gm, '');

  // Strip blank-line placeholder characters (zero-width spaces inserted by addBlankLinePlaceholders)
  processed = processed.replace(/\u200B/g, '');

  // Normalize line endings (CRLF → LF)
  processed = processed.replace(/\r\n/g, '\n');

  // Remove trailing whitespace from lines
  processed = processed.replace(/[ \t]+$/gm, '');

  // Remove leading/trailing whitespace but preserve single trailing newline (POSIX convention)
  processed = processed.trim();
  if (processed.length > 0) {
    processed += '\n';
  }

  return processed;
}

/**
 * Normalize markdown whitespace after ZWS placeholder removal.
 *
 * Each blank line in the file is stored as an empty/ZWS paragraph in the editor.
 * That paragraph contributes an extra \n\n to serialized output, doubling the
 * newline count. Halving sequences of 4+ newlines restores the original count.
 *
 * Formula: K blank lines → 2*(K+1) newlines in raw output → K+1 newlines after halving
 * Examples:
 *   \n\n\n\n  (4)  → \n\n   (1 blank line)
 *   \n\n\n\n\n\n (6) → \n\n\n (2 blank lines)
 *   \n{12}        → \n{6}  (5 blank lines)
 */
export function normalizeMarkdownWhitespace(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // match.length is always even: each blank line contributes exactly 2 newlines
  // (one paragraph open + one paragraph close in Tiptap output), so integer
  // division is exact. Math.floor is explicit for clarity.
  return markdown.replace(/\n{4,}/g, match => '\n'.repeat(Math.floor(match.length / 2)));
}

/**
 * Serialize and postprocess markdown content
 *
 * This is the main serialization function that should be used
 * after getting markdown from Tiptap editor.
 *
 * @param markdown - Raw markdown from editor
 * @returns Cleaned and postprocessed markdown
 */
export function serializeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Apply postprocessing steps
  let serialized = postprocessMarkdown(markdown);

  // Apply whitespace normalization
  serialized = normalizeMarkdownWhitespace(serialized);

  return serialized;
}
