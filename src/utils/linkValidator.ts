/**
 * Link URL validation for the Tiptap Link extension.
 *
 * Prevents XSS via javascript: URIs and blocks other dangerous schemes.
 * Used as the `validate` callback in Link.configure().
 */

/**
 * Returns true only for safe, allowlisted URL schemes.
 *
 * Blocked:
 * - javascript: (XSS)
 * - mailto:javascript: (scheme injection — colon after the address target)
 * - data: (arbitrary content injection)
 * - file:, vscode-resource:, vscode-webview-resource: (local resource access)
 * - Null bytes and newlines (parser confusion attacks)
 */
export function validateLinkHref(href: string): boolean {
  if (!href) {
    return false;
  }

  // Reject null bytes and newlines — can confuse URL parsers
  if (/[\0\r\n]/.test(href)) {
    return false;
  }

  // Allow only https://, http://, and mailto: schemes.
  // Negative lookahead (?![a-z]+:) after "mailto:" blocks scheme injection:
  // "mailto:javascript:..." has a scheme-like token after the colon → rejected.
  // "mailto:user@example.com" does not → allowed.
  return /^(https?:\/\/|mailto:(?![a-z]+:))/.test(href);
}
