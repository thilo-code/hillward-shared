import { describe, it, expect } from 'vitest'
import { rangesOverlap } from '../src/dateRange.mjs'
import { findConflicts } from '../src/availability.mjs'

describe('rangesOverlap', () => {
  it('kein Konflikt bei exakter Angrenzung (Ende 18.07. / Start 19.07.)', () => {
    expect(rangesOverlap('2026-07-14', '2026-07-18', '2026-07-19', '2026-07-22')).toBe(false)
  })

  it('Konflikt bei identischem Grenztag (Ende 18.07. / Start 18.07.)', () => {
    expect(rangesOverlap('2026-07-14', '2026-07-18', '2026-07-18', '2026-07-22')).toBe(true)
  })

  it('Konflikt bei vollständiger Umschließung', () => {
    expect(rangesOverlap('2026-07-10', '2026-07-12', '2026-07-01', '2026-07-31')).toBe(true)
    expect(rangesOverlap('2026-07-01', '2026-07-31', '2026-07-10', '2026-07-12')).toBe(true)
  })

  it('Konflikt bei Teilüberlappung vorne', () => {
    expect(rangesOverlap('2026-07-10', '2026-07-20', '2026-07-01', '2026-07-15')).toBe(true)
  })

  it('Konflikt bei Teilüberlappung hinten', () => {
    expect(rangesOverlap('2026-07-01', '2026-07-15', '2026-07-10', '2026-07-20')).toBe(true)
  })

  it('Konflikt bei identischem Eintages-Zeitraum', () => {
    expect(rangesOverlap('2026-07-14', '2026-07-14', '2026-07-14', '2026-07-14')).toBe(true)
  })

  it('kein Konflikt bei komplett getrennten Zeiträumen', () => {
    expect(rangesOverlap('2026-07-01', '2026-07-05', '2026-08-01', '2026-08-05')).toBe(false)
  })
})

describe('findConflicts', () => {
  const existing = [
    { id: 'b1', startDate: '2026-07-14', endDate: '2026-07-16', projectId: 'p1', projectName: 'Birkenstock SS26', projectStatus: 'bestaetigt' },
    { id: 'b2', startDate: '2026-08-01', endDate: '2026-08-05', projectId: 'p2', projectName: 'Adidas', projectStatus: 'angefragt' },
    { id: 'b3', startDate: '2026-07-20', endDate: '2026-07-22', projectId: 'p3', projectName: 'Altes Projekt', projectStatus: 'abgesagt' },
    { id: 'b4', startDate: '2026-07-25', endDate: '2026-07-27', projectId: 'p4', projectName: 'Fertig', projectStatus: 'abgeschlossen' },
  ]

  it('findet Konflikt bei Überschneidung mit blockierendem Projektstatus', () => {
    const conflicts = findConflicts('2026-07-15', '2026-07-15', existing)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].id).toBe('b1')
  })

  it('ignoriert Buchungen mit nicht-blockierendem Status (abgesagt, abgeschlossen)', () => {
    const conflicts = findConflicts('2026-07-20', '2026-07-27', existing)
    expect(conflicts).toHaveLength(0)
  })

  it('ignoriert die per excludeBookingId ausgeschlossene Buchung (z.B. beim Bearbeiten)', () => {
    const conflicts = findConflicts('2026-07-15', '2026-07-15', existing, 'b1')
    expect(conflicts).toHaveLength(0)
  })

  it('findet keinen Konflikt außerhalb aller bestehenden Zeiträume', () => {
    const conflicts = findConflicts('2026-09-01', '2026-09-05', existing)
    expect(conflicts).toHaveLength(0)
  })
})
