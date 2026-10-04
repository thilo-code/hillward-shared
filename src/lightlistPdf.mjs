// Hillward Lightlist – PDF-Vorlage (gemeinsam für lightbase und hillward-rental).
// Reines ESM, kein DOM nötig: renderLightlistHtml() liefert ein komplettes HTML-Dokument als String.
// Daraus wird das PDF entweder im Browser gedruckt (printLightlistHtml) oder serverseitig mit Chromium gerendert.
// Benötigt Chromium >= 133 (text-box-trim, @page-Randboxen). Safari/Firefox drucken ohne Fußzeile.
//
// Schriften liegen NICHT in diesem (öffentlichen) Repo – Lizenz. Jede App stellt sie selbst bereit:
//   fontBaseUrl: '/fonts/'  -> erwartet StaffGrotesk-Regular.woff2, StaffWide-Regular.woff2, StaffWide-Medium.woff2
//   optional StaffXWide-Medium.woff2 (nur mit Web-Lizenz; sonst Fallback auf Staff Wide Medium)
//   oder fontCss: eigener @font-face-Block (z.B. base64 für serverseitiges Rendering)

import { isHillwardSource } from './itemMatching.mjs'

const LOGO_PATHS = "<path d=\"M3.95,6.2v7.2h14.55v-7.2h3.94v17.9h-3.94v-7.55H3.95v7.55H0V6.2h3.95Z\"/><path d=\"M25.61,6.26h3.7v3.44h-3.7v-3.44ZM25.62,11.6h3.66v12.5h-3.66v-12.5Z\"/><path d=\"M36.14,6.2v17.9h-3.66V6.2h3.66Z\"/><path d=\"M43,6.2v17.9h-3.66V6.2h3.66Z\"/><path d=\"M71.95,11.6l-5.21,12.5h-4.34l-3.84-9.19-3.82,9.19h-4.39l-5.22-12.5h3.87l3.69,9.52,3.94-9.52h3.97l3.95,9.52,3.7-9.52h3.7Z\"/><path d=\"M90.42,16.36v7.74h-3.51v-2.19c-1.31,1.46-4.1,2.49-7.46,2.49-4.1,0-6.52-1.29-6.52-3.99,0-2.26,1.72-3.31,4.49-3.87,2.59-.51,5.76-.77,9.32-.86-.27-1.21-1.45-2-4.6-2s-4.64.67-4.85,2h-3.74c.26-3,3.02-4.37,8.5-4.37,5.87,0,8.37,1.72,8.37,5.06ZM86.81,18.47v-.69c-2.97.14-5.57.38-7.37.7-1.82.34-2.75.84-2.75,1.76,0,1.12,1.35,1.59,3.54,1.59,3.72,0,6.59-1.45,6.59-3.36Z\"/><path d=\"M104.58,11.6v2.91h-2.31c-3.54,0-4.99,1.92-4.99,4.16v5.42h-3.66v-12.5h3.55v2.7c.98-1.67,2.85-2.7,5.36-2.7h2.05Z\"/><path d=\"M124.9,6.2v17.9h-3.54v-2.14c-1.39,1.51-3.81,2.44-7.1,2.44-5.44,0-8.45-2.51-8.45-6.52s2.99-6.57,8.52-6.57c3.15,0,5.5.8,6.9,2.09v-7.19h3.66ZM121.29,17.82c0-2.31-2.02-3.85-6-3.85s-5.7,1.56-5.7,3.87,1.66,3.87,5.67,3.87,6.02-1.59,6.02-3.85v-.05Z\"/><path d=\"M132.39,3.6l.84-3.6.84,3.6c.2.87.89,1.56,1.76,1.76l3.6.84-3.6.84c-.87.2-1.56.89-1.76,1.76l-.84,3.6-.84-3.6c-.2-.87-.89-1.56-1.76-1.76l-3.6-.84,3.6-.84c.87-.2,1.56-.89,1.76-1.76Z\"/>"
const STAR_PATH = 'M5.06,3.6l.84-3.6.84,3.6c.2.87.89,1.56,1.76,1.76l3.6.84-3.6.84c-.87.2-1.56.89-1.76,1.76l-.84,3.6-.84-3.6c-.2-.87-.89-1.56-1.76-1.76l-3.6-.84,3.6-.84c.87-.2,1.56-.89,1.76-1.76Z'
/** Grundlinie der Logo-Buchstaben im ViewBox (gemessen): Logo sitzt in der Fußzeile auf derselben Linie wie der Text. */
const LOGO_BASELINE = 24.09

