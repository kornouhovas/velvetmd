/**
 * Application-wide constants
 */

/**
 * Maximum content size in bytes (10MB)
 * Used for document validation and safety checks
 */
export const MAX_CONTENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Format bytes to human-readable size string
 * @param bytes - Number of bytes to format
 * @returns Human-readable string (e.g., "10 MB", "1 KB")
 * @throws Error if bytes is negative or not finite
 * @example formatBytes(1024) // "1 KB"
 * @example formatBytes(0) // "0 Bytes"
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new Error('Bytes must be a non-negative finite number');
  }

  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );

  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
}
