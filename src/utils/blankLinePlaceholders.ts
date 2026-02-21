/**
 * Zero-width space used as a placeholder paragraph for blank lines.
 * Inserted when loading markdown so each blank line becomes a navigable
 * ProseMirror node. Stripped from output by postprocessMarkdown.
 */
export const BLANK_LINE_PLACEHOLDER = '\u200B';

/**
 * Inserts a BLANK_LINE_PLACEHOLDER paragraph for each blank line in markdown.
 *
 * Problem: ProseMirror has no cursor position for blank lines — they become
 * CSS margin between paragraphs. This prevents navigation through blank lines.
 *
 * Solution: each blank line is expanded to: <blank> + ZWS paragraph + <blank>.
 * The ZWS paragraph is a real ProseMirror node the cursor can visit.
 *
 * Fenced code blocks (``` or ~~~) are left untouched.
 * The trailing POSIX newline (last element after split) is never modified.
 *
 * @param markdown - Raw markdown string from the file
 * @returns Markdown with ZWS placeholders inserted at blank lines
 */
export function addBlankLinePlaceholders(markdown: string): string {
  if (!markdown) {
    return markdown;
  }

  const lines = markdown.split('\n');
  const result: string[] = [];
  let inFencedCode = false;
  const lastIndex = lines.length - 1;

  for (let i = 0; i <= lastIndex; i++) {
    const line = lines[i];

    // Track fenced code block open/close (simple toggle on ``` or ~~~ prefix)
    if (/^(`{3,}|~{3,})/.test(line)) {
      inFencedCode = !inFencedCode;
    }

    if (line === '' && !inFencedCode && i < lastIndex) {
      // Blank line outside code block (not the trailing POSIX newline):
      // keep the blank line, then insert ZWS placeholder
      result.push('');
      result.push(BLANK_LINE_PLACEHOLDER);
      // If the next line is content (not blank), add a closing blank line
      // so the ZWS placeholder is a proper paragraph (needs blank on both sides)
      if (lines[i + 1] !== '') {
        result.push('');
      }
      // If next line is also blank, that iteration will push its own '' first
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}
