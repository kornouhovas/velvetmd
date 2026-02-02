/**
 * Markdown Parser Utility
 *
 * Provides custom markdown parsing rules and preprocessing for edge cases.
 * Works in conjunction with @tiptap/markdown for parsing markdown content.
 */

import MarkdownIt from 'markdown-it';
import { MAX_CONTENT_SIZE_BYTES, formatBytes } from '../constants';

/**
 * Create a configured markdown-it instance with custom rules
 */
export function createMarkdownParser(): MarkdownIt {
  const md = new MarkdownIt({
    html: false, // Disable raw HTML for security (XSS prevention)
    linkify: true,
    typographer: true,
    breaks: false
  });

  // Enable additional features
  md.enable(['table', 'strikethrough']);

  return md;
}

/**
 * Preprocess markdown content before parsing
 *
 * Handles edge cases and normalizes input:
 * - Normalizes line endings (CRLF → LF)
 * - Preserves whitespace in specific contexts
 * - Handles empty content
 */
export function preprocessMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Normalize line endings
  let processed = markdown.replace(/\r\n/g, '\n');

  // Remove trailing whitespace from lines (but preserve intentional line breaks)
  processed = processed.replace(/[ \t]+$/gm, '');

  // Normalize excessive blank lines (more than 2 → 2)
  processed = processed.replace(/\n{4,}/g, '\n\n\n');

  return processed;
}

/**
 * Parse markdown to HTML using markdown-it
 *
 * @param markdown - Markdown content to parse
 * @returns HTML string
 */
export function parseMarkdownToHtml(markdown: string): string {
  const parser = createMarkdownParser();
  const preprocessed = preprocessMarkdown(markdown);

  if (!preprocessed) {
    return '';
  }

  try {
    return parser.render(preprocessed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new Error(`Markdown parsing failed: ${message}`);
  }
}

/**
 * Parse markdown and return tokens for inspection
 *
 * @param markdown - Markdown content to parse
 * @returns Array of markdown-it tokens
 */
export function parseMarkdownToTokens(markdown: string): MarkdownIt.Token[] {
  const parser = createMarkdownParser();
  const preprocessed = preprocessMarkdown(markdown);

  if (!preprocessed) {
    return [];
  }

  try {
    return parser.parse(preprocessed, {});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new Error(`Markdown tokenization failed: ${message}`);
  }
}

/**
 * Validate markdown content
 *
 * @param markdown - Markdown content to validate
 * @returns Object with validation results
 */
export function validateMarkdown(markdown: string): {
  valid: boolean;
  errors: readonly string[];
  warnings: readonly string[];
} {
  if (typeof markdown !== 'string') {
    return {
      valid: false,
      errors: ['Content must be a string'],
      warnings: []
    };
  }

  // Check for excessive file size
  const sizeError = markdown.length > MAX_CONTENT_SIZE_BYTES
    ? [`Content exceeds maximum size (${formatBytes(MAX_CONTENT_SIZE_BYTES)})`]
    : [];

  // Check for unmatched code blocks
  const codeBlockCount = (markdown.match(/```/g) || []).length;
  const codeBlockWarning = codeBlockCount % 2 !== 0
    ? ['Unmatched code block delimiters (```)']
    : [];

  // Check for unmatched brackets
  const openBrackets = (markdown.match(/\[/g) || []).length;
  const closeBrackets = (markdown.match(/\]/g) || []).length;
  const bracketWarning = openBrackets !== closeBrackets
    ? ['Unmatched square brackets']
    : [];

  const errors = [...sizeError];
  const warnings = [...codeBlockWarning, ...bracketWarning];

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
