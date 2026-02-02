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
 * Clean markdown content
 *
 * Removes or normalizes problematic patterns:
 * - Empty headings
 * - Excessive whitespace
 * - Invalid link syntax
 */
export function cleanMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let cleaned = markdown;

  // Remove empty headings (e.g., "# \n")
  cleaned = cleaned.replace(/^#{1,6}\s*$/gm, '');

  // NOTE: Multiple space normalization is intentionally skipped to preserve
  // indentation in code blocks and intentional spacing.
  // Code block-aware processing could be added if specific use cases emerge.

  // Fix broken links [text]( url) → [text](url)
  cleaned = cleaned.replace(/\]\(\s+/g, '](');
  cleaned = cleaned.replace(/\s+\)/g, ')');

  return cleaned;
}

/**
 * Normalize markdown whitespace
 *
 * Ensures consistent whitespace handling:
 * - Single blank line between paragraphs
 * - No trailing whitespace
 * - Consistent indentation
 */
export function normalizeMarkdownWhitespace(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let normalized = markdown;

  // Normalize line endings
  normalized = normalized.replace(/\r\n/g, '\n');

  // Remove trailing whitespace from lines (except hard breaks: two spaces at end)
  normalized = normalized.replace(/(?<! {2})\s+$/gm, '');

  // Normalize paragraph spacing (ensure single blank line between paragraphs)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  return normalized;
}

/**
 * Extract metadata from markdown content
 *
 * @param markdown - Markdown content
 * @returns Metadata object with statistics
 */
export function extractMarkdownMetadata(markdown: string): {
  lineCount: number;
  characterCount: number;
  wordCount: number;
  headingCount: number;
  linkCount: number;
  codeBlockCount: number;
} {
  if (!markdown || typeof markdown !== 'string') {
    return {
      lineCount: 0,
      characterCount: 0,
      wordCount: 0,
      headingCount: 0,
      linkCount: 0,
      codeBlockCount: 0
    };
  }

  const lines = markdown.split('\n');
  const words = markdown.match(/\b\w+\b/g) || [];
  const headings = markdown.match(/^#{1,6}\s+.+$/gm) || [];
  const links = markdown.match(/\[.+?\]\(.+?\)/g) || [];
  const codeBlocks = markdown.match(/```[\s\S]*?```/g) || [];

  return {
    lineCount: lines.length,
    characterCount: markdown.length,
    wordCount: words.length,
    headingCount: headings.length,
    linkCount: links.length,
    codeBlockCount: codeBlocks.length
  };
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
