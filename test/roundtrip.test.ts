import './setup';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { serializeMarkdown } from '../src/utils/markdownSerializer';

/**
 * Round-trip Markdown Tests
 *
 * These tests verify that markdown → Tiptap → markdown conversion
 * preserves the original formatting without data loss.
 *
 * Critical for ensuring FR-1 requirement: "Round-trip Markdown (сохранение форматирования)"
 */

describe('Markdown Round-trip Conversion', () => {
  let editor: Editor;

  beforeEach(() => {
    const element = document.createElement('div');
    editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] }
        }),
        TaskList.configure({
          HTMLAttributes: {
            class: 'task-list'
          }
        }),
        TaskItem.configure({
          nested: true
        }),
        Markdown.configure({
          markedOptions: {
            gfm: true
          }
        })
      ],
      content: '',
      contentType: 'markdown'
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  /**
   * Helper function to test round-trip conversion
   */
  const testRoundTrip = (markdown: string, description: string) => {
    it(description, () => {
      // Set markdown content
      editor.commands.setContent(markdown, {
        emitUpdate: false,
        contentType: 'markdown'
      });

      // Serialize back to markdown
      const result = editor.markdown.serialize(editor.getJSON());

      // Normalize whitespace for comparison
      const normalized = (str: string) =>
        str
          .trim()
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/&nbsp;/g, '');

      assert.equal(
        normalized(result),
        normalized(markdown),
        `Round-trip failed:\nExpected: ${markdown}\nGot: ${result}`
      );
    });
  };

  // Test 1: Headings (all levels)
  testRoundTrip(
    '# Heading 1\n\n## Heading 2\n\n### Heading 3\n\n#### Heading 4\n\n##### Heading 5\n\n###### Heading 6',
    'should preserve all heading levels (h1-h6)'
  );

  // Test 2: Bold text
  testRoundTrip(
    '**This is bold text**',
    'should preserve bold formatting'
  );

  // Test 3: Italic text
  testRoundTrip(
    '*This is italic text*',
    'should preserve italic formatting'
  );

  // Test 4: Combined bold and italic
  testRoundTrip(
    '**bold _and italic_**',
    'should preserve combined bold and italic formatting'
  );

  // Test 5: Inline code
  testRoundTrip(
    'This is `inline code` in a sentence.',
    'should preserve inline code'
  );

  // Test 6: Code block
  testRoundTrip(
    '```javascript\nconst x = 42;\nconsole.log(x);\n```',
    'should preserve code blocks with language'
  );

  // Test 7: Unordered list
  testRoundTrip(
    '- Item 1\n- Item 2\n- Item 3',
    'should preserve unordered lists'
  );

  // Test 8: Ordered list
  testRoundTrip(
    '1. First item\n2. Second item\n3. Third item',
    'should preserve ordered lists'
  );

  // Test 9: Nested lists
  testRoundTrip(
    '- Item 1\n  - Nested 1.1\n    - Nested 1.1.1\n- Item 2',
    'should preserve nested lists'
  );

  // Test 10: Mixed nested lists
  testRoundTrip(
    '1. First\n   - Bullet 1\n   - Bullet 2\n2. Second',
    'should preserve mixed nested lists (ordered + unordered)'
  );

  // Test 11: Links
  testRoundTrip(
    '[Link text](https://example.com)',
    'should preserve links'
  );

  // Test 12: Links with title
  testRoundTrip(
    '[Link text](https://example.com "Link title")',
    'should preserve links with titles'
  );

  // Test 13: Blockquote
  testRoundTrip(
    '> This is a quote\n> spanning multiple lines',
    'should preserve blockquotes'
  );

  // Test 14: Nested blockquote
  testRoundTrip(
    '> Level 1\n>> Level 2\n>>> Level 3',
    'should preserve nested blockquotes'
  );

  // Test 15: Horizontal rule
  testRoundTrip(
    'Text before\n\n---\n\nText after',
    'should preserve horizontal rules'
  );

  // Test 16: Whitespace preservation (paragraphs)
  testRoundTrip(
    'Paragraph 1.\n\nParagraph 2.\n\n\nParagraph 3 (two blank lines above).',
    'should preserve paragraph spacing'
  );

  // Test 17: Complex mixed content
  testRoundTrip(
    '# Title\n\nThis is **bold** and *italic* text with `code`.\n\n- List item 1\n- List item 2\n\n> A quote\n\n[A link](https://example.com)',
    'should preserve complex mixed content'
  );

  // Test 18: Empty heading
  testRoundTrip(
    '# \n\nContent',
    'should preserve empty headings'
  );

  // Test 19: Multiple inline formatting
  testRoundTrip(
    '**Bold** *italic* `code` [link](url)',
    'should preserve multiple inline formatting in one line'
  );

  // Test 20: Code block without language
  testRoundTrip(
    '```\nPlain code block\nno language specified\n```',
    'should preserve code blocks without language'
  );

  // Test 21: Hard breaks
  testRoundTrip(
    'Line 1  \nLine 2  \nLine 3',
    'should preserve hard line breaks (two spaces)'
  );

  // Test 22: Strike-through (if supported)
  testRoundTrip(
    '~~strikethrough text~~',
    'should preserve strikethrough'
  );

  // Test 23: Task lists with GFM enabled
  testRoundTrip(
    '- [ ] Unchecked task\n- [x] Checked task',
    'should preserve task lists with checkboxes'
  );

  // Test 24: Multiple paragraphs with inline formatting
  testRoundTrip(
    'First **bold** paragraph.\n\nSecond *italic* paragraph.\n\nThird `code` paragraph.',
    'should preserve multiple paragraphs with different inline formatting'
  );

  // Test 25: Edge case - only whitespace
  it('should handle whitespace-only content', () => {
    editor.commands.setContent('   \n\n   ', {
      emitUpdate: false,
      contentType: 'markdown'
    });
    const result = editor.markdown.serialize(editor.getJSON());
    const cleaned = result.replace(/&nbsp;/g, '').trim();
    assert.equal(cleaned, '', 'Whitespace-only content should serialize to empty string');
  });

  // Test 26: Edge case - empty content
  it('should handle empty content', () => {
    editor.commands.setContent('', {
      emitUpdate: false,
      contentType: 'markdown'
    });
    const result = editor.markdown.serialize(editor.getJSON());
    const cleaned = result.replace(/&nbsp;/g, '').trim();
    assert.equal(cleaned, '', 'Empty content should serialize to empty string');
  });
});

