const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const MAX_READ_BYTES = 512 * 1024;
const MAX_LINE_LENGTH = 2000;
const DEFAULT_READ_LIMIT = 2000;
const MAX_FILES_LIMIT = 100;
const MAX_GREP_MATCHES = 100;

function expandPath(filePath) {
  const raw = String(filePath || '').trim();
  if (!raw) return '';
  if (raw.startsWith('~/')) return path.join(os.homedir(), raw.slice(2));
  if (raw === '~') return os.homedir();
  return raw;
}

function resolveAgentPath(filePath, baseDir) {
  const expanded = expandPath(filePath);
  const root = expandPath(baseDir || os.homedir());
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(root, expanded);
}

// ============================================================================
// Edit Tool Utilities - Fuzzy matching replacers from opencode
// ============================================================================


// Similarity thresholds for block anchor fallback matching
const SINGLE_CANDIDATE_SIMILARITY_THRESHOLD = 0.0
const MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD = 0.3

/**
 * Levenshtein distance algorithm implementation
 */
function levenshtein(a, b) {
  if (a === '' || b === '') {
    return Math.max(a.length, b.length)
  }
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
    }
  }
  return matrix[a.length][b.length]
}

const SimpleReplacer = function* (_content, find) {
  yield find
}

const LineTrimmedReplacer = function* (content, find) {
  const originalLines = content.split('\n')
  const searchLines = find.split('\n')

  if (searchLines[searchLines.length - 1] === '') {
    searchLines.pop()
  }

  for (let i = 0; i <= originalLines.length - searchLines.length; i++) {
    let matches = true

    for (let j = 0; j < searchLines.length; j++) {
      const originalTrimmed = originalLines[i + j].trim()
      const searchTrimmed = searchLines[j].trim()

      if (originalTrimmed !== searchTrimmed) {
        matches = false
        break
      }
    }

    if (matches) {
      let matchStartIndex = 0
      for (let k = 0; k < i; k++) {
        matchStartIndex += originalLines[k].length + 1
      }

      let matchEndIndex = matchStartIndex
      for (let k = 0; k < searchLines.length; k++) {
        matchEndIndex += originalLines[i + k].length
        if (k < searchLines.length - 1) {
          matchEndIndex += 1
        }
      }

      yield content.substring(matchStartIndex, matchEndIndex)
    }
  }
}