/** Standard-Reihenfolge der Rubriken; unbekannte Rubriken folgen in Eingangsreihenfolge. */
export const LIGHTLIST_SECTION_ORDER = ['Licht', 'Lichtsteuerung', 'Lichtformer', 'Butterfly', 'Grip', 'Strom', 'Folien', 'Sonstiges']

/** Zuordnung item_types.category (hillward-rental) -> Rubrik. Überschreibbar per Option sectionForCategory. */
export const RENTAL_CATEGORY_SECTIONS = {
  licht: 'Licht', grip: 'Grip', strom: 'Strom', kabel: 'Strom',
  zubehoer: 'Lichtformer', steuerung: 'Lichtsteuerung', sonstiges: 'Sonstiges',
}

/** Rubrik für einen Katalog-Typ aus hillward-rental. Butterfly-Stoffe/-Rahmen („12x12 …“, „20x20 …“) liegen in
 *  zubehoer, gehören aber in die Rubrik Butterfly; Softboxen, Domes, Flags usw. sind Lichtformer. */
export function rentalSectionFor(itemType) {
  const cat = String(itemType?.category ?? '').toLowerCase()
  if (cat === 'zubehoer' && /^\d{1,2}\s?x\s?\d{1,2}\b/i.test(String(itemType?.name ?? '').trim())) return 'Butterfly'
  return RENTAL_CATEGORY_SECTIONS[cat] ?? 'Sonstiges'
}

/** Alte Lightbase-Rubrik „Hillward“ gibt es nicht mehr – Eigenbestand läuft unter „Licht“. */
function normalizeSection(section) {
  const s = String(section ?? '').trim()
  if (!s) return 'Sonstiges'
  return s.toLowerCase() === 'hillward' ? 'Licht' : s
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** 'hillward' | 'rent' | 'other' – leere Quelle wird (vorerst) als „Sonstiges“ ausgewiesen. */
export function sourceKind(source) {
  if (source == null || String(source).trim() === '') return 'other'
  return isHillwardSource(source) ? 'hillward' : 'rent'
}

/** Datum (ISO-String, Date oder 'YYYY-MM-DD') -> 'TT.MM.JJJJ' in Europe/Berlin. */
export function formatDate(value) {
  if (!value) return ''
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T12:00:00Z') : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Zeitraum -> 'TT.MM.JJJJ – TT.MM.JJJJ' (ein Tag: nur ein Datum), optional mit Zeitfenster. */
export function formatRange(start, end, zeit) {
  const a = formatDate(start), b = formatDate(end)
  const r = a && b && b !== a ? `${a} – ${b}` : a || b
  return r && zeit ? `${r} ${zeit}` : r
}

/**
 * Normalisiert Positionen. Eine Hillward-Position mit qtyRent wird – wie im Lightbase-Equipment-Sheet –
 * in eine Hillward-Zeile (qty − qtyRent) und eine Rent-Zeile (qtyRent) geteilt.
 * @param {Array<{section?:string, qty:number|string, name:string, source?:string, note?:string, qtyRent?:number}>} items
 */
export function buildLightlistRows(items = []) {
  const out = []
  for (const it of items) {
    const qty = Number(it.qty) || 0
    const qtyRent = Number(it.qtyRent) || 0
    const base = { section: normalizeSection(it.section), name: it.name ?? '', note: it.note ?? '' }
    if (qtyRent > 0 && sourceKind(it.source) === 'hillward') {
      out.push({ ...base, qty: Math.max(qty - qtyRent, 0), source: 'Hillward' })
      out.push({ ...base, qty: qtyRent, source: 'Rent' })
    } else {
      out.push({ ...base, qty, source: it.source ?? '' })
    }
  }
  return out
}

/** Kennzahlen: Positionen mit Menge 0 (entfernt) zählen nicht mit. */
export function summarizeLightlist(rows) {
  const active = rows.filter((r) => r.qty > 0)
  const sum = (a) => a.reduce((s, r) => s + r.qty, 0)
  const rent = active.filter((r) => sourceKind(r.source) === 'rent')
  return {
    positions: active.length, quantity: sum(active),
    rentPositions: rent.length, rentQuantity: sum(rent),
    removed: rows.length - active.length,
  }
}

/** Gruppiert nach Rubrik. order: 'input' (Lightbase-Reihenfolge) oder 'standard' (LIGHTLIST_SECTION_ORDER). */
export function groupLightlistSections(rows, order = 'input') {
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.section)) map.set(r.section, [])
    map.get(r.section).push(r)
  }
  const names = [...map.keys()]
  if (order === 'standard') {
    const idx = (n) => { const i = LIGHTLIST_SECTION_ORDER.indexOf(n); return i < 0 ? LIGHTLIST_SECTION_ORDER.length : i }
    names.sort((a, b) => idx(a) - idx(b))
  }
  return names.map((name) => ({ name, rows: map.get(name) }))
}

