// Auto-generated. Per-entity form-enhancements config for "Veranstaltungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["titel", "beginn", {"row": ["ort", "status"], "cols": "2fr 1fr"}, "max_teilnehmer", "beschreibung"],
  defaults: {
    'beginn': { kind: 'today', withTime: true },
    'status': { kind: 'lookup', key: 'geplant', label: 'Geplant' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
