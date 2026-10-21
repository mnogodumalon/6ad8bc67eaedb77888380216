/**
 * useGeraetVerkaufenFlow — the plumbing of the flow « Prüfgerät verkaufen », generated from the plan.
 *
 * Changes `pruefgeraete`: the record to change is picked (`flow.pick('pruefgeraete')`), the form is prefilled with its values; asks `kunde`, `preis`, `zertifizierungsintervall`; sets `kaufdatum`, `status` itself.
Changes `kunden`: the record to change is picked (`flow.pick('kunden')`), the form is prefilled with its values; ; sets `kundenstatus` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 5)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useGeraetVerkaufenFlow({
 *     steps: { pruefgeraete: 1, kunden: 2, kunde: 3, preis: 4, zertifizierungsintervall: 4 },
 *     items: { kunde: r => ({ id: r.id, title: fieldText(r, 'firmenname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.kunde.select} {...flow.pick('kunde')} />
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.pruefgeraete.select} {...flow.pick('pruefgeraete')} />
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.kunden.select} {...flow.pick('kunden')} />
 *     <Bound form={flow.forms.pruefgeraete} name="preis" />
 *     <Bound form={flow.forms.pruefgeraete} name="zertifizierungsintervall" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useState } from 'react';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';
export type GeraetVerkaufenFieldKey = 'kunde' | 'kunden' | 'preis' | 'pruefgeraete' | 'zertifizierungsintervall';

export interface GeraetVerkaufenForms {
  pruefgeraete: StepForm<'pruefgeraete'>;
  kunden: StepForm<'kunden'>;
}

// Alias so the option generics stay readable.
type Key = GeraetVerkaufenFieldKey;

export interface GeraetVerkaufenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    kunde?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    pruefgeraete?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    kunden?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"kunde": 3, "kunden": 2, "preis": 4, "pruefgeraete": 1, "zertifizierungsintervall": 4};
export const GERAETVERKAUFEN_REVIEW_STEP = 5;

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

export function useGeraetVerkaufenFlow(options: GeraetVerkaufenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [pruefgeraeteTargetId, setPruefgeraeteTargetId] = useState<string | null>(null);
  const [kundenTargetId, setKundenTargetId] = useState<string | null>(null);
  const pruefgeraete = useStepForm('pruefgeraete', {
    fields: ["kunde", "preis", "zertifizierungsintervall"],
    steps: only(steps, ["kunde", "preis", "zertifizierungsintervall"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["kunde", "preis", "zertifizierungsintervall"]),
    messages: only(options.messages as Record<string, string> | undefined, ["kunde", "preis", "zertifizierungsintervall"]),
  });
  const kunden = useStepForm('kunden', {
    fields: [],
    steps: only(steps, []) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, []),
    messages: only(options.messages as Record<string, string> | undefined, []),
  });
  const forms: GeraetVerkaufenForms = { pruefgeraete, kunden };
  const formList: StepForm[] = [pruefgeraete, kunden];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    kunde: useRecordSearch(servicePort, 'kunden', withPickPolicy('kunde', {
      searchFields: ["firmenname", "ort"] as never,
      toItem: options.items?.kunde as never,
    })),
    pruefgeraete: useRecordSearch(servicePort, 'pruefgeraete', withPickPolicy('pruefgeraete', {
      searchFields: ["bezeichnung", "hersteller", "typ", "seriennummer"] as never,
      filter: "r.v_status == 'verfuegbar'",
      where: (r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "verfuegbar",
      toItem: options.items?.pruefgeraete as never,
    })),
    kunden: useRecordSearch(servicePort, 'kunden', withPickPolicy('kunden', {
      searchFields: ["firmenname", "ort"] as never,
      toItem: options.items?.kunden as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:geraet-verkaufen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:geraet-verkaufen:write:${entity}.${field}`,
  });
  const picks = {
    kunde: { ...searches.kunde, select: { ...searches.kunde.select, create: false as boolean, hint: hintFor('kunde', 'kunden', null as PickWhere | null) } },
    pruefgeraete: { ...searches.pruefgeraete, select: { ...searches.pruefgeraete.select, create: false as boolean, hint: hintFor('pruefgeraete', 'pruefgeraete', {"conditions": [{"field": "status", "op": "eq", "value": "verfuegbar"}], "mode": "all"} as PickWhere | null) } },
    kunden: { ...searches.kunden, select: { ...searches.kunden.select, create: false as boolean, hint: hintFor('kunden', 'kunden', null as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'pruefgeraete', entity: 'pruefgeraete', form: pruefgeraete,
      updates: () => pruefgeraeteTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => pruefgeraeteTargetId
        ? { key: 'target:pruefgeraete', label: entityLabel('pruefgeraete'), value: picks.pruefgeraete.labelOf(pruefgeraeteTargetId) ?? pruefgeraeteTargetId, step: steps.pruefgeraete }
        : undefined,
      values: (): FormValues => ({
        kaufdatum: policyFixedValue('pruefgeraete', 'kaufdatum') ?? todayIso(),
        status: policyFixedValue('pruefgeraete', 'status') ?? "verkauft",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('pruefgeraete', 'status', policyFixedValue('pruefgeraete', 'status') ?? "verkauft")],
    },
    {
      key: 'kunden', entity: 'kunden', form: kunden, primary: true,
      updates: () => kundenTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => kundenTargetId
        ? { key: 'target:kunden', label: entityLabel('kunden'), value: picks.kunden.labelOf(kundenTargetId) ?? kundenTargetId, step: steps.kunden }
        : undefined,
      values: (): FormValues => ({
        kundenstatus: policyFixedValue('kunden', 'kundenstatus') ?? "kunde",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('kunden', 'kundenstatus', policyFixedValue('kunden', 'kundenstatus') ?? "kunde")],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'geraet-verkaufen' });

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    pruefgeraete: {
      selectedId: pruefgeraeteTargetId,
      onSelect: (id: string) => {
        setPruefgeraeteTargetId(id);
        const rec = picks.pruefgeraete.recordOf(id);
        if (rec) pruefgeraete.reset({ kunde: fieldRef(rec, "kunde"), preis: fieldNumber(rec, "preis"), zertifizierungsintervall: fieldNumber(rec, "zertifizierungsintervall"), });
      },
      get record(): JourneyRecord | undefined { return pruefgeraeteTargetId ? picks.pruefgeraete.recordOf(pruefgeraeteTargetId) : undefined; },
    },
    kunden: {
      selectedId: kundenTargetId,
      onSelect: (id: string) => {
        setKundenTargetId(id);
        const rec = picks.kunden.recordOf(id);
        if (rec) kunden.reset({ });
      },
      get record(): JourneyRecord | undefined { return kundenTargetId ? picks.kunden.recordOf(kundenTargetId) : undefined; },
    },
  };
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: GeraetVerkaufenFieldKey) => {
    if (field in targets) {
      const t = targets[field as keyof typeof targets];
      return { selectedId: t.selectedId, onSelect: t.onSelect };
    }
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
  const pickMany = (field: GeraetVerkaufenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setPruefgeraeteTargetId(null); setKundenTargetId(null); };

  return {
    slug: 'geraet-verkaufen' as const,
    draftKey: 'geraet-verkaufen' as const,
    entity: 'kunden' as const,
    form: kunden,
    forms, formList, picks, submit, steps, targets,    reviewStep: GERAETVERKAUFEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type GeraetVerkaufenFlow = ReturnType<typeof useGeraetVerkaufenFlow>;
