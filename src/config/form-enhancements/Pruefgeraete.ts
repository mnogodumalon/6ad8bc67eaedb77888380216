// Auto-generated. Per-entity form-enhancements config for "Prüfgeräte".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["bezeichnung", {"row": ["hersteller", "typ"], "cols": "1fr 1fr"}, "seriennummer", {"row": ["anwendungsbereich", "status"], "cols": "1fr 1fr"}, {"row": ["preis", "kaufdatum"], "cols": "1fr 1fr"}, "zertifizierungsintervall", "kunde"],
  defaults: {
    'status': { kind: 'lookup', key: 'verfuegbar', label: 'Verfügbar' },
    'kaufdatum': { kind: 'today' },
    'zertifizierungsintervall': { kind: 'literal', value: 12 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