/**
 * Transport-Angabe fuer den Kopfbereich. lightbase speichert meta.transporter als
 * 'E-Sprinter' (eigener Transporter), 'Miettransporter' oder leer (noch offen).
 */
export function transportLabel(value) {
  const v = String(value ?? '').trim()
  if (!v) return 'Offen'
  if (/^(e-sprinter|hillward transporter)$/i.test(v)) return 'Hillward E-Sprinter'
  if (/miet/i.test(v)) return 'Mietsprinter'
  return v
}

/**
 * Adapter Lightbase: projekt.json ({ cfg, list, ref }) -> Lightlist-Daten.
 * @param {object} projekt
 * @param {{vorlage?:string, ausleiheZeit?:string, rueckleiheZeit?:string}} [opts]
 */
export function lightlistFromLightbase(projekt, opts = {}) {
  const cfg = projekt?.cfg ?? {}, meta = cfg.meta ?? {}, ref = projekt?.ref ?? {}
  return {
    number: ref.number ?? '',
    name: cfg.name ?? '',
    vorlage: opts.vorlage ?? (cfg.tpl && cfg.tpl !== 'empty' ? cfg.tpl : ''),
    dreh: formatRange(meta.dreh?.start, meta.dreh?.end),
    ausleihe: formatRange(meta.ausleihe?.start, meta.ausleihe?.end, opts.ausleiheZeit ?? '14:00–17:00 Uhr'),
    rueckleihe: formatRange(meta.rueckleihe?.start, meta.rueckleihe?.end, opts.rueckleiheZeit ?? '10:00–12:00 Uhr'),
    transport: transportLabel(meta.transporter),
    sectionOrder: 'input',
    items: (projekt?.list?.items ?? []).map((i) => ({ section: i.section, qty: i.qty, name: i.name, source: i.source, note: i.note, qtyRent: i.qtyRent })),
  }
}

/**
 * Adapter hillward-rental: Projekt + Buchungen (Eigenbestand) + external_items (Miete) -> Lightlist-Daten.
 * bookings: { item_type_id, quantity } (quantity null = Einzelgerät = 1), gleiche Typen werden zusammengefasst.
 * @param {{ project:object, number?:string|number, bookings?:object[], itemTypes?:object[], externalItems?:object[],
 *           ausleihe?:string, rueckleihe?:string, transport?:string, vorlage?:string, sectionForCategory?:(category:string, itemType:object)=>string }} input
 */
