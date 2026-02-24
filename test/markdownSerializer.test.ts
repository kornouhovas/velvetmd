import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  postprocessMarkdown,
  collapseParagraphGaps,
  serializeMarkdown
} from '../src/utils/markdownSerializer';

describe('postprocessMarkdown', () => {
  test('removes &nbsp; entities', () => {
    assert.strictEqual(postprocessMarkdown('hello&nbsp;'), 'hello\n');
    assert.strictEqual(postprocessMarkdown('line&nbsp;\nother'), 'line\nother\n');
  });

  test('normalizes CRLF to LF', () => {
    assert.strictEqual(postprocessMarkdown('a\r\nb'), 'a\nb\n');
  });

  test('removes trailing whitespace from lines', () => {
    assert.strictEqual(postprocessMarkdown('hello   \nworld'), 'hello\nworld\n');
  });

  test('does not collapse excessive newlines (delegated to collapseParagraphGaps)', () => {
    assert.strictEqual(postprocessMarkdown('a\n\n\n\nb'), 'a\n\n\n\nb\n');
  });

  test('adds POSIX trailing newline', () => {
    assert.strictEqual(postprocessMarkdown('hello'), 'hello\n');
  });

  test('returns empty string for empty/invalid input', () => {
    assert.strictEqual(postprocessMarkdown(''), '');
    assert.strictEqual(postprocessMarkdown('   '), '');
  });
});

describe('collapseParagraphGaps', () => {
  test('collapses \\n\\n between paragraphs', () => {
    assert.strictEqual(collapseParagraphGaps('para 1\n\npara 2\n'), 'para 1\npara 2\n');
  });

  test('collapses \\n\\n after heading', () => {
    assert.strictEqual(collapseParagraphGaps('# Heading\n\ntext\n'), '# Heading\ntext\n');
  });

  test('collapses consecutive headings', () => {
    assert.strictEqual(collapseParagraphGaps('# H1\n\n## H2\n\ntext\n'), '# H1\n## H2\ntext\n');
  });

  test('preserves 1 blank line from 4 newlines', () => {
    // 4 newlines → 2 pairs → \n\n (1 blank line)
    assert.strictEqual(collapseParagraphGaps('a\n\n\n\nb'), 'a\n\nb');
  });

  test('preserves 2 blank lines from 6 newlines', () => {
    // 6 newlines → 3 pairs → \n\n\n (2 blank lines)
    assert.strictEqual(collapseParagraphGaps('a\n\n\n\n\n\nb'), 'a\n\n\nb');
  });

  test('preserves 5 blank lines from 12 newlines', () => {
    // 12 newlines → 6 pairs → \n\n\n\n\n\n (5 blank lines)
    assert.strictEqual(collapseParagraphGaps('a\n\n\n\n\n\n\n\n\n\n\n\nb'), 'a\n\n\n\n\n\nb');
  });

  test('does not modify single newline', () => {
    assert.strictEqual(collapseParagraphGaps('a\nb'), 'a\nb');
  });

  test('handles odd newline count (3 newlines)', () => {
    // \n\n\n → first pair \n\n → \n, then remaining \n → \n\n
    assert.strictEqual(collapseParagraphGaps('a\n\n\nb'), 'a\n\nb');
  });

  test('returns empty string for empty/invalid input', () => {
    assert.strictEqual(collapseParagraphGaps(''), '');
  });

  test('protects backtick fenced code block', () => {
    const input = 'intro\n\n```\nline1\n\nline2\n```\n\noutro\n';
    const result = collapseParagraphGaps(input);
    assert.strictEqual(result, 'intro\n```\nline1\n\nline2\n```\noutro\n');
  });

  test('protects tilde fenced code block', () => {
    const input = 'intro\n\n~~~\nline1\n\nline2\n~~~\n\noutro\n';
    const result = collapseParagraphGaps(input);
    assert.strictEqual(result, 'intro\n~~~\nline1\n\nline2\n~~~\noutro\n');
  });

  test('protects code block with language tag', () => {
    const input = 'before\n\n```typescript\nconst x = 1;\n\nconst y = 2;\n```\n\nafter\n';
    const result = collapseParagraphGaps(input);
    assert.strictEqual(result, 'before\n```typescript\nconst x = 1;\n\nconst y = 2;\n```\nafter\n');
  });

  test('mismatched fence chars are not protected (backtick open, tilde close)', () => {
    // The ``` fence is never closed by ~~~, so no extraction occurs
    const input = 'intro\n\n```\ncode\n~~~\n\noutro\n';
    const result = collapseParagraphGaps(input);
    assert.strictEqual(result, 'intro\n```\ncode\n~~~\noutro\n');
  });
});

describe('serializeMarkdown', () => {
  test('full pipeline: removes &nbsp;, CRLF, trailing whitespace, normalizes blanks', () => {
    const input = 'para 1  \r\n\n\n\npara 2&nbsp;';
    const result = serializeMarkdown(input);
    assert.strictEqual(result, 'para 1\n\npara 2\n');
  });

  test('returns empty string for empty input', () => {
    assert.strictEqual(serializeMarkdown(''), '');
  });

  test('preserves inline code', () => {
    assert.strictEqual(serializeMarkdown('`code`'), '`code`\n');
  });

  test('full pipeline: collapses blank line after heading', () => {
    // Simulates raw Tiptap output: heading followed by \n\n before paragraph
    assert.strictEqual(serializeMarkdown('# Title\n\ntext\n'), '# Title\ntext\n');
  });

  test('full pipeline: collapses \\n\\n between paragraphs', () => {
    // Single Enter produces splitBlock → \n\n in raw Tiptap → collapsed to \n
    assert.strictEqual(serializeMarkdown('para 1\n\npara 2\n'), 'para 1\npara 2\n');
  });
});
