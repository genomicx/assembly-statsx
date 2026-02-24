import { describe, it, expect } from 'vitest'
import { computeStats } from './computeStats'
import { parseFastaString, parseFastqString } from './parseFasta'
import { formatBases } from './format'
import type { AssemblyRecord, AssemblyOptions } from './types'

// ---------------------------------------------------------------------------
// Helper: build AssemblyRecord from a raw sequence string
// ---------------------------------------------------------------------------
function makeRecord(id: string, sequence: string): AssemblyRecord {
  return { id, sequence }
}

function makeOptions(minLength = 0): AssemblyOptions {
  return { minLength }
}

// ---------------------------------------------------------------------------
// 1. Single-sequence FASTA
// ---------------------------------------------------------------------------
describe('Single-sequence assembly', () => {
  it('N50 = N100 = sequence length, L50 = L100 = 1', () => {
    const records = [makeRecord('seq1', 'ACGT'.repeat(250))] // 1000 bp
    const result = computeStats(records, 'test.fa', makeOptions())
    const { stats } = result

    expect(stats.numSequences).toBe(1)
    expect(stats.totalBases).toBe(1000)
    expect(stats.n50).toBe(1000)
    expect(stats.l50).toBe(1)
    expect(stats.n100).toBe(1000)
    expect(stats.l100).toBe(1)
    expect(stats.largest).toBe(1000)
    expect(stats.smallest).toBe(1000)
  })
})

