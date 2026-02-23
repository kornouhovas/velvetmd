import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { validateLinkHref } from '../src/utils/linkValidator';

describe('validateLinkHref', () => {
  describe('allowed schemes', () => {
    test('allows https:// links', () => {
      assert.strictEqual(validateLinkHref('https://example.com'), true);
    });

    test('allows http:// links', () => {
      assert.strictEqual(validateLinkHref('http://example.com'), true);
    });

    test('allows mailto: links', () => {
      assert.strictEqual(validateLinkHref('mailto:user@example.com'), true);
    });

    test('allows HTTPS:// (uppercase scheme)', () => {
      assert.strictEqual(validateLinkHref('HTTPS://example.com'), true);
    });

    test('allows HTTP:// (uppercase scheme)', () => {
      assert.strictEqual(validateLinkHref('HTTP://example.com'), true);
    });

    test('allows MAILTO: (uppercase scheme)', () => {
      assert.strictEqual(validateLinkHref('MAILTO:user@example.com'), true);
    });
  });

  describe('blocked schemes', () => {
    test('blocks javascript: scheme', () => {
      assert.strictEqual(validateLinkHref('javascript:alert(1)'), false);
    });

    test('blocks mailto:javascript: (scheme injection via mailto)', () => {
      assert.strictEqual(validateLinkHref('mailto:javascript:alert(1)'), false);
    });

    test('blocks data: scheme', () => {
      assert.strictEqual(validateLinkHref('data:text/html,<script>evil()</script>'), false);
    });

    test('blocks file:// scheme', () => {
      assert.strictEqual(validateLinkHref('file:///etc/passwd'), false);
    });

    test('blocks vscode-resource: scheme', () => {
      assert.strictEqual(validateLinkHref('vscode-resource://internal'), false);
    });
  });

  describe('malformed inputs', () => {
    test('blocks href with null byte', () => {
      assert.strictEqual(validateLinkHref('https://example.com\0evil'), false);
    });

    test('blocks href with newline', () => {
      assert.strictEqual(validateLinkHref('https://example.com\nevil'), false);
    });

    test('blocks href with carriage return', () => {
      assert.strictEqual(validateLinkHref('https://example.com\revil'), false);
    });

    test('blocks empty string', () => {
      assert.strictEqual(validateLinkHref(''), false);
    });
  });
});
