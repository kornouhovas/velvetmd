# Changelog

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
