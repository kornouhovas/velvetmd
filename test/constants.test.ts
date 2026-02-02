import './setup';
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { formatBytes, MAX_CONTENT_SIZE_BYTES } from '../src/constants';

/**
 * Tests for constants and utility functions
 */

describe('formatBytes', () => {
  it('should format 0 bytes correctly', () => {
    assert.equal(formatBytes(0), '0 Bytes');
  });

  it('should format bytes (< 1KB)', () => {
    assert.equal(formatBytes(100), '100 Bytes');
    assert.equal(formatBytes(1023), '1023 Bytes');
  });

  it('should format kilobytes', () => {
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(2048), '2 KB');
    assert.equal(formatBytes(1536), '2 KB'); // 1.5 KB rounds to 2
  });

  it('should format megabytes', () => {
    assert.equal(formatBytes(1024 * 1024), '1 MB');
    assert.equal(formatBytes(5 * 1024 * 1024), '5 MB');
  });

  it('should format gigabytes', () => {
    assert.equal(formatBytes(1024 * 1024 * 1024), '1 GB');
    assert.equal(formatBytes(2.5 * 1024 * 1024 * 1024), '3 GB'); // 2.5 GB rounds to 3
  });

  it('should format terabytes', () => {
    assert.equal(formatBytes(1024 * 1024 * 1024 * 1024), '1 TB');
  });

  it('should format MAX_CONTENT_SIZE_BYTES correctly', () => {
    const result = formatBytes(MAX_CONTENT_SIZE_BYTES);
    assert.equal(result, '10 MB');
  });

  it('should throw error for negative numbers', () => {
    assert.throws(
      () => formatBytes(-100),
      /Bytes must be a non-negative finite number/
    );
  });

  it('should throw error for NaN', () => {
    assert.throws(
      () => formatBytes(NaN),
      /Bytes must be a non-negative finite number/
    );
  });

  it('should throw error for Infinity', () => {
    assert.throws(
      () => formatBytes(Infinity),
      /Bytes must be a non-negative finite number/
    );
  });

  it('should include space between number and unit', () => {
    const result = formatBytes(1024);
    assert.match(result, /\d+\s+\w+/); // Number, space, unit
    assert.equal(result, '1 KB');
  });

  it('should handle very large numbers (beyond TB)', () => {
    const veryLarge = 1024 * 1024 * 1024 * 1024 * 1024; // 1 PB
    const result = formatBytes(veryLarge);
    // Should cap at TB (highest supported unit)
    assert.match(result, /TB$/);
  });
});

describe('MAX_CONTENT_SIZE_BYTES', () => {
  it('should be 10MB in bytes', () => {
    assert.equal(MAX_CONTENT_SIZE_BYTES, 10 * 1024 * 1024);
  });

  it('should be 10485760 bytes', () => {
    assert.equal(MAX_CONTENT_SIZE_BYTES, 10485760);
  });
});