export function lightlistFromRental({ project = {}, number, bookings = [], itemTypes = [], externalItems = [],
  ausleihe = '', rueckleihe = '', transport = '', vorlage = '', sectionForCategory } = {}) {
  const typeById = new Map(itemTypes.map((t) => [t.id, t]))
  const toSection = sectionForCategory ? (t) => sectionForCategory(t.category, t) : rentalSectionFor
  const own = new Map()
  for (const b of bookings) {
    const t = typeById.get(b.item_type_id)
    if (!t) continue
    const prev = own.get(t.id) ?? { section: toSection(t), name: t.name, qty: 0, source: 'Hillward', note: '' }
    prev.qty += b.quantity == null ? 1 : Number(b.quantity) || 0
    own.set(t.id, prev)
  }
  const ext = externalItems.map((e) => ({
    section: e.section || 'Sonstiges', name: e.name, qty: Number(e.quantity) || 0,
    source: e.vendor && sourceKind(e.vendor) !== 'other' ? e.vendor : 'Rent', note: '',
  }))
  return {
    number: number ?? project.external_id ?? '',
    name: project.name ?? '',
    vorlage,
    dreh: formatRange(project.start_date, project.end_date),
    ausleihe, rueckleihe,
    transport: transport || 'Offen',
    sectionOrder: 'standard',
    items: [...own.values(), ...ext],
  }
}

function logoSvg(color, height) {
  return `<svg class="logo" viewBox="0 0 139.43 24.4" style="height:${height};fill:${color}">${LOGO_PATHS}</svg>`
}
function star(cls, color) {
  return `<svg class="${cls}" viewBox="0 0 11.8 12.4"><path fill="${color}" d="${STAR_PATH}"/></svg>`
}
function srcTag(source) {
  const k = sourceKind(source)
  if (k === 'hillward') return `<span class="tag tag-hw">${star('tstar', '#fff')}<span class="t">HW</span></span>`
  if (k === 'rent') return '<span class="tag tag-rent"><span class="t">RENT</span></span>'
  return '<span class="tag tag-open"><span class="t">SONSTIGES</span></span>'
}
function noteTag(note) {
  if (!note) return ''
  const u = String(note).toUpperCase()
  const cls = u === 'NEU' ? 't-new' : u.includes('RAUS') ? 't-out' : u.includes('MEHR') ? 't-plus' : u.includes('WENIGER') ? 't-minus' : 't-chg'
  return `<span class="tag note ${cls}"><span class="t">${esc(u)}</span></span>`
}

function fontFaces(fontBaseUrl = 'fonts/') {
  const u = (f) => `${fontBaseUrl}${f}`
  return `@font-face{font-family:'HW Grotesk';font-weight:400;src:url(${u('StaffGrotesk-Regular.woff2')}) format('woff2');}
@font-face{font-family:'HW Wide';font-weight:400;src:url(${u('StaffWide-Regular.woff2')}) format('woff2');}
@font-face{font-family:'HW Wide';font-weight:500;src:url(${u('StaffWide-Medium.woff2')}) format('woff2');}
@font-face{font-family:'HW XWide';font-weight:500;src:local('Staff X Wide Medium'),local('StaffXWide-Medium'),url(${u('StaffXWide-Medium.woff2')}) format('woff2'),url(${u('StaffWide-Medium.woff2')}) format('woff2');}`
}

