// The orchestrator's plan, as far as the running app needs it
// (docs/orchestrator/SPEC.md). Generated — do not edit; regenerated on every
// build and update from the stored plan. Without a plan every map is empty.
//
//   SYSTEM_ASSIGNED entity → fields a tool fills when a record is CREATED — the
//                   value does not exist before; dialogs hide these on create and
//                   the form-polish sets no default on them. A scheduled or
//                   update-triggered tool owns its field but is NOT in here.
//   PLAN_SENTENCES  slug → the plan in the owner's words (flows' field page)
//
// The runtime write guard (FLOW_WRITES/OWNERSHIP, planGuard.ts) left on
// 23.09.2026: a flow page composes against its generated hook, whose submit
// plan IS the Schreibliste — there is no way to spell a write outside it.

export const SYSTEM_ASSIGNED: Record<string, string[]> = {};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "geraet-verkaufen": [
    "Ändert: kunden, pruefgeraete",
    "Automatisch: kaufdatum (heutiges Datum, automatisch), status (fester Wert „verkauft“), kundenstatus (fester Wert „kunde“)"
  ],
  "kunde-anlegen": [
    "Legt an: kontakte, kunden"
  ],
  "anmeldung-erfassen": [
    "Legt an: anmeldungen",
    "Automatisch: anmeldestatus (fester Wert „angemeldet“), anmeldedatum (heutiges Datum, automatisch)"
  ],
  "anmeldung-bestaetigen": [
    "Ändert: anmeldungen"
  ]
};

export const PLAN_SUMMARY = "Die Anwendung unterstützt den Verkauf von Prüfgeräten für kritische Messungen, etwa an Gasleitungen und Übergabepunkten. Sie verwaltet Kunden und Kontakte (einfaches CRM), die verkauften Geräte samt Zertifizierungsintervall sowie Verkaufsveranstaltungen, zu denen sich Interessenten anmelden.";

/** slug → the lists a flow writes (the plan's Schreibliste). The nav leaves a
 *  flow out for a user who may not write one of them (lib/permissions.ts). */
export const FLOW_ENTITIES: Record<string, string[]> = {
  "geraet-verkaufen": [
    "kunden",
    "pruefgeraete"
  ],
  "kunde-anlegen": [
    "kontakte",
    "kunden"
  ],
  "anmeldung-erfassen": [
    "anmeldungen"
  ],
  "anmeldung-bestaetigen": [
    "anmeldungen"
  ]
};
