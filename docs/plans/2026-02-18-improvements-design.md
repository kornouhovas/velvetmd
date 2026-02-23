# Velvet MD — Improvements Design

**Date:** 2026-02-18
**Branch:** feat/scroll-rework
**Scope:** Approach C — practical improvements (no drag-and-drop, no virtualization)

---

## Summary

Four improvement blocks targeting code quality, configuration wiring, bidirectional scroll sync, and provider unit tests.

---

## Block 1 — `serializeMarkdown` Refactor

**Problem:** `postprocessMarkdown` and `normalizeMarkdownWhitespace` both perform CRLF normalization and trailing whitespace removal — double processing.

**Solution:** Clean up the pipeline with clear responsibilities:

- `postprocessMarkdown` — removes `&nbsp;`, CRLF→LF, trailing whitespace, excessive blank lines, ensures POSIX trailing newline
- `normalizeMarkdownWhitespace` — only paragraph spacing normalization (remove redundant CRLF/whitespace steps already handled above)
- `serializeMarkdown` — calls both in sequence

**New file:** `test/markdownSerializer.test.ts` — unit tests for the serialization pipeline.

---

## Block 2 — Configuration Reading

**Settings read from** `vscode.workspace.getConfiguration('velvetMd')`:

### `autoReloadOnExternalChanges` (boolean, default: true)

- Location: `markdownEditorProvider.ts`, `setupDocumentChangeHandling`
- When `false`: skip `sendDocumentToWebview` on external edits
- Config is re-read on each change event (supports runtime changes via VS Code settings)

### `showSyntaxOnFocus` (boolean, default: true)

- Location: passed to webview via a new `ConfigMessage` on editor init and on config change
- Webview stores the flag and passes it to Tiptap (stub — wiring without full Tiptap extension implementation)
- Message type: `{ type: 'config', showSyntaxOnFocus: boolean }`

---

## Block 3 — Bidirectional Scroll Sync

### New message types (`types.ts`)

```typescript
// Webview → Extension
ScrollSyncMessage { type: 'scrollSync'; scrollTop: number; scrollHeight: number; viewportHeight: number }

// Extension → Webview
// NOTE: Implemented as scrollRestoreLine (line-based) rather than scrollRestore (pixel-based).
// Line-based is more robust: pixel offsets change when the webview reflows,
// but a line number is stable across layout changes.
ScrollRestoreLineMessage { type: 'scrollRestoreLine'; line: number; totalLines: number }

// Extension → Webview (updated)
ConfigMessage { type: 'config'; showSyntaxOnFocus: boolean }
```

### `scrollUtils.ts` — new function

```typescript
lineToScrollState(line, totalLines, scrollHeight, viewportHeight) → scrollTop
```

Inverse of `scrollStateToLine`. Maps a 0-based line index to a `scrollTop` pixel offset.

### Webview (`editor.ts`)

- **Throttled scroll listener** (100ms): reads `document.documentElement.scrollTop / scrollHeight / clientHeight`, emits `scrollSync`
- **On `scrollRestoreLine`**: converts `{line, totalLines}` → `scrollTop` via `lineToScrollState`, then `window.scrollTo({ top: scrollTop, behavior: 'instant' })`; inputs validated (`Number.isFinite`, non-negative)
- **On `config`**: store `showSyntaxOnFocus` flag for future use

### Extension (`markdownEditorProvider.ts`)

- `lastScrollTop` map per document (like `lastUpdates`)
- **On `scrollSync**`: compute line via `scrollStateToLine`, store `scrollTop`, log
- **On external reload** (`sendDocumentToWebview`): include `scrollTop` in message or send separate `scrollRestore` after
- `**velvetMd.openWithVelvet` command** (in `extension.ts`): capture `activeTextEditor?.visibleRanges[0].start.line`, convert via `lineToScrollState` (using placeholder scrollHeight/viewport), send `scrollRestore` to webview

---

## Block 4 — Provider Unit Tests

VS Code API cannot be trivially mocked with the current Node.js test runner setup.

**Solution:** Extract pure, side-effect-free helper functions from `markdownEditorProvider.ts`:

```typescript
// src/utils/providerUtils.ts
isWithinCooldown(timestamp: number, now: number, cooldown: number): boolean
isEchoContent(content: string, lastContent: string): boolean
```

**New test file:** `test/providerUtils.test.ts`

---

## Files Changed

| File                                      | Change                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `src/utils/markdownSerializer.ts`         | Remove duplicate CRLF/whitespace logic from `normalizeMarkdownWhitespace` |
| `src/utils/scrollUtils.ts`                | Add `lineToScrollState` function                                          |
| `src/utils/providerUtils.ts`              | New file — extracted pure functions                                       |
| `src/types.ts`                            | Add `ScrollSyncMessage`, `ScrollRestoreMessage`, `ConfigMessage`          |
| `src/providers/markdownEditorProvider.ts` | Config reading, scroll state tracking, scroll restore                     |
| `src/editor/webview/editor.ts`            | Scroll listener, scroll restore handler, config handler                   |
| `src/extension.ts`                        | Pass scroll position on `openWithVelvet`                                  |
| `test/markdownSerializer.test.ts`         | New — serializer pipeline tests                                           |
| `test/scrollUtils.test.ts`                | Add `lineToScrollState` tests                                             |
| `test/providerUtils.test.ts`              | New — pure provider logic tests                                           |
