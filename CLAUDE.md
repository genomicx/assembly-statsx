# assembly-statsx

Browser-based assembly quality statistics tool — replicates the [Sanger Pathogens assembly-stats CLI](https://github.com/sanger-pathogens/assembly-stats) with interactive visualisations and multi-file comparison.

## App Name & Conventions

- **App name**: `assembly-statsx` (package name matches)
- **Domain folder**: `src/assembly-statsx/` (NOT `src/assemblyx/`)
- **Framework**: Vite + React 18, pure TypeScript — no WASM, no CDN scripts
- **Charts**: Recharts (npm, already installed)
- **File exports**: Use `URL.createObjectURL` + anchor click — no `file-saver` library

## Commands

```bash
npm run dev       # Start dev server on localhost:5173
npm test          # Run vitest unit tests (48 tests)
npm run build     # tsc + vite build (must pass before committing)
npm run check     # Tests + lint + build all at once
npm run lint      # ESLint
```

## Project Structure

```
assembly-stats/
├── src/
│   ├── assembly-statsx/     # Domain logic (no React)
│   │   ├── types.ts         # All interfaces + DEFAULT_OPTIONS
│   │   ├── format.ts        # formatBases(), formatPct()
│   │   ├── parseFasta.ts    # FASTA + FASTQ parser (.gz via DecompressionStream)
│   │   ├── computeStats.ts  # N-values, GC, gaps, histogram bins, cumulative data
│   │   ├── computeStats.test.ts  # 48 unit tests (vitest)
│   │   └── pipeline.ts      # Async orchestrator with onProgress/onLog
│   ├── components/
│   │   ├── FileUpload.tsx
│   │   ├── LogConsole.tsx
│   │   ├── AboutPage.tsx
│   │   ├── SummaryCards.tsx
│   │   ├── ResultsTable.tsx      # exportCSV + exportJSON
│   │   ├── LengthHistogram.tsx
│   │   ├── NValueCurve.tsx
│   │   ├── CumulativeLengthPlot.tsx
│   │   ├── ContigSizeChart.tsx
│   │   └── GCDistribution.tsx
│   ├── App.tsx
│   ├── App.css              # GX base styles + assembly-statsx extensions
│   └── index.css            # GX design tokens (copy from mlstx — do not modify)
├── index.html
├── package.json
├── vite.config.ts
└── vitest.config.ts
```

## Key Design Decisions

### formatBases threshold
- `≥ 1,000,000` → Mb (2 dp)
- `≥ 10,000` → Kb (1 dp)  ← threshold is 10,000, not 1,000
- `< 10,000` → bp with locale commas

### N-value algorithm
```typescript
// threshold = total * (pct / 100)
// scan sorted-descending lengths; return when cumulative >= threshold
```

### Cumulative plot downsampling
- If ≤500 contigs: use all points
- If >500 contigs: pick exactly 500 evenly-spaced indices via `Math.round((i / 499) * (n - 1))`

### GC% computation
- Excludes N bases from the denominator
- All-N sequence → GC% = 0 (no divide-by-zero)

## Statistics Computed

Matching CLI: `numSequences`, `totalBases`, `avgLength`, `largest`, `smallest`, N10–N100 with L-values, `nCount`, `gaps`

Extensions: `gcPercent`, `medianLength`, per-contig GC histogram, length histogram, cumulative plot data, top 25 contigs

## Multi-file colour palette

```typescript
const FILE_COLOURS = ['var(--gx-accent)', '#6366F1', '#F59E0B', '#EF4444', '#10B981']
```

## CSS Classes (assembly-statsx extensions in App.css)

- `.summary-cards` — CSS grid for 4 stat cards
- `.stat-card`, `.stat-value`, `.stat-sub` — individual stat card elements
- `.viz-grid` — 2-column grid for charts
- `.viz-full-width` — spans both columns (used by CumulativeLengthPlot)
- `.viz-panel` — chart container with min-height 320px
- `.chart-title` — uppercase label above each chart
- `.results-table .col-best` — highlights best N50 column

## Portal Registration

Entry exists in `/home/ubuntu/code/genomicx/genomicx.github.io/apps.json` with id `assembly-statsx`.

## Reference Apps

- `../mlstx/` — CSS, layout, FileUpload, LogConsole patterns
- `../mashtreewebx/` — pipeline pattern reference
