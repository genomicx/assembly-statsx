import type { AssemblyRecord } from './types'

/**
 * Parse a FASTA-format string into AssemblyRecord[].
 * Header lines start with '>'. The id is the first whitespace-delimited
 * token after '>'. Sequence spans multiple lines; each line is trimmed and
 * empty lines are skipped. Case is preserved.
 */
export function parseFastaString(text: string): AssemblyRecord[] {
  const records: AssemblyRecord[] = []
  let currentId: string | null = null
  const seqParts: string[] = []

  const lines = text.split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.startsWith('>')) {
      // Save previous record if any
      if (currentId !== null) {
        records.push({ id: currentId, sequence: seqParts.join('') })
        seqParts.length = 0
      }
      // Parse id: first whitespace-delimited token after '>'
      const header = line.slice(1).trimStart()
      currentId = header.split(/\s+/)[0] ?? ''
    } else if (currentId !== null) {
      const trimmed = line.trim()
      if (trimmed.length > 0) {
        seqParts.push(trimmed)
      }
    }
  }

  // Push final record
  if (currentId !== null) {
    records.push({ id: currentId, sequence: seqParts.join('') })
  }

  return records
}

/**
 * Parse a FASTQ-format string into AssemblyRecord[].
 * Format is 4-line blocks: @id, sequence, +, quality.
 * The id is the full line after '@' (no splitting).
 * Case is preserved.
 */
export function parseFastqString(text: string): AssemblyRecord[] {
  const records: AssemblyRecord[] = []
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    // Skip blank lines between records
    const idLine = lines[i]?.trimEnd()
    if (!idLine) {
      i++
      continue
    }
    if (!idLine.startsWith('@')) {
      i++
      continue
    }

    const id = idLine.slice(1) // everything after '@'
    const sequence = (lines[i + 1] ?? '').trimEnd()
    // lines[i+2] is '+' separator — skip
    // lines[i+3] is quality — skip

    if (sequence.length > 0) {
      records.push({ id, sequence })
    }

    i += 4
  }

  return records
}

/**
 * Read a File and return parsed AssemblyRecord[].
 * - Detects .gz extension and decompresses via DecompressionStream('gzip').
 * - Detects FASTQ if the filename (after stripping .gz) ends with .fastq or .fq.
 * - Otherwise parses as FASTA.
 * Returns { filename: display name without .gz, records }.
 */
export async function parseAssemblyFile(
  file: File,
): Promise<{ filename: string; records: AssemblyRecord[] }> {
  let displayName = file.name

  // Strip .gz from display name and determine if we need decompression
  const isGz = displayName.toLowerCase().endsWith('.gz')
  if (isGz) {
    displayName = displayName.slice(0, -3)
  }

  // Determine format from the (possibly stripped) filename
  const lowerDisplay = displayName.toLowerCase()
  const isFastq = lowerDisplay.endsWith('.fastq') || lowerDisplay.endsWith('.fq')

  // Read the raw bytes
  const arrayBuffer = await file.arrayBuffer()

  let text: string
  if (isGz) {
    // Decompress using the browser DecompressionStream API
    const ds = new DecompressionStream('gzip')
    const writer = ds.writable.getWriter()
    const reader = ds.readable.getReader()

    // Write compressed data
    writer.write(new Uint8Array(arrayBuffer))
    writer.close()

    // Read all decompressed chunks
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // Concatenate and decode
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }
    text = new TextDecoder('utf-8').decode(combined)
  } else {
    text = new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer))
  }

  const records = isFastq ? parseFastqString(text) : parseFastaString(text)

  return { filename: displayName, records }
}
