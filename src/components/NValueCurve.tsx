import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatBases } from '../assembly-statsx/format'
import type { AssemblyResult } from '../assembly-statsx/types'

const FILE_COLOURS = ['var(--gx-accent)', '#6366F1', '#F59E0B', '#EF4444', '#10B981']

interface NValueCurveProps {
  results: AssemblyResult[]
}

export function NValueCurve({ results }: NValueCurveProps) {
  if (results.length === 0) return null

  const labels = ['N10', 'N20', 'N30', 'N40', 'N50', 'N60', 'N70', 'N80', 'N90']

  const data = labels.map(label => {
    const point: Record<string, unknown> = { label }
    results.forEach((r, i) => {
      const nv = r.nValuePoints.find(p => p.label === label)
      point[`file${i}`] = nv?.minLength ?? 0
    })
    return point
  })

  return (
    <div className="viz-panel">
      <div className="chart-title">N-Value Curve</div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ bottom: 10 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={formatBases}
            tick={{ fontSize: 11 }}
            width={70}
          />
          <Tooltip
            formatter={(value: number) => formatBases(value)}
          />
          <Legend
            formatter={(value: string) => {
              const idx = parseInt(value.replace('file', ''), 10)
              const name = results[idx]?.stats.filename ?? value
              return name.length > 20 ? name.slice(0, 20) + '...' : name
            }}
          />
          {results.map((_, i) => (
            <Line
              key={`file${i}`}
              type="monotone"
              dataKey={`file${i}`}
              stroke={FILE_COLOURS[i] ?? FILE_COLOURS[0]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
