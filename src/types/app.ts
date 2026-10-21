import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kunden {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    branche?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    telefon?: string;
    email?: string;
    website?: string;
    kundenstatus?: LookupValue;
    bemerkungen?: string;
  };
}

export interface Kontakte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    kunde?: RecordUrl; // applookup -> URL zu 'Kunden' Record
    position?: string;
    email?: string;
    telefon?: string;
    ist_anwender?: boolean;
  };
}

export interface Pruefgeraete {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    hersteller?: string;
    typ?: string;
    seriennummer?: string;
    anwendungsbereich?: LookupValue;
    preis?: number;
    kunde?: RecordUrl; // applookup -> URL zu 'Kunden' Record
    kaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    zertifizierungsintervall?: number;
    status?: LookupValue;
  };
}

export interface Veranstaltungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beginn?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    beschreibung?: string;
    max_teilnehmer?: number;
    status?: LookupValue;
  };
}

export interface Anmeldungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    firma?: string;
    kontakt?: RecordUrl; // applookup -> URL zu 'Kontakte' Record
    anmeldestatus?: LookupValue;
    anmerkung?: string;
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  KUNDEN: '6ad8bc17d6e57783037c588c',
  KONTAKTE: '6ad8bc25caecf2f8713b4856',
  PRUEFGERAETE: '6ad8bc2715043adacd3eea4c',
  VERANSTALTUNGEN: '6ad8bc2b5b0a803d625f68fb',
  ANMELDUNGEN: '6ad8bc2f384addb917f97d65',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kunden': {
    kundenstatus: [{ key: "kunde", get label() { return lookupLabel('kunden', 'kundenstatus', "kunde") ?? "Kunde"; } }, { key: "inaktiv", get label() { return lookupLabel('kunden', 'kundenstatus', "inaktiv") ?? "Inaktiv"; } }, { key: "interessent", get label() { return lookupLabel('kunden', 'kundenstatus', "interessent") ?? "Interessent"; } }],
  },
  'pruefgeraete': {
    anwendungsbereich: [{ key: "gasleitungen", get label() { return lookupLabel('pruefgeraete', 'anwendungsbereich', "gasleitungen") ?? "Gasleitungen"; } }, { key: "uebergabepunkte", get label() { return lookupLabel('pruefgeraete', 'anwendungsbereich', "uebergabepunkte") ?? "Übergabepunkte"; } }, { key: "sonstiges", get label() { return lookupLabel('pruefgeraete', 'anwendungsbereich', "sonstiges") ?? "Sonstiges"; } }],
    status: [{ key: "verfuegbar", get label() { return lookupLabel('pruefgeraete', 'status', "verfuegbar") ?? "Verfügbar"; } }, { key: "verkauft", get label() { return lookupLabel('pruefgeraete', 'status', "verkauft") ?? "Verkauft"; } }, { key: "in_pruefung", get label() { return lookupLabel('pruefgeraete', 'status', "in_pruefung") ?? "In Prüfung"; } }, { key: "ausgemustert", get label() { return lookupLabel('pruefgeraete', 'status', "ausgemustert") ?? "Ausgemustert"; } }],
  },
  'veranstaltungen': {
    status: [{ key: "anmeldung_offen", get label() { return lookupLabel('veranstaltungen', 'status', "anmeldung_offen") ?? "Anmeldung offen"; } }, { key: "geplant", get label() { return lookupLabel('veranstaltungen', 'status', "geplant") ?? "Geplant"; } }, { key: "ausgebucht", get label() { return lookupLabel('veranstaltungen', 'status', "ausgebucht") ?? "Ausgebucht"; } }, { key: "durchgefuehrt", get label() { return lookupLabel('veranstaltungen', 'status', "durchgefuehrt") ?? "Durchgeführt"; } }, { key: "abgesagt", get label() { return lookupLabel('veranstaltungen', 'status', "abgesagt") ?? "Abgesagt"; } }],
  },
  'anmeldungen': {
    anmeldestatus: [{ key: "bestaetigt", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "bestaetigt") ?? "Bestätigt"; } }, { key: "warteliste", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "warteliste") ?? "Warteliste"; } }, { key: "abgesagt", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "abgesagt") ?? "Abgesagt"; } }, { key: "teilgenommen", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "teilgenommen") ?? "Teilgenommen"; } }, { key: "angemeldet", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "angemeldet") ?? "Angemeldet"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kunden': {
    'firmenname': 'string/text',
    'branche': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'website': 'string/url',
    'kundenstatus': 'lookup/select',
    'bemerkungen': 'string/textarea',
  },
  'kontakte': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'kunde': 'applookup/select',
    'position': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'ist_anwender': 'bool',
  },
  'pruefgeraete': {
    'bezeichnung': 'string/text',
    'hersteller': 'string/text',
    'typ': 'string/text',
    'seriennummer': 'string/text',
    'anwendungsbereich': 'lookup/select',
    'preis': 'number',
    'kunde': 'applookup/select',
    'kaufdatum': 'date/date',
    'zertifizierungsintervall': 'number',
    'status': 'lookup/radio',
  },
  'veranstaltungen': {
    'titel': 'string/text',
    'beginn': 'date/datetimeminute',
    'ort': 'string/text',
    'beschreibung': 'string/textarea',
    'max_teilnehmer': 'number',
    'status': 'lookup/select',
  },
  'anmeldungen': {
    'veranstaltung': 'applookup/select',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'firma': 'string/text',
    'kontakt': 'applookup/select',
    'anmeldestatus': 'lookup/select',
    'anmerkung': 'string/textarea',
    'anmeldedatum': 'date/date',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKunden = StripLookup<Kunden['fields']>;
export type CreateKontakte = StripLookup<Kontakte['fields']>;
export type CreatePruefgeraete = StripLookup<Pruefgeraete['fields']>;
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;