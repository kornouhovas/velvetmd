import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  postprocessMarkdown,
  normalizeMarkdownWhitespace,
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

  test('collapses 4+ consecutive newlines to 3', () => {
    assert.strictEqual(postprocessMarkdown('a\n\n\n\nb'), 'a\n\n\nb\n');
  });

  test('adds POSIX trailing newline', () => {
    assert.strictEqual(postprocessMarkdown('hello'), 'hello\n');
  });

  test('returns empty string for empty/invalid input', () => {
    assert.strictEqual(postprocessMarkdown(''), '');
    assert.strictEqual(postprocessMarkdown('   '), '');
  });
});

describe('normalizeMarkdownWhitespace', () => {
  test('collapses 3+ consecutive newlines to 2 (1 blank line)', () => {
    assert.strictEqual(normalizeMarkdownWhitespace('a\n\n\nb'), 'a\n\nb');
  });

  test('does not change content with single blank line', () => {
    assert.strictEqual(normalizeMarkdownWhitespace('a\n\nb'), 'a\n\nb');
  });

  test('returns empty string for empty/invalid input', () => {
    assert.strictEqual(normalizeMarkdownWhitespace(''), '');
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
});
