import { useEffect, useMemo, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  prepareChallenge,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { tx } from '@/i18n';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldNumber,
  fieldDate,
  formatFieldValue,
} from '@/lib/journey';
import { createPublicPort } from '@/lib/journey/publicPort';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';

const SLUG = 'veranstaltung-anmeldung';

function AnmeldungFlow({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [step, setStep] = useState(1);
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);

  const form = useStepForm('anmeldungen', {
    fields: ['veranstaltung', 'vorname', 'nachname', 'email', 'telefon', 'firma', 'anmerkung'],
    steps: { veranstaltung: 1, vorname: 2, nachname: 2, email: 2, telefon: 2, firma: 2, anmerkung: 2 },
    autoComplete: true,
  });

  const events = useRecordSearch(port, 'veranstaltungen', {
    searchFields: ['titel', 'ort'],
    toItem: r => {
      const beginn = fieldDate(r, 'beginn');
      const ort = fieldText(r, 'ort');
      const max = fieldNumber(r, 'max_teilnehmer');
      return {
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: [beginn ? formatFieldValue('veranstaltungen', 'beginn', beginn) : '', ort]
          .filter(Boolean)
          .join(' · '),
        stats: max != null ? [{ label: tx('Max. Teilnehmer'), value: max }] : undefined,
      };
    },
    orderby: ['v_beginn'],
  });

  const submit = useJourneySubmit(
    port,
    [
      {
        key: 'anmeldung',
        entity: 'anmeldungen',
        form,
        primary: true,
      },
    ],
    { draftKey: SLUG },
  );

  useEffect(() => {
    const ep = page.endpoints?.find(e => e.op === 'create');
    if (ep?.app_id) prepareChallenge(cfg, page, 'POST', `/apps/${ep.app_id}/records`);
  }, [cfg, page]);

  const pickedId = form.get('veranstaltung') as string | null;
  const picked = pickedId ? events.recordOf(pickedId) : undefined;
  const description = picked ? fieldText(picked, 'beschreibung') : '';

  const steps = [
    { label: tx('Veranstaltung') },
    { label: tx('Deine Daten') },
    { label: tx('Prüfen') },
  ];

  return (
    <IntentWizardShell
      steps={steps}
      currentStep={step}
      onStepChange={setStep}
      back={false}
      forms={[form]}
      draftKey={SLUG}
    >
      {step === 1 && (
        <>
          <EntitySelectStep
            {...events.select}
            id={form.fieldId('veranstaltung')}
            invalid={!!form.error('veranstaltung')}
            avatar="none"
            create={false}
            selectedId={pickedId}
            onSelect={id => form.set('veranstaltung', id, events.labelOf(id) ?? '')}
            emptyText={tx('Aktuell ist keine Veranstaltung für die Anmeldung geöffnet.')}
          />
          {description && (
            <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-line">{description}</p>
          )}
          <StepNav
            hideBack
            onNext={() => form.validate(['veranstaltung'])}
            nextStepLabel={tx('Deine Daten')}
          />
        </>
      )}
      {step === 2 && (
        <>
          <div className="space-y-4">
            <Bound form={form} name="vorname" />
            <Bound form={form} name="nachname" />
            <Bound form={form} name="email" />
            <Bound form={form} name="telefon" />
            <Bound form={form} name="firma" />
            <Bound form={form} name="anmerkung" />
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => form.validate(['vorname', 'nachname', 'email', 'telefon', 'firma', 'anmerkung'])}
            nextStepLabel={tx('Prüfen')}
          />
        </>
      )}
      {step === 3 && !submit.done && (
        <SummaryStep
          forms={[form]}
          submit={submit}
          whatHappensNext={tx('Nach dem Absenden ist deine Anmeldung gespeichert.')}
        />
      )}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[form]}
          submit={submit}
          title={tx('Danke für deine Anmeldung!')}
        />
      )}
    </IntentWizardShell>
  );
}

export default function VeranstaltungAnmeldung() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }

  return (
    <PublicShell title={page.title} description={page.description}>
      <AnmeldungFlow cfg={cfg} page={page} />
    </PublicShell>
  );
}
