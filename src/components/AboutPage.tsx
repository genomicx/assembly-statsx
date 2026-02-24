export function AboutPage() {
  return (
    <div className="about-page">
      <section>
        <h2>About assembly-statsx</h2>
        <p>
          assembly-statsx is a browser-based assembly quality statistics tool. It
          replicates the{' '}
          <a
            href="https://github.com/sanger-pathogens/assembly-stats"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sanger Pathogens assembly-stats CLI
          </a>{' '}
          by Martin Hunt, entirely in pure TypeScript — no WebAssembly, no CDN
          scripts, no server. Upload FASTA or FASTQ assembly files to compute N50,
          GC content, gap counts, length distributions, and more.
        </p>
        <div className="privacy-note">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>
            No data leaves your machine — all statistics are computed
            client-side. Upload genome assemblies and get instant results with
            interactive visualisations.
          </p>
        </div>
      </section>

      <section>
        <h2>About the Author</h2>
        <h3>Andrew J. Page</h3>
        <p className="about-role">
          Director of Informatics, Quadram Institute Bioscience
        </p>
        <div className="about-links">
          <a
            href="https://github.com/andrewjpage"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub: andrewjpage
          </a>
        </div>
      </section>
    </div>
  )
}
