# Changelog

## [0.3.0] - 2026-02-23

### Added

- **Soft line breaks** — Enter in a paragraph inserts a soft break (`\n` in file); double Enter creates a new paragraph (blank line in file). Replaces the previous behaviour where Enter always created a new block.
- **Blank line navigation** — blank lines in the file are now navigable with arrow keys in the editor. Each blank line is represented as a zero-width space paragraph node in ProseMirror.
- `addBlankLinePlaceholders` utility with fenced code block detection (tracks opening fence character per CommonMark §4.5)
- `validateLinkHref` utility — URL allowlist (https/http/mailto, case-insensitive), blocks `mailto:javascript:` scheme injection, null bytes, and newlines
- `isValidScrollDimension` utility — rejects NaN, Infinity, and negative scroll values before storage
- NaN/Infinity guards in `scrollStateToLine` and `lineToScrollState`
- `scrollRestoreLine` message input validation (line, totalLines)
- Integration tests for blank line navigation and round-trip fidelity
- Tests for link URL validation (15 cases), scroll NaN/Infinity guards (6 new cases), scroll dimension validation (6 cases)

### Fixed

- **Multiple blank lines** preserved correctly on round-trip (5 blank lines → 5 blank lines, not 1). `normalizeMarkdownWhitespace` now halves `\n{4+}` sequences instead of collapsing to 2.
- **Enter in empty paragraph** no longer requires two presses to move down — single Enter goes directly to `splitBlock`.
- **Jitter on typing** — scroll restoration only fires when content actually changed (genuine external edit), not on echoed updates.
- **`mailto:javascript:`** scheme injection blocked in link validator (case-insensitive).
- Mismatched fence markers (`\`\`\`` opened, `~~~` encountered) no longer incorrectly toggle fenced-code-block state.
- Stale test expectation in `normalizeMarkdownWhitespace` tests updated to match halving formula.

### Changed

- `WEBVIEW_UPDATE_COOLDOWN_MS`: 500ms → 1000ms (adds ~770ms safety buffer; trade-off documented)
- `DOCUMENT_CHANGE_DEBOUNCE_MS`: 300ms → 150ms
- `onUpdate` callback debounce: new 30ms delay before serialization + IPC
- All block elements in editor set to `margin: 0` to match VS Code text editor density
- Explicit `Math.floor` in `normalizeMarkdownWhitespace` repeat call

## [0.2.0] - 2026-02-18

### Added

- **Bidirectional scroll sync** between Velvet MD and Text Editor - switching editors preserves scroll position in both directions
- **Configuration support** - extension reads `showSyntaxOnFocus` and `autoReloadOnExternalChanges` settings and applies them at runtime
- Unit tests for provider utilities (`isWithinCooldown`, `isEchoContent`)
- Unit tests for scroll conversion functions (`lineToScrollState`, `scrollStateToLine`)
- Unit tests for markdown serializer (`postprocessMarkdown`, `normalizeMarkdownWhitespace`)

### Fixed

- Scroll position centered instead of at the top when switching from Text Editor to Velvet MD
- `scrollSync` messages triggered spurious WARN log in the output channel
- `scrollRestoreLine` read DOM dimensions before browser layout (race condition)

### Changed

- Refactored `normalizeMarkdownWhitespace` to single responsibility (paragraph spacing only)
- Extracted `isWithinCooldown` and `isEchoContent` into pure utility functions
- Unified scroll conversion model - both `lineToScrollState` and `scrollStateToLine` now use the same formula: `line N is at pixel (N / totalLines) * scrollHeight`

## [0.1.0] - 2026-02-17

### Added

- Initial release
- WYSIWYG Markdown editing with Tiptap/ProseMirror
- Bidirectional sync between editor and VS Code document model
- Focus mode with markdown syntax reveal
- Support for headings, bold, italic, links, images, code blocks, tables, task lists, blockquotes
- In-place editor toggle between Text Editor and Velvet MD
- Content Security Policy with nonce-based script loading
- 10MB content size limit
