import { formatBases, formatPct } from '../assembly-statsx/format'
import type { AssemblyResult, AssemblyStats } from '../assembly-statsx/types'

interface ResultsTableProps {
  results: AssemblyResult[]
}

interface MetricRow {
  label: string
  getValue: (s: AssemblyStats) => string
  getRaw: (s: AssemblyStats) => number
  higherIsBetter: boolean
}

const METRICS: MetricRow[] = [
  { label: 'Filename',       getValue: s => s.filename,                        getRaw: () => 0,            higherIsBetter: false },
  { label: 'Sequences',      getValue: s => s.numSequences.toLocaleString(),   getRaw: s => s.numSequences, higherIsBetter: false },
  { label: 'Total Bases',    getValue: s => formatBases(s.totalBases),         getRaw: s => s.totalBases,  higherIsBetter: true },
  { label: 'Average Length', getValue: s => formatBases(s.avgLength),          getRaw: s => s.avgLength,   higherIsBetter: true },
  { label: 'Median Length',  getValue: s => formatBases(s.medianLength),       getRaw: s => s.medianLength, higherIsBetter: true },
  { label: 'Largest',        getValue: s => formatBases(s.largest),            getRaw: s => s.largest,     higherIsBetter: true },
  { label: 'Smallest',       getValue: s => formatBases(s.smallest),           getRaw: s => s.smallest,    higherIsBetter: false },
  { label: 'N50',            getValue: s => formatBases(s.n50),                getRaw: s => s.n50,         higherIsBetter: true },
  { label: 'L50',            getValue: s => s.l50.toLocaleString(),            getRaw: s => s.l50,         higherIsBetter: false },
  { label: 'N60',            getValue: s => formatBases(s.n60),                getRaw: s => s.n60,         higherIsBetter: true },
  { label: 'L60',            getValue: s => s.l60.toLocaleString(),            getRaw: s => s.l60,         higherIsBetter: false },
  { label: 'N70',            getValue: s => formatBases(s.n70),                getRaw: s => s.n70,         higherIsBetter: true },
  { label: 'L70',            getValue: s => s.l70.toLocaleString(),            getRaw: s => s.l70,         higherIsBetter: false },
  { label: 'N80',            getValue: s => formatBases(s.n80),                getRaw: s => s.n80,         higherIsBetter: true },
  { label: 'L80',            getValue: s => s.l80.toLocaleString(),            getRaw: s => s.l80,         higherIsBetter: false },
  { label: 'N90',            getValue: s => formatBases(s.n90),                getRaw: s => s.n90,         higherIsBetter: true },
  { label: 'L90',            getValue: s => s.l90.toLocaleString(),            getRaw: s => s.l90,         higherIsBetter: false },
  { label: 'N100',           getValue: s => formatBases(s.n100),               getRaw: s => s.n100,        higherIsBetter: true },
  { label: 'L100',           getValue: s => s.l100.toLocaleString(),           getRaw: s => s.l100,        higherIsBetter: false },
  { label: 'GC%',            getValue: s => formatPct(s.gcPercent),            getRaw: s => s.gcPercent,   higherIsBetter: false },
  { label: 'N-bases',        getValue: s => s.nCount.toLocaleString(),         getRaw: s => s.nCount,      higherIsBetter: false },
  { label: 'Gaps',           getValue: s => s.gaps.toLocaleString(),           getRaw: s => s.gaps,        higherIsBetter: false },
]

function findBestIndex(results: AssemblyResult[], metric: MetricRow): number {
  if (results.length <= 1) return -1
  // Skip non-numeric metrics
  if (metric.label === 'Filename') return -1

  const raws = results.map(r => metric.getRaw(r.stats))
  let bestIdx = 0
  for (let i = 1; i < raws.length; i++) {
    if (metric.higherIsBetter ? raws[i] > raws[bestIdx] : raws[i] < raws[bestIdx]) {
      bestIdx = i
    }
  }
  return bestIdx
}

export function exportCSV(results: AssemblyResult[]): void {
  const headers = ['Metric', ...results.map(r => r.stats.filename)]
  const rows = METRICS.map(m => {
    return [m.label, ...results.map(r => m.getValue(r.stats))]
  })

  const csvLines = [headers, ...rows].map(row =>
    row.map(cell => {
      const str = String(cell)
      // Quote cells that contain commas or quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'assembly-stats.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJSON(results: AssemblyResult[]): void {
  const data = results.map(r => r.stats)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'assembly-stats.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function ResultsTable({ results }: ResultsTableProps) {
  if (results.length === 0) return null

  // For multi-file comparison, find best column index per metric (by N50)
  const bestColByN50 = results.length > 1
    ? results.reduce((bestIdx, r, i) => r.stats.n50 > results[bestIdx].stats.n50 ? i : bestIdx, 0)
    : -1

  return (
    <div className="results-table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>Metric</th>
            {results.map((r, i) => (
              <th
                key={r.stats.filename}
                className={i === bestColByN50 ? 'col-best' : ''}
              >
                {r.stats.filename}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map(metric => {
            const bestIdx = findBestIndex(results, metric)
            return (
              <tr key={metric.label}>
                <td style={{ fontWeight: 600, color: 'var(--gx-text-muted)', fontSize: '0.8rem' }}>
                  {metric.label}
                </td>
                {results.map((r, i) => (
                  <td
                    key={r.stats.filename}
                    className={i === bestIdx ? 'col-best' : ''}
                  >
                    {metric.getValue(r.stats)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
