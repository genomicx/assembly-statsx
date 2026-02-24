import type { AssemblyResult, AssemblyOptions } from './types'
import { parseAssemblyFile } from './parseFasta'
import { computeStats } from './computeStats'

/**
 * Full pipeline: parse files, apply options, compute stats.
 *
 * @param files      - Array of File objects to process
 * @param options    - Assembly options (e.g. minLength filter)
 * @param onProgress - Progress callback: (message, pct 0-100)
 * @param onLog      - Log message callback
 * @returns          - Array of AssemblyResult, one per file
 */
export async function runPipeline(
  files: File[],
  options: AssemblyOptions,
  onProgress: (msg: string, pct: number) => void,
  onLog: (msg: string) => void,
): Promise<AssemblyResult[]> {
  // Step 1 (5%): validate input
  onProgress('Validating...', 5)
  if (files.length === 0) {
    throw new Error('No files provided')
  }

  const results: AssemblyResult[] = []

  // Step 2: process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    // Progress: ramp from 5% to 90% across all files
    onProgress(`Processing ${file.name}...`, 5 + (i / files.length) * 85)

    // Parse
    onLog(`Parsing ${file.name}...`)
    const { filename, records } = await parseAssemblyFile(file)

    // Apply minLength filter (only if minLength > 0)
    let filtered = records
    if (options.minLength > 0) {
      filtered = records.filter((r) => r.sequence.length >= options.minLength)
      onLog(`  ${filtered.length} sequences (>=${options.minLength}bp)`)
    } else {
      onLog(`  ${filtered.length} sequences`)
    }

    // Compute stats
    const result = computeStats(filtered, filename, options)

    onLog(
      `  N50: ${result.stats.n50}, Total: ${result.stats.totalBases}bp, GC: ${result.stats.gcPercent.toFixed(1)}%`,
    )

    results.push(result)
  }

  // Step 3 (100%): done
  onProgress('Done!', 100)

  return results
}
