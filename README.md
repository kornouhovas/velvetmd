# Velvet MD

> Obsidian-like live preview editor for Markdown in VS Code

## Status

🚧 **Pre-Development (PoC Phase)** - v0.1.0-alpha

This extension is in early development. Features and API may change.

## Features

**Velvet MD** brings a WYSIWYG-style editing experience to Markdown files in VS Code, similar to Obsidian's live preview mode.

- **Live Preview Editing** - See formatted text as you type with instant visual feedback
- **Supported Markdown Elements:**
  - Headings (H1-H6)
  - Text formatting (bold, italic, strikethrough)
  - Links and images
  - Code blocks with syntax highlighting
  - Tables
  - Task lists with checkboxes
  - Blockquotes
  - Horizontal rules
  - Ordered and unordered lists
- **Bidirectional Sync** - Changes sync seamlessly between the editor and file system
- **Focus Mode** - Show markdown syntax only when editing a block
- **Large File Support** - Optimized for files up to 10MB

## Usage

### Opening Files

Right-click any `.md` file in VS Code and select:
- **"Open With..."** → **"Velvet MD"**

Or set Velvet MD as the default editor for Markdown files:
1. Right-click a `.md` file
2. Select **"Open With..."**
3. Choose **"Velvet MD"**
4. Click **"Configure default editor for '*.md'..."**

### Editing

- Click anywhere to start editing
- Press Escape to exit focus mode
- Changes save automatically to the file

## Configuration

Configure the extension in VS Code settings (File → Preferences → Settings):

- **`velvetMd.showSyntaxOnFocus`** (default: `true`)
  Show markdown syntax when cursor is in a block

- **`velvetMd.autoReloadOnExternalChanges`** (default: `true`)
  Automatically reload file when it changes externally (e.g., git operations)

- **`velvetMd.virtualizationThreshold`** (default: `512000`)
  File size threshold in bytes for enabling virtualization (500KB)

## Development

### Prerequisites

- VS Code 1.80 or higher
- Node.js 20 or higher
- npm

### Commands

```bash
# Install dependencies
npm install

# Development with watch mode (auto-recompile on changes)
npm run watch

# Type checking (required before commits)
npm run typecheck

# Linting
npm run lint

# Production build
npm run compile

# Full build pipeline (typecheck + lint + compile)
npm run build

# Run tests
npx tsx test/constants.test.ts
npx tsx test/roundtrip.test.ts
npx tsx test/link-image.test.ts
```

### Testing in VS Code

1. Open this project in VS Code
2. Press F5 to launch Extension Development Host
3. Open any `.md` file
4. Right-click → "Open With..." → "Velvet MD"

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Architecture and implementation details
- [CHANGELOG.md](./CHANGELOG.md) - Version history

## License

MIT - See [LICENSE](./LICENSE) file for details