const CSS = `:root { --ink:#000; --g1:#f3f3f1; --g2:#d9d9d6; --g3:#8a8a86; --g4:#55554f; }
@page { size:A4; margin:60px 0 76px 0; }
@page :first { margin-top:0; }
* { box-sizing:border-box; margin:0; padding:0; }
html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { padding:0 14mm; font-family:'HW Grotesk',sans-serif; font-variant-numeric:tabular-nums; font-feature-settings:'tnum' 1; color:var(--ink); font-size:9pt; line-height:1.3; }

.hero { background:var(--ink); color:#fff; margin:0 -14mm; padding:13mm 14mm 11mm; position:relative; overflow:hidden; height:342px; display:flex; flex-direction:column; }
.hero-top { display:flex; justify-content:space-between; align-items:center; }
.logo { display:block; }
.kicker { font-family:'HW Wide'; font-size:6.5pt; letter-spacing:.22em; text-transform:uppercase; color:#bdbdb8; }
.hero h1 { font-family:'HW XWide'; font-weight:500; line-height:1.05; letter-spacing:-.01em; margin-top:17mm; max-width:150mm; }
.hero .sub { font-family:'HW Wide'; font-size:9.5pt; color:#cfcfca; margin-top:3mm; }
.bigstar { position:absolute; right:-6mm; top:12mm; width:62mm; height:62mm; opacity:.13; }
.stats { margin-top:auto !important; display:grid; grid-template-columns:1fr 1fr 1.4fr; font-variant-numeric:proportional-nums; font-feature-settings:'pnum' 1; margin-top:10mm; border-top:.5pt solid #444; }
.stat { padding:3.2mm 4mm 0 0; }
.stat + .stat { padding-left:4mm; border-left:.5pt solid #444; }
.stat .k { white-space:nowrap; font-family:'HW Wide'; font-size:6pt; letter-spacing:.16em; text-transform:uppercase; color:#9a9a95; }
.stat .v { font-family:'HW XWide'; font-weight:500; font-size:15pt; margin-top:1.6mm; white-space:nowrap; }
.stat .v small { font-family:'HW Wide'; font-size:7.5pt; color:#bdbdb8; margin-left:1mm; }

.logi { display:grid; grid-template-columns:1fr 1.25fr 1.25fr 0.95fr; height:62px; align-items:stretch; box-shadow:inset 0 -.5pt 0 var(--g2); }
.lg { padding:4mm 4mm 3.6mm 0; }
.lg + .lg { padding-left:4mm; border-left:.5pt solid var(--g2); }
.lg .k { font-family:'HW Wide'; font-size:6pt; letter-spacing:.16em; text-transform:uppercase; color:var(--g3); }
.lg .v { font-family:'HW Wide'; font-weight:500; font-size:8.6pt; margin-top:1.5mm; white-space:nowrap; font-variant-numeric:proportional-nums; font-feature-settings:'pnum' 1; }

.legend { display:flex; gap:6mm; align-items:center; height:38px; padding:4px 0 0; font-size:7.5pt; color:var(--g4); }
.legend .item { display:flex; align-items:center; gap:2mm; }
.legend .item > .lbl { display:block; line-height:1; text-box:trim-both cap alphabetic; }
.legend .note { margin-left:auto; color:var(--g3); }

.cat { break-inside:avoid; margin-top:34px; }
.cat-head { display:flex; justify-content:space-between; align-items:flex-end; height:30px; padding-bottom:9px; box-shadow:inset 0 -2px 0 var(--ink); }
.cat-title { display:flex; align-items:baseline; gap:3mm; }
.cat-no { font-family:'HW Wide'; font-size:7pt; color:var(--g3); letter-spacing:.08em; }
.cat h2 { font-family:'HW XWide'; font-weight:500; font-size:13pt; letter-spacing:.02em; text-transform:uppercase; line-height:1; }
.cat-meta { font-family:'HW Wide'; font-size:7pt; color:var(--g4); }
.cat-meta .dot { color:var(--g3); padding:0 .6mm; }

table { width:100%; border-collapse:separate; border-spacing:0; table-layout:fixed; }
th { font-family:'HW Wide'; font-weight:400; font-size:5.8pt; letter-spacing:.18em; text-transform:uppercase; color:var(--g3); text-align:left; height:23px; line-height:1; padding:0 2mm 7px 0; vertical-align:bottom; border-bottom:.5pt solid var(--g2); }
td { height:25px; padding:0; border-bottom:.5pt solid var(--g2); vertical-align:middle; }
td .cell { display:flex; align-items:center; height:25px; padding-right:2mm; min-width:0; }
td.qty .cell { justify-content:flex-end; padding-right:4mm; }
th.qty { text-align:right; padding-right:calc(5.6mm - .18em); white-space:nowrap; }
.t { display:block; line-height:1; text-box:trim-both cap alphabetic; white-space:nowrap; }
td.qty .t { font-family:'HW Wide'; font-weight:500; font-size:9pt; }
td.art .t { font-size:9.2pt; overflow:hidden; text-overflow:ellipsis; min-width:0; padding:.4em 0; }
tr.is-out td.qty, tr.is-out td.art { color:var(--g3); }
tr.is-out td.art .t { text-decoration:line-through; text-decoration-thickness:.6pt; }
tr.is-out .tag-hw, tr.is-out .tag-rent { opacity:.45; }

.tag { display:inline-flex; align-items:center; justify-content:center; gap:1mm; flex:none; white-space:nowrap; font-family:'HW Wide'; font-weight:500; font-size:5.6pt; letter-spacing:.14em; height:13px; padding:0 1.65mm 0 1.8mm; }
.tag .t { margin-right:-.14em; }
.tag-hw { background:var(--ink); color:#fff; border:.6pt solid var(--ink); }
.tag-rent { border:.6pt solid #9a9a95; color:var(--g4); }
.tag-open { border:.6pt dashed #9a9a95; color:var(--g3); }
.tstar { display:block; width:2.1mm; height:2.2mm; flex:none; }
.note.t-new { background:var(--ink); color:#fff; border:.6pt solid var(--ink); }
.note.t-chg { border:.6pt solid var(--ink); color:var(--ink); }
.note.t-plus, .note.t-minus { border:.6pt solid var(--ink); color:var(--ink); }
.note.t-out { background:var(--g2); color:var(--g4); border:.6pt solid var(--g2); }

.empty { margin-top:12mm; border:.6pt dashed #9a9a95; padding:10mm; text-align:center; }
.empty .t { font-family:'HW XWide'; font-weight:500; font-size:12pt; }
.empty .s { margin-top:2mm; color:var(--g4); }`

