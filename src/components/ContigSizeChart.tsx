import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatBases } from '../assembly-statsx/format'
import type { AssemblyResult } from '../assembly-statsx/types'

const FILE_COLOURS = ['var(--gx-accent)', '#6366F1', '#F59E0B', '#EF4444', '#10B981']

interface ContigSizeChartProps {
  results: AssemblyResult[]
  activeIndex?: number
}

export function ContigSizeChart({ results, activeIndex: externalIndex }: ContigSizeChartProps) {
  const [localIndex, setLocalIndex] = useState(0)
  const activeIndex = externalIndex ?? localIndex

  if (results.length === 0) return null

  const idx = Math.min(activeIndex, results.length - 1)
  const colour = FILE_COLOURS[idx] ?? 'var(--gx-accent)'
  const topContigs = results[idx].topContigs.slice(0, 25)

  const data = topContigs.map(c => ({
    id: c.id.length > 15 ? c.id.slice(0, 15) + '...' : c.id,
    length: c.length,
  }))

  return (
    <div className="viz-panel">
      <div className="chart-title">Top 25 Contigs by Length</div>
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
        <BarChart
          layout="vertical"
          data={data}
          margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
        >
          <XAxis
            type="number"
            tickFormatter={formatBases}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="id"
            tick={{ fontSize: 10 }}
            width={100}
          />
          <Tooltip
            formatter={(value: number) => [formatBases(value), 'Length']}
          />
          <Bar dataKey="length" fill={colour} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
