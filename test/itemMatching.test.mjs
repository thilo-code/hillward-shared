import { describe, it, expect } from 'vitest'
import { normalizeName, findMatchingType, isHillwardSource } from '../src/itemMatching.mjs'

describe('normalizeName', () => {
  it('lowercases, trims, collapses whitespace and strips trailing punctuation', () => {
    expect(normalizeName('  Aputure   STORM 1200X.  ')).toBe('aputure storm 1200x')
  })
})

describe('findMatchingType', () => {
  const types = [
    { id: '1', name: 'Aputure STORM 1200X', aliases: null },
    { id: '2', name: 'Schuko Verlängerung 10 m', aliases: ['Schuko 10m', 'Schuko 10 m'] },
  ]

  it('matches by exact normalized name', () => {
    expect(findMatchingType(types, 'aputure storm 1200x')?.id).toBe('1')
  })

  it('matches by alias', () => {
    expect(findMatchingType(types, 'Schuko 10m')?.id).toBe('2')
  })

  it('returns undefined when nothing matches', () => {
    expect(findMatchingType(types, 'Onko Bonko Set')).toBeUndefined()
  })
})

describe('isHillwardSource', () => {
  it('treats a missing source as Hillward (compatibility default)', () => {
    expect(isHillwardSource(undefined)).toBe(true)
  })

  it('matches the plain "Hillward" source', () => {
    expect(isHillwardSource('Hillward')).toBe(true)
  })

  it('matches Hillward-variant strings instead of requiring an exact match', () => {
    expect(isHillwardSource('Technik von Hillward')).toBe(true)
    expect(isHillwardSource('Hillward GmbH')).toBe(true)
  })

  it('does not match genuine external vendors', () => {
    expect(isHillwardSource('Spottlight')).toBe(false)
    expect(isHillwardSource('Rent')).toBe(false)
  })
})
