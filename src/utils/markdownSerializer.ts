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
 * - Normalizes excessive blank lines
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

  // Normalize line endings (CRLF → LF)
  processed = processed.replace(/\r\n/g, '\n');

  // Remove trailing whitespace from lines
  processed = processed.replace(/[ \t]+$/gm, '');

  // Normalize excessive blank lines (more than 2 → 2)
  processed = processed.replace(/\n{4,}/g, '\n\n\n');

  // Remove leading/trailing whitespace but preserve single trailing newline (POSIX convention)
  processed = processed.trim();
  if (processed.length > 0) {
    processed += '\n';
  }

  return processed;
}

/**
 * Normalize markdown whitespace
 *
 * Ensures consistent paragraph spacing:
 * - At most one blank line between paragraphs (collapses 3+ consecutive newlines to 2)
 */
export function normalizeMarkdownWhitespace(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Normalize paragraph spacing (ensure max one blank line between paragraphs)
  return markdown.replace(/\n{3,}/g, '\n\n');
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
