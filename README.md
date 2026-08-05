# hillward-shared

Gemeinsame Matching-/Verfügbarkeitslogik für [hillward-rental](https://github.com/thilo-code/hillward-rental) und [lightbase](https://github.com/thilo-code/lightbase). Reines ESM-JavaScript, kein Build-Schritt, kein TypeScript — läuft unverändert in Next.js (Node) und in Netlify Functions (esbuild-gebundelt).

## Was hier lebt

- `src/itemMatching.mjs` — `normalizeName`, `isHillwardSource`, `findMatchingType` (exakte Übereinstimmung nach Normalisierung, dann Aliase — kein Fuzzy-Matching).
- `src/dateRange.mjs` — `rangesOverlap` (einfacher ISO-String-Vergleich).
- `src/availability.mjs` — `findConflicts`, `BLOCKING_PROJECT_STATUSES` (kanonische Quelle für die drei blockierenden Projekt-Status: `angefragt`, `bestaetigt`, `laufend`).

## Was hier bewusst NICHT lebt

Keine Postgres-Function/Stored Procedure — die eigentliche Sicherheit gegen Doppelbuchung ist ein DB-Exclusion-Constraint in hillward-rental (`drizzle/0010_booking_overlap_constraint.sql`), nicht diese Logik hier. Matching/Verfügbarkeit bleibt in JS, wo es mit Vitest einfach zu testen ist.

**Bekannte, akzeptierte Restdopplung:** Die Statusliste (`angefragt`/`bestaetigt`/`laufend`) steht auch als literale SQL-Bedingung im DB-Trigger in hillward-rental (siehe `drizzle/0010_booking_overlap_constraint.sql`) — SQL kann keine JS-Konstante importieren. Drei String-Literale, kein größeres Risiko.

## Versionierung

Beide Consumer-Repos binden dieses Repo per **Git-Tag** ein, nicht per Branch:

```json
"hillward-shared": "github:thilo-code/hillward-shared#v1.0.0"
```

Ein Tag-Bump ist ein bewusster, sichtbarer Schritt (Diff + Deploy in jedem Consumer-Repo), im Gegensatz zu einem Kommentar-Verweis, der stillschweigend veralten kann. Bei einer Änderung hier:

1. Änderung machen, Tests laufen lassen (`npm test`).
2. Version in `package.json` hochzählen, committen, Tag setzen (`git tag vX.Y.Z && git push --tags`).
3. In hillward-rental und lightbase die Dependency-Version anheben und `npm install` laufen lassen.
