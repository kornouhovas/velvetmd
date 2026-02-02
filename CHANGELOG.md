# Changelog

All notable changes to the "Markdown Live Editor" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Task 4: Markdown parser and serializer utilities with round-trip testing
- `formatBytes()` utility function for human-readable file size display
- Centralized constants in `src/constants.ts`
- Comprehensive test suite for `formatBytes()` function (14 tests)
- Input validation for file size limits (10MB max)

### Changed
- Refactored editor initialization to use immutable state management pattern
- Split large functions into smaller, focused functions (all under 50 lines)
- Improved error messages to use dynamic size formatting instead of hardcoded values
- Updated markdown parser to disable raw HTML (security: XSS prevention)

### Security
- **[HIGH]** Disabled HTML passthrough in markdown-it parser to prevent XSS attacks
- Added input validation for negative numbers and edge cases in `formatBytes()`
- Enforced content size limits consistently across the application

### Fixed
- Resolved ESLint warning for oversized functions (max-lines-per-function)
- Fixed inconsistent spacing in formatted byte strings
- Added error handling for edge cases (NaN, Infinity, negative numbers)

## [0.1.0] - 2026-02-02

### Added
- Initial project setup
- Custom editor provider with bidirectional sync
- Tiptap editor integration
- Basic markdown support with StarterKit extensions

[Unreleased]: https://github.com/aleksandersk/markdown-live-editor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aleksandersk/markdown-live-editor/releases/tag/v0.1.0
