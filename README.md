# Velvet MD

> Obsidian-like live preview editor for Markdown in VS Code

## Status

🚧 **Pre-Development (PoC Phase)** - v0.1.0-alpha

## Overview

VS Code extension providing Obsidian-like live preview editing for Markdown files with WYSIWYG interface. Uses Tiptap (ProseMirror wrapper) with bidirectional synchronization between the editor and VS Code's text document model.

## Key Features

- ✨ **Live Preview Mode** - WYSIWYG editing with instant formatting
- 🔄 **Bidirectional Sync** - Maintains round-trip fidelity between markdown text and editor state
- 🎯 **Dual-Bundle Architecture** - Separate compilation targets for extension host and webview
- 🔒 **Security** - Strict CSP with cryptographic nonces, XSS prevention
- ⚡ **Performance** - Optimized for files up to 10MB with debounced updates

## Architecture

### Dual-Bundle System

Two independent compilation targets:

1. **Extension Bundle** (`dist/extension.js`)
   - Target: Node.js
   - Environment: VS Code Extension Host
   - Manages document synchronization and VS Code API integration

2. **Webview Bundle** (`dist/webview.js`)
   - Target: Web/Browser
   - Environment: VS Code Webview (isolated iframe)
   - Handles Tiptap editor and message-based communication

### Synchronization Flow

```
VS Code Document (plain text .md)
        ↕ (debounced 300ms)
MarkdownEditorProvider (extension host)
        ↕ (postMessage)
Tiptap Editor (webview)
```

## Tech Stack

- **Editor:** Tiptap (ProseMirror wrapper)
- **Markdown Parser:** markdown-it
- **Language:** TypeScript
- **Build:** Webpack (dual-bundle configuration)
- **Testing:** Node.js test runner + JSDOM

## Development

### Prerequisites

- VS Code 1.80+
- Node.js 20+
- npm

### Commands

```bash
# Install dependencies
npm install

# Development with watch mode
npm run watch

# Type checking (required before commits)
npm run typecheck

# Linting
npm run lint

# Production build
npm run compile

# Full build pipeline
npm run build

# Run tests
npx tsx test/<filename>.test.ts
```

### Project Structure

```
src/
├── extension.ts                    # Extension entry point
├── providers/
│   └── markdownEditorProvider.ts   # Custom editor provider (236 lines)
├── editor/
│   └── webview/
│       └── editor.ts               # Tiptap initialization (150 lines)
├── utils/
│   ├── markdownParser.ts           # Markdown → AST (142 lines)
│   ├── markdownSerializer.ts       # AST → Markdown (165 lines)
│   └── debounce.ts                 # Debouncing utility
├── constants.ts                    # Centralized constants
└── types.ts                        # Message protocol types

test/
├── setup.ts                        # JSDOM configuration
├── roundtrip.test.ts               # Round-trip fidelity tests (26 cases)
└── constants.test.ts               # Utility function tests (14 tests)

media/
└── webview/
    └── styles.css                  # Editor styling
```

## Configuration

Available settings (`package.json` → `contributes.configuration`):

- `showSyntaxOnFocus` (boolean, default: true) - Show markdown syntax when editing
- `autoReloadOnExternalChanges` (boolean, default: true) - Auto-reload on external edits
- `virtualizationThreshold` (number, default: 512000) - Performance threshold for large files

## Testing

### Running Tests

```bash
# Round-trip conversion tests
npx tsx test/roundtrip.test.ts

# Utility function tests
npx tsx test/constants.test.ts
```

Tests use Node.js built-in test runner with JSDOM for DOM simulation.

## Quality Standards

All code must pass:
- ✅ **Type checking:** `npm run typecheck` (0 errors)
- ✅ **Linting:** `npm run lint` (0 errors, warnings justified)
- ✅ **Compilation:** `npm run compile` (must succeed)

## Known Limitations

1. **Round-trip Tests:** Some tests currently fail - this is expected during PoC phase. The actual implementation uses `serializeMarkdown()` utility which fixes these issues.

2. **Webview Bundle Size:** 398KB (exceeds webpack recommendation of 244KB) - acceptable for rich text editor with Tiptap dependencies.

## Debugging

Extension logs available via:
```typescript
this.logger = vscode.window.createOutputChannel('Velvet MD');
this.logger.appendLine('Debug message');
```

View logs: VS Code → Output panel → "Velvet MD"

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Detailed architecture and development guide
- [CHANGELOG.md](./CHANGELOG.md) - Version history

## License

TBD

---

**Version:** 0.1.0-alpha
**Last Updated:** 2026-02-07
