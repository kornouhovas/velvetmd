import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { addBlankLinePlaceholders } from '../src/utils/blankLinePlaceholders';
import { serializeMarkdown } from '../src/utils/markdownSerializer';

describe('addBlankLinePlaceholders', () => {
  it('inserts ZWS paragraph for a single blank line between paragraphs', () => {
    const input = 'Para 1\n\nPara 2\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, 'Para 1\n\n\u200B\n\nPara 2\n');
  });

  it('inserts two ZWS paragraphs for two consecutive blank lines', () => {
    const input = 'Para 1\n\n\nPara 2\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, 'Para 1\n\n\u200B\n\n\u200B\n\nPara 2\n');
  });

  it('inserts three ZWS paragraphs for three blank lines', () => {
    const input = 'Para 1\n\n\n\nPara 2\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, 'Para 1\n\n\u200B\n\n\u200B\n\n\u200B\n\nPara 2\n');
  });

  it('handles multiple paragraph separators in a document', () => {
    const input = 'A\n\nB\n\nC\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, 'A\n\n\u200B\n\nB\n\n\u200B\n\nC\n');
  });

  it('does not modify trailing POSIX newline', () => {
    const input = 'Solo paragraph\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, 'Solo paragraph\n');
  });

  it('does not insert ZWS inside fenced code blocks', () => {
    const input = '```\nline 1\n\nline 2\n```\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, '```\nline 1\n\nline 2\n```\n');
  });

  it('inserts ZWS before and after code blocks but not inside them', () => {
    const input = 'Before\n\n```\ncode\n\nmore code\n```\n\nAfter\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, 'Before\n\n\u200B\n\n```\ncode\n\nmore code\n```\n\n\u200B\n\nAfter\n');
  });

  it('handles empty string', () => {
    assert.equal(addBlankLinePlaceholders(''), '');
  });

  it('handles content with no blank lines', () => {
    const input = 'Line 1\nLine 2\nLine 3\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, 'Line 1\nLine 2\nLine 3\n');
  });

  it('does not insert ZWS inside tilde-fenced code blocks', () => {
    const input = '~~~\nline 1\n\nline 2\n~~~\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, '~~~\nline 1\n\nline 2\n~~~\n');
  });

  it('does not close a backtick fence with a tilde fence marker', () => {
    // ``` opens; ~~~ must NOT close it — blank line after ~~~ is still inside the block
    const input = '```\ncode\n~~~\n\nstill inside\n```\n';
    const result = addBlankLinePlaceholders(input);
    assert.equal(result, '```\ncode\n~~~\n\nstill inside\n```\n');
  });
});

describe('serializeMarkdown strips ZWS placeholders (full pipeline)', () => {
  it('removes ZWS placeholder and normalizes blank lines', () => {
    // Simulates raw output from @tiptap/markdown after loading content with ZWS
    const raw = 'Para 1\n\n\u200B\n\nPara 2\n\n';
    const result = serializeMarkdown(raw);
    assert.equal(result, 'Para 1\n\nPara 2\n');
  });

  it('removes multiple ZWS placeholders without affecting content', () => {
    const raw = 'A\n\n\u200B\n\nB\n\n\u200B\n\nC\n\n';
    const result = serializeMarkdown(raw);
    assert.ok(!result.includes('\u200B'), 'ZWS should be stripped');
    assert.equal(result, 'A\n\nB\n\nC\n');
  });
});
