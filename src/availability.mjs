// Portiert aus hillward-rental/src/lib/availability.ts — kanonische Quelle für
// BLOCKING_PROJECT_STATUSES ist jetzt hier (hillward-rental importiert sie zurück).
//
// Unvermeidbare Restdopplung: dieselbe Statusliste steht auch als literale SQL-Bedingung in
// hillward-rental/drizzle/0010_booking_overlap_constraint.sql (DB-Trigger für is_blocking).
// SQL kann keine JS-Konstante importieren — bei Änderung der Statusliste beide Stellen anpassen.
import { rangesOverlap } from './dateRange.mjs'

export const BLOCKING_PROJECT_STATUSES = ['angefragt', 'bestaetigt', 'laufend']

/** @typedef {{ id: string, startDate: string, endDate: string, projectId: string, projectName: string, projectStatus: string }} ExistingBooking */

function isBlocking(status) {
  return BLOCKING_PROJECT_STATUSES.includes(status)
}

/**
 * Findet alle bestehenden Buchungen, die sich mit dem angefragten Zeitraum überschneiden
 * und deren Projekt einen blockierenden Status hat (angefragt, bestaetigt, laufend).
 * Buchungen mit `excludeBookingId` (z.B. die gerade bearbeitete Buchung selbst) werden ignoriert.
 * @param {string} candidateStart
 * @param {string} candidateEnd
 * @param {ExistingBooking[]} existing
 * @param {string} [excludeBookingId]
 * @returns {ExistingBooking[]}
 */
export function findConflicts(candidateStart, candidateEnd, existing, excludeBookingId) {
  return existing.filter((b) => {
    if (excludeBookingId && b.id === excludeBookingId) return false
    if (!isBlocking(b.projectStatus)) return false
    return rangesOverlap(candidateStart, candidateEnd, b.startDate, b.endDate)
  })
}
