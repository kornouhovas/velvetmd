import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { isWithinCooldown, isEchoContent, isValidScrollDimension } from '../src/utils/providerUtils';

describe('isWithinCooldown', () => {
  test('returns true when within cooldown window', () => {
    assert.strictEqual(isWithinCooldown(1000, 1200, 500), true);
  });

  test('returns false when cooldown has expired', () => {
    assert.strictEqual(isWithinCooldown(1000, 1600, 500), false);
  });

  test('returns false when exactly at the cooldown boundary', () => {
    // timeSince = 500, cooldown = 500: NOT within (strict <)
    assert.strictEqual(isWithinCooldown(1000, 1500, 500), false);
  });

  test('returns true for very recent update (1ms ago)', () => {
    assert.strictEqual(isWithinCooldown(1000, 1001, 500), true);
  });

  test('returns false for zero-cooldown (always expired)', () => {
    assert.strictEqual(isWithinCooldown(1000, 1000, 0), false);
  });
});

describe('isEchoContent', () => {
  test('returns true when content exactly matches last webview content', () => {
    assert.strictEqual(isEchoContent('# Hello\n', '# Hello\n'), true);
  });

  test('returns false when content differs', () => {
    assert.strictEqual(isEchoContent('# Hello\n', '# World\n'), false);
  });

  test('returns false when current is empty and last is not', () => {
    assert.strictEqual(isEchoContent('', '# Hello\n'), false);
  });

  test('returns true when both are empty', () => {
    assert.strictEqual(isEchoContent('', ''), true);
  });

  test('returns false when last content is undefined (no previous webview update)', () => {
    assert.strictEqual(isEchoContent('# Hello\n', undefined), false);
  });
});

describe('isValidScrollDimension', () => {
  test('returns true for a normal positive number', () => {
    assert.strictEqual(isValidScrollDimension(1200), true);
  });

  test('returns true for zero', () => {
    assert.strictEqual(isValidScrollDimension(0), true);
  });

  test('returns false for NaN', () => {
    assert.strictEqual(isValidScrollDimension(NaN), false);
  });

  test('returns false for Infinity', () => {
    assert.strictEqual(isValidScrollDimension(Infinity), false);
  });

  test('returns false for -Infinity', () => {
    assert.strictEqual(isValidScrollDimension(-Infinity), false);
  });

  test('returns false for negative number', () => {
    assert.strictEqual(isValidScrollDimension(-1), false);
  });
});
