/**
 * Converts a base-pair count to a human-readable string.
 * Examples:
 *   1500000 -> "1.50 Mb"
 *   150000  -> "150.0 Kb"
 *   1500    -> "1,500 bp"
 */
export function formatBases(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)} Mb`
  }
  if (n >= 10_000) {
    return `${(n / 1_000).toFixed(1)} Kb`
  }
  return `${n.toLocaleString('en-US')} bp`
}

/**
 * Formats a number as a percentage with 2 decimal places.
 * Example: formatPct(45.678) -> "45.68%"
 */
export function formatPct(n: number): string {
  return `${n.toFixed(2)}%`
}