const BlockAnchorReplacer = function* (content, find) {
  const originalLines = content.split('\n')
  const searchLines = find.split('\n')

  if (searchLines.length < 3) {
    return
  }

  if (searchLines[searchLines.length - 1] === '') {
    searchLines.pop()
  }

  const firstLineSearch = searchLines[0].trim()
  const lastLineSearch = searchLines[searchLines.length - 1].trim()
  const searchBlockSize = searchLines.length

  const candidates = []
  for (let i = 0; i < originalLines.length; i++) {
    if (originalLines[i].trim() !== firstLineSearch) {
      continue
    }

    for (let j = i + 2; j < originalLines.length; j++) {
      if (originalLines[j].trim() === lastLineSearch) {
        candidates.push({ startLine: i, endLine: j })
        break
      }
    }
  }

  if (candidates.length === 0) {
    return
  }

  if (candidates.length === 1) {
    const { startLine, endLine } = candidates[0]
    const actualBlockSize = endLine - startLine + 1

    let similarity = 0
    const linesToCheck = Math.min(searchBlockSize - 2, actualBlockSize - 2)

    if (linesToCheck > 0) {
      for (let j = 1; j < searchBlockSize - 1 && j < actualBlockSize - 1; j++) {
        const originalLine = originalLines[startLine + j].trim()
        const searchLine = searchLines[j].trim()
        const maxLen = Math.max(originalLine.length, searchLine.length)
        if (maxLen === 0) {
          continue
        }
        const distance = levenshtein(originalLine, searchLine)
        similarity += (1 - distance / maxLen) / linesToCheck

        if (similarity >= SINGLE_CANDIDATE_SIMILARITY_THRESHOLD) {
          break
        }
      }
    } else {
      similarity = 1.0
    }

    if (similarity >= SINGLE_CANDIDATE_SIMILARITY_THRESHOLD) {
      let matchStartIndex = 0
      for (let k = 0; k < startLine; k++) {
        matchStartIndex += originalLines[k].length + 1
      }
      let matchEndIndex = matchStartIndex
      for (let k = startLine; k <= endLine; k++) {
        matchEndIndex += originalLines[k].length
        if (k < endLine) {
          matchEndIndex += 1
        }
      }
      yield content.substring(matchStartIndex, matchEndIndex)
    }
    return
  }

  let bestMatch = null
  let maxSimilarity = -1

  for (const candidate of candidates) {
    const { startLine, endLine } = candidate
    const actualBlockSize = endLine - startLine + 1

    let similarity = 0
    const linesToCheck = Math.min(searchBlockSize - 2, actualBlockSize - 2)

    if (linesToCheck > 0) {
      for (let j = 1; j < searchBlockSize - 1 && j < actualBlockSize - 1; j++) {
        const originalLine = originalLines[startLine + j].trim()
        const searchLine = searchLines[j].trim()
        const maxLen = Math.max(originalLine.length, searchLine.length)
        if (maxLen === 0) {
          continue
        }
        const distance = levenshtein(originalLine, searchLine)
        similarity += 1 - distance / maxLen
      }
      similarity /= linesToCheck
    } else {
      similarity = 1.0
    }

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity
      bestMatch = candidate
    }
  }

  if (maxSimilarity >= MULTIPLE_CANDIDATES_SIMILARITY_THRESHOLD && bestMatch) {
    const { startLine, endLine } = bestMatch
    let matchStartIndex = 0
    for (let k = 0; k < startLine; k++) {
      matchStartIndex += originalLines[k].length + 1
    }
    let matchEndIndex = matchStartIndex
    for (let k = startLine; k <= endLine; k++) {
      matchEndIndex += originalLines[k].length
      if (k < endLine) {
        matchEndIndex += 1
      }
    }
    yield content.substring(matchStartIndex, matchEndIndex)
  }
}

const WhitespaceNormalizedReplacer = function* (content, find) {
  const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim()
  const normalizedFind = normalizeWhitespace(find)

  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (normalizeWhitespace(line) === normalizedFind) {
      yield line
    } else {
      const normalizedLine = normalizeWhitespace(line)
      if (normalizedLine.includes(normalizedFind)) {
        const words = find.trim().split(/\s+/)
        if (words.length > 0) {
          const pattern = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')
          try {
            const regex = new RegExp(pattern)
            const match = line.match(regex)
            if (match) {
              yield match[0]
            }
          } catch {
            // Invalid regex pattern, skip
          }
        }
      }
    }
  }

  const findLines = find.split('\n')
  if (findLines.length > 1) {
    for (let i = 0; i <= lines.length - findLines.length; i++) {
      const block = lines.slice(i, i + findLines.length)
      if (normalizeWhitespace(block.join('\n')) === normalizedFind) {
        yield block.join('\n')
      }
    }
  }
}

const IndentationFlexibleReplacer = function* (content, find) {
  const removeIndentation = (text) => {
    const lines = text.split('\n')
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
    if (nonEmptyLines.length === 0) return text

    const minIndent = Math.min(
      ...nonEmptyLines.map((line) => {
        const match = line.match(/^(\s*)/)
        return match ? match[1].length : 0
      })
    )

    return lines.map((line) => (line.trim().length === 0 ? line : line.slice(minIndent))).join('\n')
  }

  const normalizedFind = removeIndentation(find)
  const contentLines = content.split('\n')
  const findLines = find.split('\n')

  for (let i = 0; i <= contentLines.length - findLines.length; i++) {
    const block = contentLines.slice(i, i + findLines.length).join('\n')
    if (removeIndentation(block) === normalizedFind) {
      yield block
    }
  }
}

