/**
 * useAnmeldungErfassenFlow — the plumbing of the flow « Anmeldung zur Veranstaltung erfassen », generated from the plan.
 *
 * Writes `anmeldungen`: asks `veranstaltung`, `vorname`, `nachname`, `email`, `telefon`, `firma`, `kontakt`; sets `anmeldestatus`, `anmeldedatum` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useAnmeldungErfassenFlow({
 *     steps: { veranstaltung: 1, kontakt: 2, vorname: 3, nachname: 3, email: 3, telefon: 3, firma: 3 },
 *     items: { veranstaltung: r => ({ id: r.id, title: fieldText(r, 'titel') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.veranstaltung.select} {...flow.pick('veranstaltung')} />
 *     <EntitySelectStep {...flow.picks.kontakt.select} {...flow.pick('kontakt')} />
 *     <Bound form={flow.forms.anmeldungen} name="vorname" />
 *     <Bound form={flow.forms.anmeldungen} name="nachname" />
 *     <Bound form={flow.forms.anmeldungen} name="email" />
 *     <Bound form={flow.forms.anmeldungen} name="telefon" />
 *     <Bound form={flow.forms.anmeldungen} name="firma" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type AnmeldungErfassenFieldKey = 'email' | 'firma' | 'kontakt' | 'nachname' | 'telefon' | 'veranstaltung' | 'vorname';

export interface AnmeldungErfassenForms {
  anmeldungen: StepForm<'anmeldungen'>;
}

// Alias so the option generics stay readable.
type Key = AnmeldungErfassenFieldKey;

export interface AnmeldungErfassenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    veranstaltung?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    kontakt?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"email": 3, "firma": 3, "kontakt": 2, "nachname": 3, "telefon": 3, "veranstaltung": 1, "vorname": 3};
export const ANMELDUNGERFASSEN_REVIEW_STEP = 4;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useAnmeldungErfassenFlow(options: AnmeldungErfassenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const anmeldungen = useStepForm('anmeldungen', {
    fields: ["veranstaltung", "vorname", "nachname", "email", "telefon", "firma", "kontakt"],
    steps: only(steps, ["veranstaltung", "vorname", "nachname", "email", "telefon", "firma", "kontakt"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["veranstaltung", "vorname", "nachname", "email", "telefon", "firma", "kontakt"]),
    messages: only(options.messages as Record<string, string> | undefined, ["veranstaltung", "vorname", "nachname", "email", "telefon", "firma", "kontakt"]),
  });
  const forms: AnmeldungErfassenForms = { anmeldungen };
  const formList: StepForm[] = [anmeldungen];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    veranstaltung: useRecordSearch(servicePort, 'veranstaltungen', withPickPolicy('veranstaltung', {
      searchFields: ["titel", "ort"] as never,
      filter: "r.v_status == 'anmeldung_offen'",
      where: (r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "anmeldung_offen",
      toItem: options.items?.veranstaltung as never,
    })),
    kontakt: useRecordSearch(servicePort, 'kontakte', withPickPolicy('kontakt', {
      searchFields: ["vorname", "nachname", "email"] as never,
      toItem: options.items?.kontakt as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:anmeldung-erfassen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:anmeldung-erfassen:write:${entity}.${field}`,
  });
  const picks = {
    veranstaltung: { ...searches.veranstaltung, select: { ...searches.veranstaltung.select, create: true as boolean, hint: hintFor('veranstaltung', 'veranstaltungen', {"conditions": [{"field": "status", "op": "eq", "value": "anmeldung_offen"}], "mode": "all"} as PickWhere | null) } },
    kontakt: { ...searches.kontakt, select: { ...searches.kontakt.select, create: false as boolean, hint: hintFor('kontakt', 'kontakte', null as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'anmeldungen', entity: 'anmeldungen', form: anmeldungen, primary: true,
      values: (): FormValues => ({
        anmeldestatus: policyFixedValue('anmeldungen', 'anmeldestatus') ?? "angemeldet",
        anmeldedatum: policyFixedValue('anmeldungen', 'anmeldedatum') ?? todayIso(),
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('anmeldungen', 'anmeldestatus', policyFixedValue('anmeldungen', 'anmeldestatus') ?? "angemeldet")],

      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "alle au\u00dfer abgesagt", "id": "ausbuchen-zaehlung", "question": "Z\u00e4hlen Wartelisten-Anmeldungen zur Teilnehmerzahl?"}],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'anmeldung-erfassen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AnmeldungErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: AnmeldungErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'anmeldung-erfassen' as const,
    draftKey: 'anmeldung-erfassen' as const,
    entity: 'anmeldungen' as const,
    form: anmeldungen,
    forms, formList, picks, submit, steps,    reviewStep: ANMELDUNGERFASSEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type AnmeldungErfassenFlow = ReturnType<typeof useAnmeldungErfassenFlow>;
