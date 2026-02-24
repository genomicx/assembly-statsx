import { useState, useEffect, useCallback } from 'react'
import { FileUpload } from './components/FileUpload'
import { LogConsole } from './components/LogConsole'
import { AboutPage } from './components/AboutPage'
import { SummaryCards } from './components/SummaryCards'
import { ResultsTable, exportCSV, exportJSON } from './components/ResultsTable'
import { LengthHistogram } from './components/LengthHistogram'
import { NValueCurve } from './components/NValueCurve'
import { CumulativeLengthPlot } from './components/CumulativeLengthPlot'
import { ContigSizeChart } from './components/ContigSizeChart'
import { GCDistribution } from './components/GCDistribution'
import { runPipeline } from './assembly-statsx/pipeline'
import { DEFAULT_OPTIONS } from './assembly-statsx/types'
import type { AssemblyResult } from './assembly-statsx/types'
import './App.css'

type Theme = 'light' | 'dark'

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [results, setResults] = useState<AssemblyResult[]>([])
  const [error, setError] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('gx-theme') as Theme) || 'dark')
  const [currentView, setCurrentView] = useState<'analysis' | 'about'>('analysis')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gx-theme', theme)
  }, [theme])

  const handleRun = useCallback(async () => {
    if (files.length === 0) return
    setRunning(true)
    setError('')
    setResults([])
    setLogLines([])
    setProgress('Starting analysis...')
    setProgressPct(0)
    try {
      const assemblyResults = await runPipeline(
        files,
        DEFAULT_OPTIONS,
        (msg, pct) => { setProgress(msg); setProgressPct(pct) },
        (msg) => setLogLines(prev => [...prev, msg]),
      )
      setResults(assemblyResults)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }, [files])

  const canRun = files.length > 0 && !running

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1>assembly-statsx</h1>
            <p className="subtitle">Assembly Quality Statistics</p>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '\u263E' : '\u2600'}
          </button>
        </div>
        <nav className="tab-bar">
          <button
            className={`tab ${currentView === 'analysis' ? 'tab-active' : ''}`}
            onClick={() => setCurrentView('analysis')}
          >
            Analysis
          </button>
          <button
            className={`tab ${currentView === 'about' ? 'tab-active' : ''}`}
            onClick={() => setCurrentView('about')}
          >
            About
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'analysis' ? (
          <>
            <div className="controls">
              <FileUpload
                files={files}
                onFilesChange={setFiles}
                disabled={running}
              />
              <button
                className="run-button"
                onClick={handleRun}
                disabled={!canRun}
              >
                {running ? 'Running...' : 'Run Analysis'}
              </button>
            </div>

            {running && (
              <section className="progress" aria-live="polite">
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuenow={Math.round(progressPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Assembly analysis progress"
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="progress-text">{progress}</p>
              </section>
            )}

            {error && (
              <section className="error" role="alert">
                <p>{error}</p>
              </section>
            )}

            {results.length > 0 && (
              <>
                <SummaryCards results={results} />

                <div className="results">
                  <div className="results-header">
                    <h2>Statistics</h2>
                    <div className="results-actions">
                      <button
                        className="export-button"
                        onClick={() => exportCSV(results)}
                      >
                        Export CSV
                      </button>
                      <button
                        className="export-button"
                        onClick={() => exportJSON(results)}
                      >
                        Export JSON
                      </button>
                    </div>
                  </div>
                  <ResultsTable results={results} />
                </div>

                <h2 className="chart-title" style={{ marginTop: '1.5rem' }}>Visualisations</h2>
                <div className="viz-grid">
                  <LengthHistogram results={results} />
                  <NValueCurve results={results} />
                  <CumulativeLengthPlot results={results} />
                  <ContigSizeChart results={results} />
                  <GCDistribution results={results} />
                </div>
              </>
            )}

            <LogConsole lines={logLines} />
          </>
        ) : (
          <AboutPage />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span>GenomicX &mdash; open-source bioinformatics for the browser</span>
          <div className="footer-links">
            <a href="https://github.com/genomicx" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://genomicx.vercel.app/about" target="_blank" rel="noopener noreferrer">Mission</a>
            <a href="https://www.happykhan.com/" target="_blank" rel="noopener noreferrer">Nabil-Fareed Alikhan</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
