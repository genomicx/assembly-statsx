# assembly-statsx

Browser-based genome assembly quality statistics — a client-side reimplementation of the [Sanger Pathogens assembly-stats CLI](https://github.com/sanger-pathogens/assembly-stats) with interactive visualisations and multi-file comparison.

## Features

- **Multi-file comparison** — drop in up to 5 assemblies and compare side-by-side
- **Full N-value suite** — N10 through N100 with corresponding L-values
- **Interactive charts** — length histogram, N-value curve, cumulative length plot, contig size distribution, GC% distribution
- **Export** — download results as CSV or JSON
- **Gzip support** — accepts `.fasta`, `.fa`, `.fq`, `.fastq`, and `.gz` variants
- **Pure client-side** — no server, no WASM, no data leaves your browser

## Statistics computed

Matches the CLI output: `numSequences`, `totalBases`, `avgLength`, `medianLength`, `largest`, `smallest`, N10–N100 with L-values, `nCount`, `gaps`, `gcPercent`

## Getting started

```bash
npm install
npm run dev       # dev server at localhost:5173
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm test` | Run unit tests (vitest, 48 tests) |
| `npm run build` | Type-check + production build |
| `npm run lint` | ESLint |
| `npm run check` | Tests + lint + build |

## Tech stack

- **Vite + React 18 + TypeScript** — no CDN scripts
- **Recharts** — all charts
- **DecompressionStream API** — native browser gzip decompression

## Project structure

```
src/
├── assembly-statsx/     # Domain logic (framework-free)
│   ├── types.ts         # Interfaces and defaults
│   ├── format.ts        # formatBases(), formatPct()
│   ├── parseFasta.ts    # FASTA/FASTQ parser with gzip support
│   ├── computeStats.ts  # N-values, GC, histograms, cumulative data
│   └── pipeline.ts      # Async orchestrator
└── components/          # React UI components
```

## Part of GenomicX

This app is part of the [GenomicX](https://genomicx.github.io) suite of browser-based bioinformatics tools.
