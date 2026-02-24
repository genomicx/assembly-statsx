import { useState } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatBases } from '../assembly-statsx/format'
import type { AssemblyResult } from '../assembly-statsx/types'

const FILE_COLOURS = ['var(--gx-accent)', '#6366F1', '#F59E0B', '#EF4444', '#10B981']

interface CumulativeLengthPlotProps {
  results: AssemblyResult[]
  activeIndex?: number
}

export function CumulativeLengthPlot({ results, activeIndex: externalIndex }: CumulativeLengthPlotProps) {
  const [localIndex, setLocalIndex] = useState(0)
  const activeIndex = externalIndex ?? localIndex

  if (results.length === 0) return null

  const idx = Math.min(activeIndex, results.length - 1)
  const colour = FILE_COLOURS[idx] ?? 'var(--gx-accent)'
  const data = results[idx].cumulativeData.map(pt => ({
    rank: pt.rank,
    cumulativeBases: pt.cumulativeBases,
    contigLength: pt.contigLength,
  }))

  return (
    <div className="viz-panel viz-full-width">
      <div className="chart-title">Cumulative Assembly Length</div>
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
        <ComposedChart data={data} margin={{ bottom: 10 }}>
          <XAxis
            dataKey="rank"
            tick={{ fontSize: 11 }}
            label={{ value: 'Contig rank', position: 'insideBottom', offset: -5, fontSize: 11 }}
          />
          <YAxis
            yAxisId="cumulative"
            tickFormatter={formatBases}
            tick={{ fontSize: 11 }}
            width={75}
          />
          <YAxis
            yAxisId="length"
            orientation="right"
            tickFormatter={formatBases}
            tick={{ fontSize: 11 }}
            width={75}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatBases(value),
              name === 'cumulativeBases' ? 'Cumulative Bases' : 'Contig Length',
            ]}
          />
          <Legend />
          <Area
            yAxisId="cumulative"
            type="monotone"
            dataKey="cumulativeBases"
            fill={colour}
            stroke={colour}
            fillOpacity={0.2}
            strokeWidth={2}
            name="cumulativeBases"
            dot={false}
          />
          <Line
            yAxisId="length"
            type="monotone"
            dataKey="contigLength"
            stroke="#F59E0B"
            strokeWidth={1.5}
            name="contigLength"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
