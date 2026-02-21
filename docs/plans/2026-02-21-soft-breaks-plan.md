# Soft Breaks Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Enter insert a line break (single `\n`) instead of a new paragraph, and make single newlines in markdown files display as visual line breaks in Velvet MD (matching the Text Editor view).

**Architecture:** Enable `breaks: true` in marked so that single `\n` within a paragraph renders as `<br>`. Add a `SoftBreaksExtension` that overrides Enter to insert `hardBreak` (serialized as `  \n`, stripped to `\n` by existing `postprocessMarkdown`). Double Enter (Enter after a trailing hardBreak) deletes the trailing hardBreak and splits the paragraph.

**Tech Stack:** Tiptap v3 (`Extension`, `Editor`), `@tiptap/core`, `@tiptap/markdown`, `@tiptap/extension-hard-break` (via StarterKit)

---

## Key Insight: No Serializer Changes Needed

`HardBreak.renderMarkdown` outputs `  \n` (two trailing spaces + newline).
`postprocessMarkdown` already strips trailing spaces: `processed.replace(/[ \t]+$/gm, '')`.
Result: `  \n` → `\n`. The round-trip works without touching `markdownSerializer.ts`.

---

## Task 1: Add `breaks: true` round-trip tests

**Files:**
- Modify: `test/roundtrip.test.ts`

### Step 1: Write the failing tests

Add a new `describe` block at the end of `test/roundtrip.test.ts` (after the closing `});` of the existing describe):

```typescript
import { serializeMarkdown } from '../src/utils/markdownSerializer';

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
```

Also add at the top of the file (after the existing imports):
```typescript
import { serializeMarkdown } from '../src/utils/markdownSerializer';
```

### Step 2: Run the tests to confirm they FAIL

```bash
npx tsx test/roundtrip.test.ts 2>&1 | tail -30
```

Expected: Tests in "Soft Break Round-trips" fail because `breaks: true` is not yet configured and soft breaks are not preserved.

### Step 3: No implementation changes yet — just confirm the test structure is correct

The tests should fail with a round-trip mismatch (e.g., `"Line 1\nLine 2\n"` becomes `"Line 1 Line 2\n"` or similar).

### Step 4: Commit the failing tests

```bash
git add test/roundtrip.test.ts
git commit -m "test: add failing soft break round-trip tests"
```

---

## Task 2: Enable `breaks: true` in the webview editor

**Files:**
- Modify: `src/editor/webview/editor.ts`

### Step 1: Add `breaks: true` to Markdown configuration

In `src/editor/webview/editor.ts`, find the `Markdown.configure(...)` block (around line 79) and change it:

```typescript
// BEFORE:
Markdown.configure({
  markedOptions: {
    gfm: true
  }
})

// AFTER:
Markdown.configure({
  markedOptions: {
    gfm: true,
    breaks: true
  }
})
```

### Step 2: Run round-trip tests to confirm soft break tests now pass

```bash
npx tsx test/roundtrip.test.ts 2>&1 | tail -30
```

Expected: The new "Soft Break Round-trips" tests PASS. Existing tests still pass.

### Step 3: Run typecheck

```bash
npm run typecheck
```

Expected: Zero errors.

### Step 4: Commit

```bash
git add src/editor/webview/editor.ts
git commit -m "feat: enable breaks:true so single newlines render as visual line breaks"
```

---

## Task 3: Add `SoftBreaksExtension` to override Enter key

**Files:**
- Modify: `src/editor/webview/editor.ts`

### Step 1: Add `Extension` to the @tiptap/core import

In `src/editor/webview/editor.ts`, change the first import line:

```typescript
// BEFORE:
import { Editor } from '@tiptap/core';

// AFTER:
import { Editor, Extension } from '@tiptap/core';
```

### Step 2: Add the `SoftBreaksExtension` definition before `createTiptapEditor`

Insert this block before the `createTiptapEditor` function (around line 40):