/**
 * Rendert die Lightlist als vollständiges HTML-Dokument (A4, druckfertig).
 * @param {ReturnType<typeof lightlistFromLightbase>} data
 * @param {{ stand?:string, fontBaseUrl?:string, fontCss?:string }} [opts]
 */
export function renderLightlistHtml(data, opts = {}) {
  const rows = buildLightlistRows(data.items)
  const s = summarizeLightlist(rows)
  const sections = groupLightlistSections(rows, data.sectionOrder ?? 'input')
  const stand = opts.stand ?? formatDate(new Date())
  const title = data.name ?? ''
  const tsize = title.length <= 18 ? '30pt' : title.length <= 26 ? '24pt' : '19pt'
  const sub = ['Ausleihliste', data.vorlage ? `Vorlage ${data.vorlage}` : ''].filter(Boolean).join(' · ')
  const lg = (k, v) => `<div class="lg"><div class="k">${k}</div><div class="v">${v ? esc(v) : '–'}</div></div>`

  const blocks = sections.map((sec, i) => {
    const act = sec.rows.filter((r) => r.qty > 0)
    const trs = sec.rows.map((r) => {
      const cls = [sourceKind(r.source) === 'hillward' ? 'is-hw' : '', r.qty === 0 ? 'is-out' : ''].filter(Boolean).join(' ')
      return `<tr class="${cls}"><td class="qty"><div class="cell"><span class="t">${r.qty}</span></div></td>` +
        `<td class="art"><div class="cell"><span class="t">${esc(r.name)}</span></div></td>` +
        `<td class="src"><div class="cell">${srcTag(r.source)}</div></td>` +
        `<td class="nt"><div class="cell">${noteTag(r.note)}</div></td></tr>`
    }).join('')
    return `<section class="cat"><div class="cat-head"><div class="cat-title"><span class="cat-no">${String(i + 1).padStart(2, '0')}</span><h2>${esc(sec.name)}</h2></div>` +
      `<div class="cat-meta">${act.length} Pos. <span class="dot">·</span> ${act.reduce((a, r) => a + r.qty, 0)} Stk.</div></div>` +
      `<table><colgroup><col style="width:15mm"><col><col style="width:21mm"><col style="width:30mm"></colgroup>` +
      `<thead><tr><th class="qty">Menge</th><th>Artikel</th><th class="src">Quelle</th><th>Bemerkung</th></tr></thead><tbody>${trs}</tbody></table></section>`
  }).join('')
  const empty = rows.length ? '' : '<div class="empty"><div class="t">Noch keine Positionen</div><div class="s">Diese Liste enthält noch kein Equipment.</div></div>'
  const removedNote = s.removed ? `<span class="note">${s.removed} Position${s.removed !== 1 ? 'en' : ''} entfernt (Menge 0) – durchgestrichen.</span>` : ''

  const footerText = `Lightlist · ${data.number} ${title} · Stand ${stand}`.toUpperCase().replace(/["\\]/g, '')
  const footLogoH = 10 * LOGO_BASELINE / 24.4
  const footLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 139.43 ${LOGO_BASELINE}" width="${(139.43 / LOGO_BASELINE * footLogoH).toFixed(3)}" height="${footLogoH.toFixed(3)}" overflow="visible" fill="#000">${LOGO_PATHS}</svg>`)
  const pageCss = `@page {
  @bottom-left { content:url("${footLogo}") "\\a0\\a0\\a0\\a0 ${footerText}"; white-space:pre; font-family:'HW Wide'; font-size:6pt; line-height:10px; letter-spacing:.14em; color:#8a8a86; vertical-align:bottom; padding-bottom:11.5mm; margin-left:14mm; }
  @bottom-right { content:"HILLWARD.DE  ·  " counter(page) " / " counter(pages); font-family:'HW Wide'; font-size:6pt; line-height:10px; letter-spacing:.14em; color:#8a8a86; vertical-align:bottom; padding-bottom:11.5mm; margin-right:14.75mm; }
}`

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(`${data.number}_${title}_Lightlist`)}</title>
<style>${opts.fontCss ?? fontFaces(opts.fontBaseUrl)}
${CSS}
${pageCss}</style></head><body>
<header class="hero">${star('bigstar', '#fff')}
<div class="hero-top">${logoSvg('#fff', '6.2mm')}<span class="kicker">Lightlist · Projekt ${esc(data.number)}</span></div>
<h1 style="font-size:${tsize}">${esc(title)}</h1><div class="sub">${esc(sub)}</div>
<div class="stats"><div class="stat"><div class="k">Positionen</div><div class="v">${s.positions}</div></div>
<div class="stat"><div class="k">Stückzahl</div><div class="v">${s.quantity}</div></div>
<div class="stat"><div class="k">Miete</div><div class="v">${s.rentPositions}<small>Pos. · ${s.rentQuantity} Stk.</small></div></div></div>
</header>
<div class="logi">${lg('Drehzeitraum', data.dreh)}${lg('Ausleihe', data.ausleihe)}${lg('Rückleihe', data.rueckleihe)}${lg('Transport', data.transport)}</div>
<div class="legend"><span class="item">${srcTag('Hillward')}<span class="lbl">Eigenbestand</span></span><span class="item">${srcTag('Rent')}<span class="lbl">Miete</span></span>${removedNote}</div>
${blocks}${empty}
</body></html>`
}

/**
 * Browser-Helfer: druckt ein gerendertes Lightlist-Dokument über ein unsichtbares iframe (Dialog „Als PDF sichern“).
 * Dateiname im Dialog = <title> des Dokuments.
 * @param {string} html
 */
export function printLightlistHtml(html) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  return new Promise((resolve) => {
    frame.onload = async () => {
      const w = frame.contentWindow
      try { await w.document.fonts.ready } catch {}
      const prevTitle = document.title
      document.title = w.document.title
      w.focus(); w.print()
      document.title = prevTitle
      setTimeout(() => { frame.remove(); resolve() }, 1000)
    }
    frame.srcdoc = html
  })
}