const EscapeNormalizedReplacer = function* (content, find) {
  const unescapeString = (str) => {
    return str.replace(/\\(n|t|r|'|"|`|\\|\n|\$)/g, (match, capturedChar) => {
      switch (capturedChar) {
        case 'n':
          return '\n'
        case 't':
          return '\t'
        case 'r':
          return '\r'
        case "'":
          return "'"
        case '"':
          return '"'
        case '`':
          return '`'
        case '\\':
          return '\\'
        case '\n':
          return '\n'
        case '$':
          return '$'
        default:
          return match
      }
    })
  }

  const unescapedFind = unescapeString(find)

  if (content.includes(unescapedFind)) {
    yield unescapedFind
  }

  const lines = content.split('\n')
  const findLines = unescapedFind.split('\n')

  for (let i = 0; i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join('\n')
    const unescapedBlock = unescapeString(block)

    if (unescapedBlock === unescapedFind) {
      yield block
    }
  }
}

const TrimmedBoundaryReplacer = function* (content, find) {
  const trimmedFind = find.trim()

  if (trimmedFind === find) {
    return
  }

  if (content.includes(trimmedFind)) {
    yield trimmedFind
  }

  const lines = content.split('\n')
  const findLines = find.split('\n')

  for (let i = 0; i <= lines.length - findLines.length; i++) {
    const block = lines.slice(i, i + findLines.length).join('\n')

    if (block.trim() === trimmedFind) {
      yield block
    }
  }
}

const ContextAwareReplacer = function* (content, find) {
  const findLines = find.split('\n')
  if (findLines.length < 3) {
    return
  }

  if (findLines[findLines.length - 1] === '') {
    findLines.pop()
  }

  const contentLines = content.split('\n')

  const firstLine = findLines[0].trim()
  const lastLine = findLines[findLines.length - 1].trim()

  for (let i = 0; i < contentLines.length; i++) {
    if (contentLines[i].trim() !== firstLine) continue

    for (let j = i + 2; j < contentLines.length; j++) {
      if (contentLines[j].trim() === lastLine) {
        const blockLines = contentLines.slice(i, j + 1)
        const block = blockLines.join('\n')

        if (blockLines.length === findLines.length) {
          let matchingLines = 0
          let totalNonEmptyLines = 0

          for (let k = 1; k < blockLines.length - 1; k++) {
            const blockLine = blockLines[k].trim()
            const findLine = findLines[k].trim()

            if (blockLine.length > 0 || findLine.length > 0) {
              totalNonEmptyLines++
              if (blockLine === findLine) {
                matchingLines++
              }
            }
          }

          if (totalNonEmptyLines === 0 || matchingLines / totalNonEmptyLines >= 0.5) {
            yield block
            break
          }
        }
        break
      }
    }
  }
}

const MultiOccurrenceReplacer = function* (content, find) {
  let startIndex = 0

  while (true) {
    const index = content.indexOf(find, startIndex)
    if (index === -1) break

    yield find
    startIndex = index + find.length
  }
}

/**
 * All replacers in order of specificity
 */
const ALL_REPLACERS = [
  SimpleReplacer,
  LineTrimmedReplacer,
  BlockAnchorReplacer,
  WhitespaceNormalizedReplacer,
  IndentationFlexibleReplacer,
  EscapeNormalizedReplacer,
  TrimmedBoundaryReplacer,
  ContextAwareReplacer,
  MultiOccurrenceReplacer
]

/**
 * Replace oldString with newString in content using fuzzy matching
 */
function replaceWithFuzzyMatch(
  content,
  oldString,
  newString,
  replaceAll = false
) {
  if (oldString === newString) {
    throw new Error('old_string and new_string must be different')
  }

  let notFound = true

  for (const replacer of ALL_REPLACERS) {
    for (const search of replacer(content, oldString)) {
      const index = content.indexOf(search)
      if (index === -1) continue
      notFound = false
      if (replaceAll) {
        return content.replaceAll(search, newString)
      }
      const lastIndex = content.lastIndexOf(search)
      if (index !== lastIndex) continue
      return content.substring(0, index) + newString + content.substring(index + search.length)
    }
  }

  if (notFound) {
    throw new Error('old_string not found in content')
  }
  throw new Error(
    'Found multiple matches for old_string. Provide more surrounding lines in old_string to identify the correct match.'
  )
}

// ============================================================================
// Binary File Detection
// ============================================================================

