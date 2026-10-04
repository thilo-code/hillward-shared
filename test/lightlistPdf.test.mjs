import { describe, it, expect } from 'vitest'
import {
  buildLightlistRows, summarizeLightlist, rentalSectionFor, groupLightlistSections, sourceKind, formatRange,
  lightlistFromLightbase, lightlistFromRental, renderLightlistHtml, transportLabel,
} from '../src/lightlistPdf.mjs'

const projekt = {
  cfg: { name: 'The Heg', tpl: 'empty', meta: {
    dreh: { start: '2026-10-04T22:00:00.000Z', end: '2026-10-04T22:00:00.000Z' },
    ausleihe: { start: '2026-10-01T22:00:00.000Z', end: null },
    rueckleihe: { start: '2026-10-05T22:00:00.000Z', end: null } } },
  list: { items: [
    { qty: 1, name: 'Aputure STORM 700x', source: 'Rent', section: 'Licht', note: '' },
    { qty: 4, name: 'Gobo Extension lang', source: 'Hillward', section: 'Grip', note: 'ÄNDERUNG', qtyRent: 4 },
    { qty: 6, name: 'Sandsack', source: 'Hillward', section: 'Grip', note: '' },
  ] },
  ref: { number: 2683 },
}

describe('sourceKind', () => {
  it('erkennt Hillward, Rent und offene Quelle', () => {
    expect(sourceKind('Hillward')).toBe('hillward')
    expect(sourceKind('Technik von Hillward')).toBe('hillward')
    expect(sourceKind('Rent')).toBe('rent')
    expect(sourceKind('')).toBe('other')
    expect(sourceKind(null)).toBe('other')
  })
})

describe('buildLightlistRows', () => {
  it('teilt Hillward-Positionen mit qtyRent wie das Equipment-Sheet', () => {
    const rows = buildLightlistRows(projekt.list.items)
    expect(rows.filter((r) => r.name === 'Gobo Extension lang').map((r) => [r.qty, r.source]))
      .toEqual([[0, 'Hillward'], [4, 'Rent']])
  })
})

describe('summarizeLightlist', () => {
  it('zählt Menge-0-Zeilen nicht mit und weist Miete aus', () => {
    const s = summarizeLightlist(buildLightlistRows(projekt.list.items))
    expect(s).toEqual({ positions: 3, quantity: 11, rentPositions: 2, rentQuantity: 5, removed: 1 })
  })
})

describe('groupLightlistSections', () => {
  it('behält die Eingangsreihenfolge oder sortiert nach Standard', () => {
    const rows = [{ section: 'Grip', qty: 1 }, { section: 'Licht', qty: 1 }, { section: 'Extra', qty: 1 }]
    expect(groupLightlistSections(rows).map((s) => s.name)).toEqual(['Grip', 'Licht', 'Extra'])
    expect(groupLightlistSections(rows, 'standard').map((s) => s.name)).toEqual(['Licht', 'Grip', 'Extra'])
  })
})

describe('formatRange', () => {
  it('formatiert in Europe/Berlin, ein Tag ohne Bis-Datum', () => {
    expect(formatRange('2026-10-12T22:00:00.000Z', '2026-10-15T22:00:00.000Z')).toBe('13.10.2026 – 16.10.2026')
    expect(formatRange('2026-10-04T22:00:00.000Z', '2026-10-04T22:00:00.000Z')).toBe('05.10.2026')
    expect(formatRange('2026-10-08', null, '14:00–17:00 Uhr')).toBe('08.10.2026 14:00–17:00 Uhr')
  })
})

describe('lightlistFromLightbase', () => {
  it('übernimmt Name, Nummer und Zeiträume aus projekt.json', () => {
    const d = lightlistFromLightbase(projekt)
    expect(d).toMatchObject({ number: 2683, name: 'The Heg', vorlage: '', dreh: '05.10.2026',
      ausleihe: '02.10.2026 14:00–17:00 Uhr', rueckleihe: '06.10.2026 10:00–12:00 Uhr' })
  })
})

