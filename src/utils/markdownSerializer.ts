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
 * Collapse double newlines to single newlines outside fenced code blocks.
 *
 * With splitBlock-based Enter:
 *   - Single Enter → splitBlock → adjacent paragraphs → Tiptap produces \n\n → collapsed to \n
 *   - Double Enter → empty paragraph in between → Tiptap produces \n\n\n\n → collapsed to \n\n
 *
 * Math: K blank lines → 2*(K+1) raw newlines → replace(/\n\n/g, '\n') → K+1 newlines = K blank lines.
 *
 * Fenced code blocks (``` or ~~~) are protected: their internal newlines are preserved.
 */
export function collapseParagraphGaps(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return '';

  // Extract fenced code blocks into placeholders
  const codeBlocks: string[] = [];
  let result = markdown.replace(
    /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm,
    (match) => {
      const idx = codeBlocks.length;
      codeBlocks.push(match);
      return `\x00CODEBLOCK${idx}\x00`;
    }
  );

  // Collapse \n\n → \n outside code blocks
  result = result.replace(/\n\n/g, '\n');

  // Restore code blocks
  for (let i = 0; i < codeBlocks.length; i++) {
    result = result.replace(`\x00CODEBLOCK${i}\x00`, codeBlocks[i]);
  }
  return result;
}

/**
 * Serialize and postprocess markdown content
 *
 * This is the main serialization function that should be used
 * after getting markdown from Tiptap editor.
 *
 * Pipeline steps (in order):
 * 1. postprocessMarkdown   — strip ZWS, &nbsp;, CRLF, trailing whitespace, POSIX newline
 * 2. collapseParagraphGaps — collapse \n\n → \n between blocks (blank lines preserved via ZWS round-trip)
 *
 * @param markdown - Raw markdown from editor
 * @returns Cleaned and postprocessed markdown
 */
export function serializeMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Step 1: Strip ZWS, &nbsp;, normalize CRLF, ensure POSIX newline
  let serialized = postprocessMarkdown(markdown);

  // Step 2: Collapse \n\n → \n (Tiptap block separator → single newline; blank lines preserved via ZWS count)
  serialized = collapseParagraphGaps(serialized);

  return serialized;
}
