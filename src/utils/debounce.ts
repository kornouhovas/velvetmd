/**
 * Creates a debounced function that delays invoking func until after delay milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * Returns a function with a cancel method to clear any pending invocations.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): ((...args: Args) => void) & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = ((...args: Args): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as ((...args: Args) => void) & { cancel: () => void };

  debounced.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}
