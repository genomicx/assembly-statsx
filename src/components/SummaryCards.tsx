import { formatBases, formatPct } from '../assembly-statsx/format'
import type { AssemblyResult } from '../assembly-statsx/types'

interface SummaryCardsProps {
  results: AssemblyResult[]
}

export function SummaryCards({ results }: SummaryCardsProps) {
  if (results.length === 0) return null

  const { stats } = results[0]

  return (
    <div>
      {results.length > 1 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--gx-text-muted)', marginBottom: '0.5rem' }}>
          Showing summary for: <strong>{stats.filename}</strong>
        </p>
      )}
      <div className="summary-cards">
        <div className="stat-card">
          <div className="stat-card-label">N50</div>
          <div className="stat-value">{formatBases(stats.n50)}</div>
          <div className="stat-sub">L50: {stats.l50} contigs</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Length</div>
          <div className="stat-value">{formatBases(stats.totalBases)}</div>
          <div className="stat-sub">{stats.numSequences} sequences</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">GC Content</div>
          <div className="stat-value">{formatPct(stats.gcPercent)}</div>
          <div className="stat-sub">N-bases: {stats.nCount.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Largest Contig</div>
          <div className="stat-value">{formatBases(stats.largest)}</div>
          <div className="stat-sub">Smallest: {formatBases(stats.smallest)}</div>
        </div>
      </div>
    </div>
  )
}
