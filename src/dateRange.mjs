// Portiert aus hillward-rental/src/lib/dateRange.ts (nur rangesOverlap — isWithinRange/overlapDays
// werden nur von hillward-rental selbst gebraucht und bleiben dort).

/** Datumsstrings im Format 'YYYY-MM-DD' lassen sich lexikografisch vergleichen. */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && aEnd >= bStart
}
