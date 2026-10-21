/**
 * useKundeAnlegenFlow — the plumbing of the flow « Kunde mit Kontakt anlegen », generated from the plan.
 *
 * Writes `kunden`: asks `firmenname`, `branche`, `strasse`, `hausnummer`, `plz`, `ort`, `telefon`, `email`, `kundenstatus`.
Writes `kontakte` (only when the person fills it): asks `vorname`, `nachname`, `position`, `email`, `telefon`, `ist_anwender`; links `kunde` ← the created `kunden`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 2)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useKundeAnlegenFlow({
 *     steps: { firmenname: 1, branche: 1, strasse: 1, hausnummer: 1, plz: 1, ort: 1, telefon: 1, email: 1, kundenstatus: 1, vorname: 1, nachname: 1, position: 1, ist_anwender: 1 },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <Bound form={flow.forms.kunden} name="firmenname" />
 *     <Bound form={flow.forms.kunden} name="branche" />
 *     <Bound form={flow.forms.kunden} name="strasse" />
 *     <Bound form={flow.forms.kunden} name="hausnummer" />
 *     <Bound form={flow.forms.kunden} name="plz" />
 *     <Bound form={flow.forms.kunden} name="ort" />
 *     <Bound form={flow.forms.kunden} name="telefon" />
 *     <Bound form={flow.forms.kunden} name="email" />
 *     <Bound form={flow.forms.kunden} name="kundenstatus" />
 *     <Bound form={flow.forms.kontakte} name="vorname" />
 *     <Bound form={flow.forms.kontakte} name="nachname" />
 *     <Bound form={flow.forms.kontakte} name="position" />
 *     <Bound form={flow.forms.kontakte} name="email" />
 *     <Bound form={flow.forms.kontakte} name="telefon" />
 *     <Bound form={flow.forms.kontakte} name="ist_anwender" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
export type KundeAnlegenFieldKey = 'branche' | 'email' | 'firmenname' | 'hausnummer' | 'ist_anwender' | 'kundenstatus' | 'nachname' | 'ort' | 'plz' | 'position' | 'strasse' | 'telefon' | 'vorname';

export interface KundeAnlegenForms {
  kunden: StepForm<'kunden'>;
  kontakte: StepForm<'kontakte'>;
}

// Alias so the option generics stay readable.
type Key = KundeAnlegenFieldKey;

export interface KundeAnlegenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
}

const DEFAULT_STEPS: Record<string, number> = {"branche": 1, "email": 1, "firmenname": 1, "hausnummer": 1, "ist_anwender": 1, "kundenstatus": 1, "nachname": 1, "ort": 1, "plz": 1, "position": 1, "strasse": 1, "telefon": 1, "vorname": 1};
export const KUNDEANLEGEN_REVIEW_STEP = 2;

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

export function useKundeAnlegenFlow(options: KundeAnlegenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const kunden = useStepForm('kunden', {
    fields: ["firmenname", "branche", "strasse", "hausnummer", "plz", "ort", "telefon", "email", "kundenstatus"],
    steps: only(steps, ["firmenname", "branche", "strasse", "hausnummer", "plz", "ort", "telefon", "email", "kundenstatus"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["firmenname", "branche", "strasse", "hausnummer", "plz", "ort", "telefon", "email", "kundenstatus"]),
    messages: only(options.messages as Record<string, string> | undefined, ["firmenname", "branche", "strasse", "hausnummer", "plz", "ort", "telefon", "email", "kundenstatus"]),
  });
  const kontakte = useStepForm('kontakte', {
    fields: ["vorname", "nachname", "position", "email", "telefon", "ist_anwender"],
    steps: only(steps, ["vorname", "nachname", "position", "email", "telefon", "ist_anwender"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["vorname", "nachname", "position", "email", "telefon", "ist_anwender"]),
    messages: only(options.messages as Record<string, string> | undefined, ["vorname", "nachname", "position", "email", "telefon", "ist_anwender"]),
  });
  const forms: KundeAnlegenForms = { kunden, kontakte };
  const formList: StepForm[] = [kunden, kontakte];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  const picks = {
  };

  const kontakteFilled = hasValues(kontakte);
  const plan: PlanStep[] = [
    {
      key: 'kunden', entity: 'kunden', form: kunden, primary: true,    },
    ...(kontakteFilled ? [{
      key: 'kontakte', entity: 'kontakte', form: kontakte,      needs: ['kunden'],
      link: { kunde: 'kunden' },
    } as PlanStep] : []),
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'kunde-anlegen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: KundeAnlegenFieldKey) => {
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
  const pickMany = (field: KundeAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'kunde-anlegen' as const,
    draftKey: 'kunde-anlegen' as const,
    entity: 'kunden' as const,
    form: kunden,
    forms, formList, picks, submit, steps,    reviewStep: KUNDEANLEGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type KundeAnlegenFlow = ReturnType<typeof useKundeAnlegenFlow>;
