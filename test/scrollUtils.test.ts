/**
 * Unit tests for scrollUtils — AT-SC-001..AT-SC-016
 *
 * Both functions share the same model:
 *   line N is at pixel (N / totalLines) × scrollHeight
 *   pixel P corresponds to line (P / scrollHeight) × totalLines
 */
import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { scrollStateToLine, lineToScrollState } from '../src/utils/scrollUtils';

describe('scrollStateToLine', () => {
  // AT-SC-001
  test('AT-SC-001: scrollTop=0 → line 0', () => {
    assert.strictEqual(scrollStateToLine(0, 2000, 800, 100), 0);
  });

  // AT-SC-002
  test('AT-SC-002: scrollTop=max → top visible line when fully scrolled', () => {
    // scrollableHeight = 1200; (1200/2000)*100 = 60
    assert.strictEqual(scrollStateToLine(1200, 2000, 800, 100), 60);
  });

  // AT-SC-003
  test('AT-SC-003: scrollTop=600 → line at that document position', () => {
    // (600/2000)*101 = 30.3 → round = 30
    assert.strictEqual(scrollStateToLine(600, 2000, 800, 101), 30);
  });

  // AT-SC-004
  test('AT-SC-004: scrollHeight=viewportHeight (no scroll) → line 0', () => {
    assert.strictEqual(scrollStateToLine(0, 800, 800, 100), 0);
  });

  // AT-SC-005
  test('AT-SC-005: totalLines=1 → always line 0', () => {
    assert.strictEqual(scrollStateToLine(500, 2000, 800, 1), 0);
  });

  // AT-SC-006
  test('AT-SC-006: totalLines=0 → line 0', () => {
    assert.strictEqual(scrollStateToLine(500, 2000, 800, 0), 0);
  });

  // AT-SC-007
  test('AT-SC-007: scrollTop > scrollableHeight → clamped to max scroll position', () => {
    // clamped to 1200; (1200/2000)*100 = 60
    assert.strictEqual(scrollStateToLine(2000, 2000, 800, 100), 60);
  });

  // AT-SC-008
  test('AT-SC-008: negative scrollTop → clamped to line 0', () => {
    assert.strictEqual(scrollStateToLine(-100, 2000, 800, 100), 0);
  });
});

describe('lineToScrollState', () => {
  // AT-SC-009
  test('AT-SC-009: line=0 → scrollTop=0', () => {
    assert.strictEqual(lineToScrollState(0, 100, 2000, 800), 0);
  });

  // AT-SC-010
  test('AT-SC-010: last line → scrollTop clamped to scrollableHeight', () => {
    assert.strictEqual(lineToScrollState(99, 100, 2000, 800), 1200);
  });

  // AT-SC-011
  test('AT-SC-011: middle line → scrollTop places line at top of viewport', () => {
    // line 50 of 101 starts at (50/101)*2000 ≈ 990px
    assert.strictEqual(lineToScrollState(50, 101, 2000, 800), 990);
  });

  // AT-SC-012
  test('AT-SC-012: scrollHeight=viewportHeight (no scroll) → 0', () => {
    assert.strictEqual(lineToScrollState(50, 100, 800, 800), 0);
  });

  // AT-SC-013
  test('AT-SC-013: totalLines=1 → always 0', () => {
    assert.strictEqual(lineToScrollState(0, 1, 2000, 800), 0);
  });

  // AT-SC-014
  test('AT-SC-014: totalLines=0 → always 0', () => {
    assert.strictEqual(lineToScrollState(0, 0, 2000, 800), 0);
  });

  // AT-SC-015
  test('AT-SC-015: line > totalLines-1 (clamped to scrollableHeight)', () => {
    assert.strictEqual(lineToScrollState(200, 100, 2000, 800), 1200);
  });

  // AT-SC-016: round-trip
  test('AT-SC-016: round-trip: scrollStateToLine ∘ lineToScrollState = identity', () => {
    const line = 42;
    const scrollTop = lineToScrollState(line, 100, 2000, 800);
    assert.strictEqual(scrollTop, 840);
    const recovered = scrollStateToLine(scrollTop, 2000, 800, 100);
    assert.strictEqual(recovered, line);
  });
});
