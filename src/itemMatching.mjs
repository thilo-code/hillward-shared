// Portiert aus hillward-rental/src/lib/itemMatching.ts — kanonische Quelle ist jetzt hier.
// Bei Änderungen: Tag bumpen (siehe README), dann in beiden Consumer-Repos die Version anheben.

/** @typedef {{ id: string, name: string, aliases: string[] | null }} MatchableType */

/** Normalisiert einen Artikelnamen für den Vergleich: Groß/Klein, Mehrfach-Leerzeichen, Satzzeichen am Rand. */
export function normalizeName(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/g, '')
}

/**
 * Erkennt, ob eine Herkunftsangabe den eigenen Bestand (Hillward) meint statt Fremdmiete.
 * Prüft auf Enthaltensein statt exakter Gleichheit, da Lightlist und manuelle Eingaben je nach
 * Liste z.B. "Hillward", "Technik von Hillward" oder "Hillward GmbH" liefern.
 * @param {string | null | undefined} source
 * @returns {boolean}
 */
export function isHillwardSource(source) {
  if (!source) return true
  return normalizeName(source).includes('hillward')
}

/**
 * Sucht einen Katalog-Typ zu einem freien Namen (z.B. aus einer Lightlist-Liste).
 * Prüft zunächst den normalisierten Namen, dann alle hinterlegten Aliase.
 * @template {MatchableType} T
 * @param {T[]} types
 * @param {string} searchName
 * @returns {T | undefined}
 */
export function findMatchingType(types, searchName) {
  const target = normalizeName(searchName)
  for (const type of types) {
    if (normalizeName(type.name) === target) return type
  }
  for (const type of types) {
    if ((type.aliases ?? []).some((alias) => normalizeName(alias) === target)) return type
  }
  return undefined
}
