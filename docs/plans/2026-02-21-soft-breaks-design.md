# Velvet MD — Soft Breaks Mode Design

**Date:** 2026-02-21
**Scope:** Enter key behavior + single-newline visual sync with Text Editor

---

## Summary

Two coordinated changes that bring Velvet MD's editing model in line with Obsidian's default behavior:

1. **`breaks: true` parsing** — single `\n` in a markdown file renders as a visual line break (`<br>`), matching the line structure visible in VS Code's Text Editor.
2. **Enter = soft break** — pressing Enter inserts a line break within the current paragraph (not a new paragraph). Double Enter creates a new paragraph (blank line in file).

---

## Problem

Currently:
- Enter in Velvet MD creates a new `<p>` element → serialized as `\n\n` (blank line) in the file
- Single `\n` between two lines in the file renders as a single flowing paragraph in Velvet MD
- This diverges from the Text Editor view where each line is visually distinct

Desired behavior (Obsidian-style):
- Single `\n` in the file → visual line break in Velvet MD
- Enter → `\n` in the file (soft break within paragraph)
- Enter+Enter → `\n\n` in the file (new paragraph)

---

## Approach: Soft Breaks Mode

### Component 1 — `breaks: true` in marked parser (`editor.ts`)

```typescript
Markdown.configure({
  markedOptions: {
    gfm: true,
    breaks: true   // ← NEW
  }
})
```

**Effect:** When loading a markdown file, the marked parser treats single `\n` within a paragraph block as a `<br>` element. Tiptap maps `<br>` to a `hardBreak` node. This automatically synchronizes how lines appear between Text Editor and Velvet MD.

### Component 2 — Enter key override (`editor.ts`)

A custom Tiptap `Extension` overrides the Enter keyboard shortcut:

```
Enter pressed →
  ├── cursor at end of paragraph AND last child is hardBreak?
  │     → delete trailing hardBreak + splitBlock()   [= new paragraph / blank line]
  └── otherwise
        → setHardBreak()                              [= line break / single \n]
```

ProseMirror detection logic:
- "Cursor at end": `$from.parentOffset === $from.parent.content.size`
- "Last child is hardBreak": `$from.parent.lastChild?.type.name === 'hardBreak'`

Edge cases:
- Non-empty selection + Enter → `setHardBreak()` (replaces selection with line break)
- Enter inside a list item → default behavior (Tiptap handles lists correctly; we only override inside regular paragraphs)
- Enter inside code block → default behavior (code blocks handle their own Enter)

### Component 3 — HardBreak serialization (`markdownSerializer.ts`)

`@tiptap/markdown` serializes `hardBreak` nodes as `\\\n` (backslash-newline, standard CommonMark hard break). We need plain `\n` so that:
- The file stays clean (no trailing backslashes)
- Round-trip works: `\n` → `breaks: true` → `<br>` → `hardBreak` → `\n`

Implementation: add a step in `postprocessMarkdown` that replaces `\\\n` with `\n`.

```typescript
// Replace hard break markers with plain newlines
processed = processed.replace(/\\\n/g, '\n');
```

This is safe because `\` at the end of a line in markdown is specifically the hard break syntax — it has no other meaning in that position.

---

## Round-trip Example

### File content

```
Line 1
Line 2

New paragraph
```

### Tiptap internal model

```
doc
├── paragraph
│   ├── text "Line 1"
│   ├── hardBreak
│   └── text "Line 2"
└── paragraph
    └── text "New paragraph"
```

### Serialization pipeline

1. `@tiptap/markdown` serializes → `"Line 1\\\nLine 2\n\nNew paragraph\n"`
2. `postprocessMarkdown` replaces `\\\n` → `\n` → `"Line 1\nLine 2\n\nNew paragraph\n"`
3. `normalizeMarkdownWhitespace` (no change, max one blank line) → unchanged

### Loading pipeline

1. `marked` with `breaks: true` parses `"Line 1\nLine 2"` → `"Line 1<br>Line 2"`
2. Tiptap maps `<br>` → `hardBreak` node
3. Result: paragraph with `[text "Line 1", hardBreak, text "Line 2"]`

---

## Files Changed

| File | Change |
|------|--------|
| `src/editor/webview/editor.ts` | Add custom Enter Extension; add `breaks: true` to marked options |
| `src/utils/markdownSerializer.ts` | Add `\\\n` → `\n` replacement in `postprocessMarkdown` |
| `test/roundtrip.test.ts` | Add test cases for soft break round-trips |

---

## Testing

New test cases in `test/roundtrip.test.ts`:

| Input | Expected output |
|-------|----------------|
| `"Line 1\nLine 2\n"` | `"Line 1\nLine 2\n"` (round-trip preserved) |
| `"Para 1\n\nPara 2\n"` | `"Para 1\n\nPara 2\n"` (paragraph break preserved) |
| `"A\nB\n\nC\nD\n"` | `"A\nB\n\nC\nD\n"` (mixed) |

---

## Non-goals

- No changes to Shift+Enter behavior
- No changes to Enter behavior inside lists, code blocks, blockquotes, headings
- No UI settings added (behavior is unconditional)