```typescript
/**
 * Overrides Enter to insert a soft line break (hardBreak) instead of a new paragraph.
 *
 * Behavior:
 * - Enter in a top-level paragraph → inserts hardBreak (serialized as \n via postprocessMarkdown)
 * - Double Enter (Enter when cursor is at end of paragraph and last child is hardBreak)
 *   → deletes the trailing hardBreak and splits the block (= new paragraph / blank line in file)
 * - Enter in any other context (list item, heading, code block, blockquote) → default behavior
 *
 * Why depth === 1: In ProseMirror, $from.depth is the number of ancestor nodes.
 * A cursor inside a top-level paragraph has depth 1 (doc → paragraph → cursor).
 * List/blockquote paragraphs have depth 2+.
 */
const SoftBreaksExtension = Extension.create({
  name: 'softBreaks',
  priority: 150,

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        const { $from, empty } = state.selection;

        // Only override Enter inside top-level paragraphs (depth 1 = direct child of doc)
        if ($from.parent.type.name !== 'paragraph' || $from.depth !== 1) {
          return false;
        }

        // Non-empty selection: replace with hard break
        if (!empty) {
          return this.editor.commands.setHardBreak();
        }

        const node = $from.parent;
        const offset = $from.parentOffset;

        // Double Enter: cursor at end of paragraph and last child is a hardBreak
        // → remove trailing hardBreak and create new paragraph (blank line in file)
        if (offset === node.content.size && node.lastChild?.type.name === 'hardBreak') {
          return this.editor.chain()
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                // Delete the trailing hardBreak (nodeSize = 1)
                tr.delete($from.pos - 1, $from.pos);
              }
              return true;
            })
            .splitBlock()
            .run();
        }

        // Single Enter: insert hard break (stays in same paragraph, adds \n to file)
        return this.editor.commands.setHardBreak();
      }
    };
  }
});
```

### Step 3: Register `SoftBreaksExtension` in `createTiptapEditor`

In `createTiptapEditor`, add `SoftBreaksExtension` as the **first** extension (before `StarterKit`) so it has priority when resolving keyboard conflicts:

```typescript
// BEFORE:
const editor = new Editor({
  element: editorElement,
  extensions: [
    StarterKit.configure({
      link: false
    }),
    // ... rest of extensions

// AFTER:
const editor = new Editor({
  element: editorElement,
  extensions: [
    SoftBreaksExtension,
    StarterKit.configure({
      link: false
    }),
    // ... rest of extensions
```

### Step 4: Run typecheck

```bash
npm run typecheck
```

Expected: Zero errors. If `node.lastChild?.type` causes an error, the type of `lastChild` is `ProseMirror.Node | null` — optional chaining is correct.

### Step 5: Commit

```bash
git add src/editor/webview/editor.ts
git commit -m "feat: Enter inserts soft break, double Enter creates new paragraph"
```

---

## Task 4: Build and verify

**Files:** none changed

### Step 1: Run full build

```bash
npm run build
```

Expected: Build succeeds. TypeScript errors: 0. Both `dist/extension.js` and `dist/webview.js` produced.

Note: Webpack may warn about bundle size (398KB). This is a known, pre-existing condition — ignore it.

### Step 2: Run all existing tests

```bash
npx tsx test/roundtrip.test.ts 2>&1 | tail -20
npx tsx test/constants.test.ts 2>&1 | tail -10
npx tsx test/link-image.test.ts 2>&1 | tail -10
```

Expected: All tests pass. Previously failing round-trip tests (noted in CLAUDE.md as "expected during PoC phase") may still fail — that is acceptable. The new soft-break tests must pass.

### Step 3: Manual test in VS Code

Open VS Code, press F5 to launch Extension Development Host.
Open any `.md` file in Velvet MD.

Verify:
1. **Single newline sync**: Open a file with `Line 1\nLine 2` (no blank line). Velvet MD should show them on separate lines (not merged).
2. **Enter = soft break**: Type text, press Enter once. Cursor moves to next line. File gets `\n` (verify in Text Editor side by side).
3. **Double Enter = paragraph**: Type text, press Enter twice. A blank line appears between paragraphs. File gets `\n\n`.
4. **Enter in list**: Press Enter inside a list item → creates new list item (unchanged behavior).
5. **Enter in heading**: Press Enter at end of heading → creates paragraph below (unchanged behavior).

### Step 4: Commit final verification

```bash
git add .
git commit -m "chore: verify soft breaks implementation complete"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/editor/webview/editor.ts` | Add `Extension` import; add `SoftBreaksExtension`; register it first; add `breaks: true` to marked options |
| `test/roundtrip.test.ts` | Add `serializeMarkdown` import; add `describe('Soft Break Round-trips')` block with 4 tests |

**No changes to:**
- `src/utils/markdownSerializer.ts` (existing trailing-space stripping already converts `  \n` → `\n`)
- `src/providers/markdownEditorProvider.ts`
- `src/types.ts`