// ---------------------------------------------------------------------------
// 2. N50 calculation with known dataset
// ---------------------------------------------------------------------------
describe('N50 calculation', () => {
  it('computes N50=400, L50=2 for lengths [100,200,300,400,500]', () => {
    // total = 1500, threshold = 750
    // Sorted descending: [500, 400, 300, 200, 100]
    // Cumulative: 500 < 750, 500+400=900 >= 750 => N50=400, L50=2
    const records = [
      makeRecord('a', 'A'.repeat(100)),
      makeRecord('b', 'A'.repeat(200)),
      makeRecord('c', 'A'.repeat(300)),
      makeRecord('d', 'A'.repeat(400)),
      makeRecord('e', 'A'.repeat(500)),
    ]
    const { stats } = computeStats(records, 'test.fa', makeOptions())

    expect(stats.totalBases).toBe(1500)
    expect(stats.n50).toBe(400)
    expect(stats.l50).toBe(2)
  })

  it('computes correct N90', () => {
    // Same dataset: total=1500, threshold for N90=1350
    // Sorted desc: [500,400,300,200,100]
    // cumulative: 500, 900, 1200, 1400 >= 1350 => N90=200, L90=4
    const records = [
      makeRecord('a', 'A'.repeat(100)),
      makeRecord('b', 'A'.repeat(200)),
      makeRecord('c', 'A'.repeat(300)),
      makeRecord('d', 'A'.repeat(400)),
      makeRecord('e', 'A'.repeat(500)),
    ]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.n90).toBe(200)
    expect(stats.l90).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// 3. GC% computation
// ---------------------------------------------------------------------------
describe('GC% computation', () => {
  it('GCGCATAT => 50%', () => {
    const records = [makeRecord('s1', 'GCGCATAT')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.gcPercent).toBeCloseTo(50, 5)
  })

  it('all-G sequence => 100%', () => {
    const records = [makeRecord('s1', 'GGGGGGGG')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.gcPercent).toBeCloseTo(100, 5)
  })

  it('mixed case is handled correctly', () => {
    // lowercase gc
    const records = [makeRecord('s1', 'gcgcATAT')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.gcPercent).toBeCloseTo(50, 5)
  })
})

// ---------------------------------------------------------------------------
// 4. All-N sequence: GC% = 0
// ---------------------------------------------------------------------------
describe('All-N sequence', () => {
  it('GC% is 0 when sequence is all N', () => {
    const records = [makeRecord('s1', 'NNNNNNNN')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.gcPercent).toBe(0)
  })

  it('nCount equals total sequence length for all-N', () => {
    const records = [makeRecord('s1', 'NNNN')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.nCount).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// 5. Gap counting
// ---------------------------------------------------------------------------
describe('Gap counting', () => {
  it('"AAANNNAAANAA" => 2 gaps', () => {
    const records = [makeRecord('s1', 'AAANNNAAANAA')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.gaps).toBe(2)
  })

  it('no gaps when no N present', () => {
    const records = [makeRecord('s1', 'ACGTACGT')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.gaps).toBe(0)
  })

  it('single N run is 1 gap', () => {
    const records = [makeRecord('s1', 'ACGNNNGT')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.gaps).toBe(1)
  })

  it('counts lowercase n as gaps', () => {
    const records = [makeRecord('s1', 'ACGnnnGTnACG')]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.gaps).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 6. FASTQ parsing
// ---------------------------------------------------------------------------
describe('FASTQ parsing', () => {
  it('parses a 4-line FASTQ block correctly', () => {
    const fastqText = [
      '@read1 some description',
      'ACGTACGTACGT',
      '+',
      'IIIIIIIIIIII',
    ].join('\n')

    const records = parseFastqString(fastqText)
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('read1 some description')
    expect(records[0].sequence).toBe('ACGTACGTACGT')
  })

  it('parses multiple FASTQ records', () => {
    const fastqText = [
      '@read1',
      'ACGT',
      '+',
      'IIII',
      '@read2',
      'TTTT',
      '+',
      'HHHH',
    ].join('\n')

    const records = parseFastqString(fastqText)
    expect(records).toHaveLength(2)
    expect(records[0].id).toBe('read1')
    expect(records[0].sequence).toBe('ACGT')
    expect(records[1].id).toBe('read2')
    expect(records[1].sequence).toBe('TTTT')
  })

  it('id is the full line after @ (no splitting)', () => {
    const fastqText = [
      '@read1 extra info here',
      'ACGT',
      '+',
      'IIII',
    ].join('\n')

    const records = parseFastqString(fastqText)
    expect(records[0].id).toBe('read1 extra info here')
  })
})

// ---------------------------------------------------------------------------
// 7. minLength filter
// ---------------------------------------------------------------------------
describe('minLength filter', () => {
  it('filters out sequences shorter than minLength', () => {
    // sequences: 50bp, 100bp, 200bp, 500bp
    const records = [
      makeRecord('s1', 'A'.repeat(50)),
      makeRecord('s2', 'A'.repeat(100)),
      makeRecord('s3', 'A'.repeat(200)),
      makeRecord('s4', 'A'.repeat(500)),
    ]
    // Apply filter manually as pipeline does it
    const minLength = 100
    const filtered = records.filter((r) => r.sequence.length >= minLength)
    const { stats } = computeStats(filtered, 'test.fa', { minLength })

    expect(stats.numSequences).toBe(3)
    expect(stats.smallest).toBe(100)
  })

  it('returns empty result if all sequences are filtered', () => {
    const records = [makeRecord('s1', 'A'.repeat(10))]
    const filtered = records.filter((r) => r.sequence.length >= 100)
    const result = computeStats(filtered, 'test.fa', { minLength: 100 })

    expect(result.stats.numSequences).toBe(0)
    expect(result.stats.totalBases).toBe(0)
    expect(result.nValuePoints).toHaveLength(0)
    expect(result.cumulativeData).toHaveLength(0)
    expect(result.topContigs).toHaveLength(0)
  })

  it('minLength=0 keeps all sequences', () => {
    const records = [
      makeRecord('s1', 'A'.repeat(1)),
      makeRecord('s2', 'A'.repeat(10)),
    ]
    const { stats } = computeStats(records, 'test.fa', makeOptions(0))
    expect(stats.numSequences).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 8. formatBases
// ---------------------------------------------------------------------------
describe('formatBases', () => {
  it('formats 1500000 as "1.50 Mb"', () => {
    expect(formatBases(1_500_000)).toBe('1.50 Mb')
  })

  it('formats 150000 as "150.0 Kb"', () => {
    expect(formatBases(150_000)).toBe('150.0 Kb')
  })

  it('formats 1500 as "1,500 bp"', () => {
    expect(formatBases(1_500)).toBe('1,500 bp')
  })

  it('formats 999 as "999 bp"', () => {
    expect(formatBases(999)).toBe('999 bp')
  })

  it('formats 1000000 as "1.00 Mb"', () => {
    expect(formatBases(1_000_000)).toBe('1.00 Mb')
  })

  it('formats 1000 as "1,000 bp"', () => {
    expect(formatBases(1_000)).toBe('1,000 bp')
  })
})

// ---------------------------------------------------------------------------
// 9. GC histogram bins
// ---------------------------------------------------------------------------
describe('GC histogram bins', () => {
  it('a 50% GC contig falls in the "50%" bin', () => {
    // GCGCATAT -> 50% GC
    const records = [makeRecord('s1', 'GCGCATAT')]
    const { gcHistogramBins } = computeStats(records, 'test.fa', makeOptions())

    const bin50 = gcHistogramBins.find((b) => b.binLabel === '50%')
    expect(bin50).toBeDefined()
    expect(bin50!.count).toBe(1)

    // All other bins should be 0
    for (const bin of gcHistogramBins) {
      if (bin.binLabel !== '50%') {
        expect(bin.count).toBe(0)
      }
    }
  })

  it('bins cover 0% to 100% in 5% steps (21 bins)', () => {
    const records = [makeRecord('s1', 'ACGT')]
    const { gcHistogramBins } = computeStats(records, 'test.fa', makeOptions())

    expect(gcHistogramBins).toHaveLength(21)
    expect(gcHistogramBins[0].binLabel).toBe('0%')
    expect(gcHistogramBins[20].binLabel).toBe('100%')
  })

  it('all-N contig (0% GC) goes into "0%" bin', () => {
    const records = [makeRecord('s1', 'NNNN')]
    const { gcHistogramBins } = computeStats(records, 'test.fa', makeOptions())
    const bin0 = gcHistogramBins.find((b) => b.binLabel === '0%')
    expect(bin0!.count).toBe(1)
  })

  it('100% GC contig goes into the last bin', () => {
    const records = [makeRecord('s1', 'GGGG')]
    const { gcHistogramBins } = computeStats(records, 'test.fa', makeOptions())
    const bin100 = gcHistogramBins.find((b) => b.binLabel === '100%')
    expect(bin100!.count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// 10. Cumulative data
// ---------------------------------------------------------------------------
describe('Cumulative data', () => {
  it('points are monotonically increasing in cumulativeBases', () => {
    const records = [
      makeRecord('a', 'A'.repeat(100)),
      makeRecord('b', 'A'.repeat(200)),
      makeRecord('c', 'A'.repeat(300)),
    ]
    const { cumulativeData } = computeStats(records, 'test.fa', makeOptions())

    expect(cumulativeData.length).toBeGreaterThan(0)
    for (let i = 1; i < cumulativeData.length; i++) {
      expect(cumulativeData[i].cumulativeBases).toBeGreaterThan(
        cumulativeData[i - 1].cumulativeBases,
      )
    }
  })

  it('points are monotonically increasing in rank', () => {
    const records = [
      makeRecord('a', 'A'.repeat(100)),
      makeRecord('b', 'A'.repeat(200)),
      makeRecord('c', 'A'.repeat(300)),
    ]
    const { cumulativeData } = computeStats(records, 'test.fa', makeOptions())

    for (let i = 1; i < cumulativeData.length; i++) {
      expect(cumulativeData[i].rank).toBeGreaterThan(cumulativeData[i - 1].rank)
    }
  })

  it('last point cumulativeBases equals totalBases', () => {
    const records = [
      makeRecord('a', 'A'.repeat(100)),
      makeRecord('b', 'A'.repeat(200)),
      makeRecord('c', 'A'.repeat(300)),
    ]
    const { cumulativeData, stats } = computeStats(records, 'test.fa', makeOptions())

    const last = cumulativeData[cumulativeData.length - 1]
    expect(last.cumulativeBases).toBe(stats.totalBases)
  })

  it('downsamples to <=500 points when there are many sequences', () => {
    // Create 1000 records
    const records: AssemblyRecord[] = []
    for (let i = 0; i < 1000; i++) {
      records.push(makeRecord(`s${i}`, 'A'.repeat(100 + i)))
    }
    const { cumulativeData } = computeStats(records, 'test.fa', makeOptions())

    expect(cumulativeData.length).toBeLessThanOrEqual(500)
  })

  it('always includes the last point when downsampling', () => {
    const records: AssemblyRecord[] = []
    for (let i = 0; i < 1000; i++) {
      records.push(makeRecord(`s${i}`, 'A'.repeat(100 + i)))
    }
    const { cumulativeData, stats } = computeStats(records, 'test.fa', makeOptions())

    const last = cumulativeData[cumulativeData.length - 1]
    expect(last.cumulativeBases).toBe(stats.totalBases)
  })
})

// ---------------------------------------------------------------------------
// Additional: FASTA parsing
// ---------------------------------------------------------------------------
describe('parseFastaString', () => {
  it('parses a simple FASTA string', () => {
    const fasta = [
      '>seq1 description here',
      'ACGT',
      'TTTT',
      '>seq2',
      'GGGG',
    ].join('\n')

    const records = parseFastaString(fasta)
    expect(records).toHaveLength(2)
    expect(records[0].id).toBe('seq1')
    expect(records[0].sequence).toBe('ACGTTTTT')
    expect(records[1].id).toBe('seq2')
    expect(records[1].sequence).toBe('GGGG')
  })

  it('id is the first whitespace-delimited token', () => {
    const fasta = '>contig1 len=500 cov=20\nACGT\n'
    const records = parseFastaString(fasta)
    expect(records[0].id).toBe('contig1')
  })

  it('preserves sequence case', () => {
    const fasta = '>s1\nacgtACGT\n'
    const records = parseFastaString(fasta)
    expect(records[0].sequence).toBe('acgtACGT')
  })

  it('skips empty sequence lines', () => {
    const fasta = '>s1\nACGT\n\nTTTT\n'
    const records = parseFastaString(fasta)
    expect(records[0].sequence).toBe('ACGTTTTT')
  })
})

// ---------------------------------------------------------------------------
// Additional: histogram bins structure
// ---------------------------------------------------------------------------
describe('Length histogram bins', () => {
  it('returns 10 bins for any input', () => {
    const records = [makeRecord('s1', 'A'.repeat(1000))]
    const { histogramBins } = computeStats(records, 'test.fa', makeOptions())
    expect(histogramBins).toHaveLength(10)
  })

  it('places a 1000bp sequence in the 1k-5k bin', () => {
    const records = [makeRecord('s1', 'A'.repeat(1000))]
    const { histogramBins } = computeStats(records, 'test.fa', makeOptions())
    const bin = histogramBins.find((b) => b.binLabel === '1k-5k')
    expect(bin).toBeDefined()
    expect(bin!.count).toBe(1)
  })

  it('places a 50bp sequence in the <100 bin', () => {
    const records = [makeRecord('s1', 'A'.repeat(50))]
    const { histogramBins } = computeStats(records, 'test.fa', makeOptions())
    const bin = histogramBins.find((b) => b.binLabel === '<100')
    expect(bin!.count).toBe(1)
  })

  it('places a 2000000bp sequence in the >=1M bin', () => {
    const records = [makeRecord('s1', 'A'.repeat(2_000_000))]
    const { histogramBins } = computeStats(records, 'test.fa', makeOptions())
    const bin = histogramBins.find((b) => b.binLabel === '>=1M')
    expect(bin!.count).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Additional: top contigs
// ---------------------------------------------------------------------------
describe('Top contigs', () => {
  it('returns at most 25 contigs', () => {
    const records: AssemblyRecord[] = []
    for (let i = 0; i < 50; i++) {
      records.push(makeRecord(`s${i}`, 'A'.repeat(100 + i)))
    }
    const { topContigs } = computeStats(records, 'test.fa', makeOptions())
    expect(topContigs.length).toBeLessThanOrEqual(25)
  })

  it('top contigs are sorted by length descending', () => {
    const records = [
      makeRecord('small', 'A'.repeat(100)),
      makeRecord('large', 'A'.repeat(500)),
      makeRecord('medium', 'A'.repeat(300)),
    ]
    const { topContigs } = computeStats(records, 'test.fa', makeOptions())
    expect(topContigs[0].length).toBe(500)
    expect(topContigs[1].length).toBe(300)
    expect(topContigs[2].length).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Additional: NValuePoints structure
// ---------------------------------------------------------------------------
describe('NValuePoints', () => {
  it('returns 9 points (N10 through N90)', () => {
    const records = [makeRecord('s1', 'A'.repeat(1000))]
    const { nValuePoints } = computeStats(records, 'test.fa', makeOptions())
    expect(nValuePoints).toHaveLength(9)
  })

  it('labels are N10, N20, ..., N90', () => {
    const records = [makeRecord('s1', 'A'.repeat(1000))]
    const { nValuePoints } = computeStats(records, 'test.fa', makeOptions())
    const labels = nValuePoints.map((p) => p.label)
    expect(labels).toEqual(['N10', 'N20', 'N30', 'N40', 'N50', 'N60', 'N70', 'N80', 'N90'])
  })

  it('fraction values match percentage', () => {
    const records = [makeRecord('s1', 'A'.repeat(1000))]
    const { nValuePoints } = computeStats(records, 'test.fa', makeOptions())
    expect(nValuePoints[0].fraction).toBe(10)
    expect(nValuePoints[4].fraction).toBe(50)
    expect(nValuePoints[8].fraction).toBe(90)
  })
})

// ---------------------------------------------------------------------------
// Additional: median computation
// ---------------------------------------------------------------------------
describe('Median length computation', () => {
  it('median of odd count', () => {
    // sorted: [100, 200, 300] => median = 200
    const records = [
      makeRecord('a', 'A'.repeat(100)),
      makeRecord('b', 'A'.repeat(200)),
      makeRecord('c', 'A'.repeat(300)),
    ]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.medianLength).toBe(200)
  })

  it('median of even count', () => {
    // sorted: [100, 200, 300, 400] => median = (200+300)/2 = 250
    const records = [
      makeRecord('a', 'A'.repeat(100)),
      makeRecord('b', 'A'.repeat(200)),
      makeRecord('c', 'A'.repeat(300)),
      makeRecord('d', 'A'.repeat(400)),
    ]
    const { stats } = computeStats(records, 'test.fa', makeOptions())
    expect(stats.medianLength).toBe(250)
  })
})
