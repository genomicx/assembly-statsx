export interface AssemblyRecord { id: string; sequence: string }

export interface NValuePoint { fraction: number; minLength: number; lValue: number; label: string }

export interface HistogramBin { binLabel: string; count: number; minLen: number; maxLen: number }

export interface GCHistogramBin { binLabel: string; count: number }

export interface CumulativePoint { rank: number; contigLength: number; cumulativeBases: number }

export interface AssemblyStats {
  filename: string
  numSequences: number; totalBases: number; avgLength: number; medianLength: number
  largest: number; smallest: number
  n50: number; l50: number; n60: number; l60: number
  n70: number; l70: number; n80: number; l80: number
  n90: number; l90: number; n100: number; l100: number
  gcPercent: number; nCount: number; gaps: number
}

export interface AssemblyResult {
  stats: AssemblyStats
  nValuePoints: NValuePoint[]          // N10–N90 for curve
  histogramBins: HistogramBin[]        // for LengthHistogram
  gcHistogramBins: GCHistogramBin[]    // for GCDistribution
  cumulativeData: CumulativePoint[]    // for CumulativeLengthPlot (downsampled to <=500pts)
  topContigs: { id: string; length: number }[]  // top 25 for ContigSizeChart
}

export interface AssemblyOptions { minLength: number }
export const DEFAULT_OPTIONS: AssemblyOptions = { minLength: 0 }