describe('lightlistFromRental', () => {
  it('fasst Buchungen je Typ zusammen und hängt Fremdmiete an', () => {
    const d = lightlistFromRental({
      project: { name: 'Test', start_date: '2026-10-13', end_date: '2026-10-16' }, number: 2690,
      itemTypes: [{ id: 'a', name: 'Aputure STORM 1200X', category: 'licht' }, { id: 'b', name: 'Stahlsack', category: 'grip' }],
      bookings: [{ item_type_id: 'a', quantity: null }, { item_type_id: 'a', quantity: null }, { item_type_id: 'b', quantity: 8 }],
      externalItems: [{ name: 'C-Stand 40\'', quantity: 4, section: 'Grip', vendor: 'Rent' }],
    })
    expect(d.dreh).toBe('13.10.2026 – 16.10.2026')
    expect(d.items).toEqual([
      { section: 'Licht', name: 'Aputure STORM 1200X', qty: 2, source: 'Hillward', note: '' },
      { section: 'Grip', name: 'Stahlsack', qty: 8, source: 'Hillward', note: '' },
      { section: 'Grip', name: "C-Stand 40'", qty: 4, source: 'Rent', note: '' },
    ])
  })
})

describe('renderLightlistHtml', () => {
  it('escaped Nutzereingaben und rendert Kennzahlen', () => {
    const html = renderLightlistHtml({ ...lightlistFromLightbase(projekt), name: '<b>X</b>' }, { stand: '02.10.2026' })
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(html).not.toContain('<b>X</b>')
    expect(html).toContain('<div class="k">Positionen</div><div class="v">3</div>')
    expect(html).not.toContain('Eigenbestand</div>')
  })
  it('zeigt einen Hinweis bei leerer Liste', () => {
    const html = renderLightlistHtml(lightlistFromLightbase({ cfg: { name: 'Leer' }, list: { items: [] }, ref: {} }))
    expect(html).toContain('Noch keine Positionen')
  })
})

describe('Rubriken', () => {
  it('führt die alte Rubrik „Hillward“ unter „Licht“', () => {
    const rows = buildLightlistRows([{ section: 'Hillward', qty: 2, name: 'Aputure STORM 1200X', source: 'Hillward' }])
    expect(rows[0].section).toBe('Licht')
  })
  it('ordnet zubehoer Lichtformer bzw. Butterfly zu', () => {
    expect(rentalSectionFor({ category: 'zubehoer', name: 'DopChoice Octa 3 for Bowens Mount' })).toBe('Lichtformer')
    expect(rentalSectionFor({ category: 'zubehoer', name: 'Dome' })).toBe('Lichtformer')
    expect(rentalSectionFor({ category: 'zubehoer', name: '12x12 China Silk' })).toBe('Butterfly')
    expect(rentalSectionFor({ category: 'zubehoer', name: '20x20 Full Grid Cloth' })).toBe('Butterfly')
    expect(rentalSectionFor({ category: 'kabel', name: 'Schuko 10m' })).toBe('Strom')
    expect(rentalSectionFor({ category: 'steuerung', name: '3 KW Handdimmer DMX' })).toBe('Lichtsteuerung')
  })
  it('weist leere Quelle als SONSTIGES aus', () => {
    const html = renderLightlistHtml({ number: 1, name: 'x', items: [{ section: 'Lichtformer', qty: 2, name: 'Floppy UB', source: '' }] })
    expect(html).toContain('<span class="t">SONSTIGES</span>')
  })
})

describe('Transport', () => {
  it('übersetzt meta.transporter aus lightbase', () => {
    expect(transportLabel('E-Sprinter')).toBe('Hillward E-Sprinter')
    expect(transportLabel('Hillward Transporter')).toBe('Hillward E-Sprinter')
    expect(transportLabel('Miettransporter')).toBe('Mietsprinter')
    expect(transportLabel('')).toBe('Offen')
  })
  it('steht im Kopfbereich beider Adapter', () => {
    const p = { ...projekt, cfg: { ...projekt.cfg, meta: { ...projekt.cfg.meta, transporter: 'Miettransporter' } } }
    expect(lightlistFromLightbase(p).transport).toBe('Mietsprinter')
    expect(lightlistFromRental({ project: { name: 'x' } }).transport).toBe('Offen')
    expect(lightlistFromRental({ project: { name: 'x' }, transport: 'Hillward E-Sprinter' }).transport).toBe('Hillward E-Sprinter')
    expect(renderLightlistHtml(lightlistFromLightbase(p))).toContain('<div class="k">Transport</div><div class="v">Mietsprinter</div>')
  })
})