describe('Soft Break Round-trips (breaks: true)', () => {
  let breaksEditor: Editor;

  beforeEach(() => {
    const element = document.createElement('div');
    breaksEditor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] }
        }),
        Markdown.configure({
          markedOptions: {
            gfm: true,
            breaks: true
          }
        })
      ],
      content: '',
      contentType: 'markdown'
    });
  });

  afterEach(() => {
    breaksEditor.destroy();
  });

  const testSoftBreakRoundTrip = (input: string, expected: string, description: string) => {
    it(description, () => {
      breaksEditor.commands.setContent(input, {
        emitUpdate: false,
        contentType: 'markdown'
      });
      const raw = breaksEditor.markdown.serialize(breaksEditor.getJSON());
      const result = serializeMarkdown(raw);
      assert.equal(result, expected, `Round-trip failed:\nInput:    ${JSON.stringify(input)}\nExpected: ${JSON.stringify(expected)}\nGot:      ${JSON.stringify(result)}`);
    });
  };

  testSoftBreakRoundTrip(
    'Line 1\nLine 2\n',
    'Line 1\nLine 2\n',
    'should preserve single newline as soft break'
  );

  testSoftBreakRoundTrip(
    'Para 1\n\nPara 2\n',
    'Para 1\n\nPara 2\n',
    'should preserve blank line as paragraph separator'
  );

  testSoftBreakRoundTrip(
    'A\nB\n\nC\nD\n',
    'A\nB\n\nC\nD\n',
    'should preserve mixed soft breaks and paragraph separators'
  );

  testSoftBreakRoundTrip(
    'Single line\n',
    'Single line\n',
    'should preserve single-line paragraph without soft break'
  );
});
