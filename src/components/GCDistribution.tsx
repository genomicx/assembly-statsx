import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { AssemblyResult } from '../assembly-statsx/types'

const FILE_COLOURS = ['var(--gx-accent)', '#6366F1', '#F59E0B', '#EF4444', '#10B981']

interface GCDistributionProps {
  results: AssemblyResult[]
  activeIndex?: number
}

export function GCDistribution({ results, activeIndex: externalIndex }: GCDistributionProps) {
  const [localIndex, setLocalIndex] = useState(0)
  const activeIndex = externalIndex ?? localIndex

  if (results.length === 0) return null

  const idx = Math.min(activeIndex, results.length - 1)
  const colour = FILE_COLOURS[idx] ?? 'var(--gx-accent)'
  const data = results[idx].gcHistogramBins.map(bin => ({
    name: bin.binLabel,
    count: bin.count,
  }))

  return (
    <div className="viz-panel">
      <div className="chart-title">GC Content Distribution</div>
      {results.length > 1 && externalIndex === undefined && (
        <select
          value={localIndex}
          onChange={e => setLocalIndex(Number(e.target.value))}
          style={{ marginBottom: '0.75rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
        >
          {results.map((r, i) => (
            <option key={r.stats.filename} value={i}>
              {r.stats.filename}
            </option>
          ))}
        </select>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ bottom: 10 }}>
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 10 }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill={colour} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
