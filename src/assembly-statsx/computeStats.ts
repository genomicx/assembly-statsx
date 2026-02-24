import type {
  AssemblyRecord,
  AssemblyResult,
  AssemblyStats,
  AssemblyOptions,
  NValuePoint,
  HistogramBin,
  GCHistogramBin,
  CumulativePoint,
} from './types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute Nx value from a descending-sorted lengths array.
 * @param sorted - lengths sorted in descending order
 * @param total  - sum of all lengths
 * @param pct    - percentage (e.g. 50 for N50)
 */
function computeNValue(
  sorted: number[],
  total: number,
  pct: number,
): { nValue: number; lValue: number } {
  const threshold = total * (pct / 100)
  let cumulative = 0
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i]
    if (cumulative >= threshold) {
      return { nValue: sorted[i], lValue: i + 1 }
    }
  }
  return { nValue: sorted[sorted.length - 1], lValue: sorted.length }
}


// ---------------------------------------------------------------------------
// Log-scale histogram bin definitions
// ---------------------------------------------------------------------------

interface BinDef {
  label: string
  min: number
  max: number // exclusive upper bound (Infinity for last bin)
}

const LENGTH_BIN_DEFS: BinDef[] = [
  { label: '<100',      min: 0,         max: 100 },
  { label: '100-500',   min: 100,       max: 500 },
  { label: '500-1k',    min: 500,       max: 1_000 },
  { label: '1k-5k',     min: 1_000,     max: 5_000 },
  { label: '5k-10k',    min: 5_000,     max: 10_000 },
  { label: '10k-50k',   min: 10_000,    max: 50_000 },
  { label: '50k-100k',  min: 50_000,    max: 100_000 },
  { label: '100k-500k', min: 100_000,   max: 500_000 },
  { label: '500k-1M',   min: 500_000,   max: 1_000_000 },
  { label: '>=1M',      min: 1_000_000, max: Infinity },
]

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function computeStats(
  records: AssemblyRecord[],
  filename: string,
  _options: AssemblyOptions,
): AssemblyResult {
  // ------------------------------------------------------------------
  // Empty-result helper
  // ------------------------------------------------------------------
  const emptyStats: AssemblyStats = {
    filename,
    numSequences: 0, totalBases: 0, avgLength: 0, medianLength: 0,
    largest: 0, smallest: 0,
    n50: 0, l50: 0, n60: 0, l60: 0,
    n70: 0, l70: 0, n80: 0, l80: 0,
    n90: 0, l90: 0, n100: 0, l100: 0,
    gcPercent: 0, nCount: 0, gaps: 0,
  }

  if (records.length === 0) {
    return {
      stats: emptyStats,
      nValuePoints: [],
      histogramBins: buildEmptyLengthBins(),
      gcHistogramBins: buildEmptyGCBins(),
      cumulativeData: [],
      topContigs: [],
    }
  }

  // ------------------------------------------------------------------
  // Per-record stats
  // ------------------------------------------------------------------
  const lengths: number[] = []
  let totalBases = 0
  let totalGC = 0
  let totalNonN = 0
  let nCount = 0
  let gaps = 0

  // We'll also collect per-contig GC for the histogram
  const contigGCPercents: number[] = []

  for (const record of records) {
    const seq = record.sequence
    const len = seq.length
    lengths.push(len)
    totalBases += len

    // GC and N counting
    let gc = 0
    let nonN = 0
    const upper = seq.toUpperCase()
    for (const c of upper) {
      if (c === 'G' || c === 'C') { gc++; nonN++ }
      else if (c === 'A' || c === 'T') { nonN++ }
      else if (c === 'N') { nCount++ }
    }
    totalGC += gc
    totalNonN += nonN

    contigGCPercents.push(nonN === 0 ? 0 : (gc / nonN) * 100)

    // Gap counting: maximal runs of N/n
    const gapMatches = seq.match(/[Nn]+/g)
    if (gapMatches) {
      gaps += gapMatches.length
    }
  }

  const numSequences = records.length
  const gcPercent = totalNonN === 0 ? 0 : (totalGC / totalNonN) * 100

  // ------------------------------------------------------------------
  // Sorted lengths (descending) for N-value calculations
  // ------------------------------------------------------------------
  const sortedDesc = [...lengths].sort((a, b) => b - a)

  // ------------------------------------------------------------------
  // Basic stats
  // ------------------------------------------------------------------
  const avgLength = totalBases / numSequences
  const largest = sortedDesc[0]
  const smallest = sortedDesc[sortedDesc.length - 1]

  // Median
  const sortedAsc = [...sortedDesc].reverse()
  let medianLength: number
  const mid = Math.floor(numSequences / 2)
  if (numSequences % 2 === 1) {
    medianLength = sortedAsc[mid]
  } else {
    medianLength = (sortedAsc[mid - 1] + sortedAsc[mid]) / 2
  }

  // ------------------------------------------------------------------
  // N/L values
  // ------------------------------------------------------------------
  const { nValue: n50, lValue: l50 } = computeNValue(sortedDesc, totalBases, 50)
  const { nValue: n60, lValue: l60 } = computeNValue(sortedDesc, totalBases, 60)
  const { nValue: n70, lValue: l70 } = computeNValue(sortedDesc, totalBases, 70)
  const { nValue: n80, lValue: l80 } = computeNValue(sortedDesc, totalBases, 80)
  const { nValue: n90, lValue: l90 } = computeNValue(sortedDesc, totalBases, 90)
  // N100 = smallest, L100 = numSequences
  const n100 = smallest
  const l100 = numSequences

  const stats: AssemblyStats = {
    filename,
    numSequences,
    totalBases,
    avgLength,
    medianLength,
    largest,
    smallest,
    n50, l50,
    n60, l60,
    n70, l70,
    n80, l80,
    n90, l90,
    n100, l100,
    gcPercent,
    nCount,
    gaps,
  }

  // ------------------------------------------------------------------
  // NValuePoints: N10 through N90
  // ------------------------------------------------------------------
  const nValuePoints: NValuePoint[] = []
  for (const pct of [10, 20, 30, 40, 50, 60, 70, 80, 90]) {
    const { nValue, lValue } = computeNValue(sortedDesc, totalBases, pct)
    nValuePoints.push({
      fraction: pct,
      minLength: nValue,
      lValue,
      label: `N${pct}`,
    })
  }

  // ------------------------------------------------------------------
  // Length histogram bins (log-scale, 10 fixed bins)
  // ------------------------------------------------------------------
  const histogramBins: HistogramBin[] = LENGTH_BIN_DEFS.map((def) => ({
    binLabel: def.label,
    count: 0,
    minLen: def.min,
    maxLen: def.max === Infinity ? Number.MAX_SAFE_INTEGER : def.max,
  }))

  for (const len of lengths) {
    for (let b = 0; b < LENGTH_BIN_DEFS.length; b++) {
      const def = LENGTH_BIN_DEFS[b]
      if (len >= def.min && len < def.max) {
        histogramBins[b].count++
        break
      }
    }
  }

  // ------------------------------------------------------------------
  // GC histogram bins: 5%-wide bins from 0% to 100% (21 bins)
  // ------------------------------------------------------------------
  const gcHistogramBins: GCHistogramBin[] = []
  for (let start = 0; start <= 100; start += 5) {
    gcHistogramBins.push({ binLabel: `${start}%`, count: 0 })
  }

  for (const gcPct of contigGCPercents) {
    // Clamp to [0, 100] and find bin index
    const clamped = Math.min(100, Math.max(0, gcPct))
    // bin index: floor(gcPct / 5), but gcPct=100 should go into the last bin (index 20)
    const binIdx = Math.min(20, Math.floor(clamped / 5))
    gcHistogramBins[binIdx].count++
  }

  // ------------------------------------------------------------------
  // Cumulative length plot data (downsampled to <=500 points)
  // ------------------------------------------------------------------
  const cumLengths = sortedDesc // already sorted descending
  const n = cumLengths.length
  let cumulative = 0
  const allPoints: CumulativePoint[] = []
  for (let i = 0; i < n; i++) {
    cumulative += cumLengths[i]
    allPoints.push({ rank: i + 1, contigLength: cumLengths[i], cumulativeBases: cumulative })
  }

  let cumulativeData: CumulativePoint[]
  if (n <= 500) {
    cumulativeData = allPoints
  } else {
    // Pick exactly 500 evenly-spaced indices, always including first and last
    const sampled: CumulativePoint[] = []
    for (let i = 0; i < 500; i++) {
      const idx = Math.round((i / 499) * (n - 1))
      sampled.push(allPoints[idx])
    }
    cumulativeData = sampled
  }

  // ------------------------------------------------------------------
  // Top 25 contigs by length
  // ------------------------------------------------------------------
  const topContigs = records
    .slice()
    .sort((a, b) => b.sequence.length - a.sequence.length)
    .slice(0, 25)
    .map((r) => ({ id: r.id, length: r.sequence.length }))

  return {
    stats,
    nValuePoints,
    histogramBins,
    gcHistogramBins,
    cumulativeData,
    topContigs,
  }
}

// ---------------------------------------------------------------------------
// Private helpers for empty results
// ---------------------------------------------------------------------------

function buildEmptyLengthBins(): HistogramBin[] {
  return LENGTH_BIN_DEFS.map((def) => ({
    binLabel: def.label,
    count: 0,
    minLen: def.min,
    maxLen: def.max === Infinity ? Number.MAX_SAFE_INTEGER : def.max,
  }))
}

function buildEmptyGCBins(): GCHistogramBin[] {
  const bins: GCHistogramBin[] = []
  for (let start = 0; start <= 100; start += 5) {
    bins.push({ binLabel: `${start}%`, count: 0 })
  }
  return bins
}
