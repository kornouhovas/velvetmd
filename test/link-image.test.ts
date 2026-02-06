import './setup';
import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Markdown } from '@tiptap/markdown';

describe('Link and Image Extension Tests', () => {
  let editor: Editor;

  function createEditor(): Editor {
    return new Editor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          link: false // Disable link in StarterKit
        }),
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }),
        Image.configure({
          inline: true,
          HTMLAttributes: {
            class: 'markdown-image'
          }
        }),
        Markdown
      ],
      content: ''
    });
  }

  test('should parse simple link', () => {
    editor = createEditor();
    const markdown = '[Link text](https://example.com)';

    editor.commands.setContent(markdown, { emitUpdate: false, contentType: 'markdown' });
    const result = editor.markdown.serialize(editor.getJSON());

    console.log('Input:', markdown);
    console.log('Output:', result);
    console.log('JSON:', JSON.stringify(editor.getJSON(), null, 2));

    assert.strictEqual(result.trim(), markdown, 'Link should be preserved');
    editor.destroy();
  });

  test('should parse link with title', () => {
    editor = createEditor();
    const markdown = '[Link text](https://example.com "Link title")';

    editor.commands.setContent(markdown, { emitUpdate: false, contentType: 'markdown' });
    const result = editor.markdown.serialize(editor.getJSON());

    console.log('Input:', markdown);
    console.log('Output:', result);
    console.log('JSON:', JSON.stringify(editor.getJSON(), null, 2));

    assert.strictEqual(result.trim(), markdown, 'Link with title should be preserved');
    editor.destroy();
  });

  test('should parse simple image', () => {
    editor = createEditor();
    const markdown = '![Alt text](https://example.com/image.png)';

    editor.commands.setContent(markdown, { emitUpdate: false, contentType: 'markdown' });
    const result = editor.markdown.serialize(editor.getJSON());

    console.log('Input:', markdown);
    console.log('Output:', result);
    console.log('JSON:', JSON.stringify(editor.getJSON(), null, 2));

    assert.strictEqual(result.trim(), markdown, 'Image should be preserved');
    editor.destroy();
  });

  test('should parse image with title', () => {
    editor = createEditor();
    const markdown = '![Alt text](https://example.com/image.png "Image title")';

    editor.commands.setContent(markdown, { emitUpdate: false, contentType: 'markdown' });
    const result = editor.markdown.serialize(editor.getJSON());

    console.log('Input:', markdown);
    console.log('Output:', result);
    console.log('JSON:', JSON.stringify(editor.getJSON(), null, 2));

    assert.strictEqual(result.trim(), markdown, 'Image with title should be preserved');
    editor.destroy();
  });

  test('should parse mixed content with links and images', () => {
    editor = createEditor();
    const markdown = `# Test

[Link](https://example.com)

![Image](https://example.com/image.png)`;

    editor.commands.setContent(markdown, { emitUpdate: false, contentType: 'markdown' });
    const result = editor.markdown.serialize(editor.getJSON());

    console.log('Input:', markdown);
    console.log('Output:', result);
    console.log('JSON:', JSON.stringify(editor.getJSON(), null, 2));

    editor.destroy();
  });
});