// Check if a file is likely binary
async function isBinaryFile(filePath) {
  try {
    const buffer = Buffer.alloc(4096)
    const fd = await fs.open(filePath, 'r')
    const { bytesRead } = await fd.read(buffer, 0, buffer.length, 0)
    await fd.close()

    if (bytesRead === 0) return false

    const view = buffer.subarray(0, bytesRead)

    let zeroBytes = 0
    let evenZeros = 0
    let oddZeros = 0
    let nonPrintable = 0

    for (let i = 0; i < view.length; i++) {
      const b = view[i]

      if (b === 0) {
        zeroBytes++
        if (i % 2 === 0) evenZeros++
        else oddZeros++
        continue
      }

      // treat common whitespace as printable
      if (b === 9 || b === 10 || b === 13) continue

      // basic ASCII printable range
      if (b >= 32 && b <= 126) continue

      // bytes >= 128 are likely part of UTF-8 sequences; count as printable
      if (b >= 128) continue

      nonPrintable++
    }

    // If there are lots of null bytes, it's probably binary unless it looks like UTF-16 text.
    if (zeroBytes > 0) {
      const evenSlots = Math.ceil(view.length / 2)
      const oddSlots = Math.floor(view.length / 2)
      const evenZeroRatio = evenSlots > 0 ? evenZeros / evenSlots : 0
      const oddZeroRatio = oddSlots > 0 ? oddZeros / oddSlots : 0

      // UTF-16LE/BE tends to have zeros on every other byte.
      if (evenZeroRatio > 0.7 || oddZeroRatio > 0.7) return false

      if (zeroBytes / view.length > 0.05) return true
    }

    // Heuristic: too many non-printable bytes => binary.
    return nonPrintable / view.length > 0.3
  } catch {
    return false
  }
}

// ============================================================================
// Ripgrep Utilities
// ============================================================================



async function runRipgrep(args) {
  const ripgrepBinaryPath = 'rg';

  return new Promise((resolve) => {
    const child = spawn(ripgrepBinaryPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...{} },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString('utf-8')
    })

    child.on('error', () => {
      resolve({ ok: false, stdout: '', exitCode: null })
    })

    child.on('close', (code) => {
      resolve({ ok: true, stdout, exitCode: code })
    })
  })
}
function formatReadOutput(validPath, baseDir, lines, offset, limit) {
  const selectedLines = lines.slice(offset, offset + limit);
  const output = [];
  const relativePath = path.relative(baseDir || os.homedir(), validPath);
  output.push(`File: ${relativePath}`);
  if (offset > 0 || offset + limit < lines.length) {
    output.push(`Lines ${offset + 1} to ${Math.min(offset + limit, lines.length)} of ${lines.length}`);
  }
  output.push('');
  selectedLines.forEach((line, index) => {
    const lineNumber = offset + index + 1;
    const truncatedLine = line.length > MAX_LINE_LENGTH ? line.substring(0, MAX_LINE_LENGTH) + '...' : line;
    output.push(`${lineNumber.toString().padStart(6)}\t${truncatedLine}`);
  });
  if (offset + limit < lines.length) {
    output.push('');
    output.push(`(${lines.length - (offset + limit)} more lines not shown)`);
  }
  return output.join('\n');
}

function formatGrepMatches(matches, truncated) {
  const output = [];
  if (matches.length === 0) {
    output.push('No matches found');
  } else {
    const fileGroups = new Map();
    matches.forEach((match) => {
      if (!fileGroups.has(match.file)) fileGroups.set(match.file, []);
      fileGroups.get(match.file).push(match);
    });
    fileGroups.forEach((fileMatches, filePath) => {
      output.push(`\n${filePath}:`);
      fileMatches.forEach((match) => {
        output.push(`  ${match.line}: ${match.content}`);
      });
    });
    if (truncated) {
      output.push('');
      output.push(`(Results truncated to ${MAX_GREP_MATCHES} matches. Consider using a more specific pattern or path.)`);
    }
  }
  return output.join('\n');
}


module.exports = {
  MAX_LINE_LENGTH,
  DEFAULT_READ_LIMIT,
  MAX_FILES_LIMIT,
  MAX_GREP_MATCHES,
  MAX_READ_BYTES,
  expandPath,
  resolveAgentPath,
  isBinaryFile,
  replaceWithFuzzyMatch,
  runRipgrep,
  formatReadOutput,
  formatGrepMatches,
};
