/**
 * Anmeldung erfassen — 4-Schritt-Wizard mit Platzprüfung.
 * Steps: 1) Veranstaltung wählen → 2) Teilnehmerdaten erfassen (mit Platzanzeige) → 3) Bestehenden Kontakt zuordnen → 4) Prüfen & speichern.
 * Reads: veranstaltungen, kontakte, anmeldungen (Platzzählung). Writes: anmeldungen (via useAnmeldungErfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, BudgetTracker, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { BudgetTracker } from '@/components/blocks/BudgetTracker';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  fieldText,
  fieldDate,
  fieldNumber,
  fieldLookup,
  fieldRef,
  refFilter,
  combineFilters,
  useRecordCount,
} from '@/lib/journey';
import { useAnmeldungErfassenFlow } from '@/lib/journey/flows/AnmeldungErfassen';
import { tx } from '@/i18n';

const BELEGT_KEYS = ['angemeldet', 'bestaetigt', 'teilgenommen'];

export default function AnmeldungErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useAnmeldungErfassenFlow({
    steps: { veranstaltung: 1, vorname: 2, nachname: 2, email: 2, telefon: 2, firma: 2, kontakt: 3 },
    items: {
      veranstaltung: r => {
        const beginn = fieldDate(r, 'beginn');
        const wann = beginn ? format(parseISO(beginn), 'dd.MM.yyyy HH:mm') : '';
        const ort = fieldText(r, 'ort');
        return { id: r.id, title: fieldText(r, 'titel'), subtitle: [wann, ort].filter(Boolean).join(' · ') };
      },
      kontakt: r => ({ id: r.id, title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(), subtitle: fieldText(r, 'email') }),
    },
  });

  const form = flow.forms.anmeldungen;
  const veranstaltungId = (form.get('veranstaltung') as string | null) || '';
  const veranstaltung = veranstaltungId ? flow.picks.veranstaltung.recordOf(veranstaltungId) : undefined;
  const maxTeilnehmer = veranstaltung ? fieldNumber(veranstaltung, 'max_teilnehmer') ?? 0 : 0;

  const belegt = useRecordCount(flow.port, 'anmeldungen', {
    filter: veranstaltungId
      ? combineFilters(refFilter('veranstaltung', veranstaltungId), "r.v_anmeldestatus in ['angemeldet', 'bestaetigt', 'teilgenommen']")
      : undefined,
    where: a =>
      fieldRef(a, 'veranstaltung') === veranstaltungId && BELEGT_KEYS.includes(fieldLookup(a, 'anmeldestatus')?.key ?? ''),
    enabled: Boolean(veranstaltungId),
  });
  const belegtCount = belegt.count ?? 0;
  const ausgebucht = maxTeilnehmer > 0 && belegt.count !== null && belegtCount >= maxTeilnehmer;

  return (
    <IntentWizardShell
      title={tx('Anmeldung erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Erfasse eine Anmeldung zu einer Veranstaltung und prüfe dabei die freien Plätze.'),
        needs: [tx('Name und E-Mail-Adresse der Person'), tx('Die gewünschte Veranstaltung')],
      }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Für welche Veranstaltung meldet sich die Person an?')}>
        <EntitySelectStep
          {...flow.picks.veranstaltung.select}
          {...flow.pick('veranstaltung')}
          avatar="none"
          searchPlaceholder={tx('Titel oder Ort suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Teilnehmer')} description={tx('Wer soll angemeldet werden?')} needs={['veranstaltung']}>
        <div className="space-y-4">
          {veranstaltung && (
            <div className="space-y-2">
              {maxTeilnehmer > 0 ? (
                <BudgetTracker
                  format="count"
                  unit={tx('Plätze')}
                  budget={maxTeilnehmer}
                  booked={belegtCount}
                  label={fieldText(veranstaltung, 'titel')}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{tx('Für diese Veranstaltung ist keine Platzgrenze hinterlegt.')}</p>
              )}
              {ausgebucht && (
                <p className="text-sm text-destructive" role="alert">
                  {tx('Diese Veranstaltung ist ausgebucht — die Anmeldung sollte auf die Warteliste gesetzt werden.')}
                </p>
              )}
            </div>
          )}
          <Bound form={form} name="vorname" />
          <Bound form={form} name="nachname" />
          <Bound form={form} name="email" />
          <Bound form={form} name="telefon" />
          <Bound form={form} name="firma" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Kontakt zuordnen')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Kontakt')}
        description={tx('Gibt es die Person schon als Kontakt? Dann wähle ihn aus — sonst überspringe den Schritt.')}
      >
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.kontakt.select}
            {...flow.pick('kontakt')}
            avatar="initials"
            searchPlaceholder={tx('Name oder E-Mail …')}
          />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')} description={tx('Kontrolliere die Angaben und speichere die Anmeldung.')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'anmeldestatus', label: tx('Status'), value: tx('Angemeldet') },
              { key: 'anmeldedatum', label: tx('Anmeldedatum'), value: format(new Date(), 'dd.MM.yyyy') },
            ]}
            whatHappensNext={tx('Die Anmeldung wird mit dem heutigen Datum gespeichert und kann danach bestätigt werden.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Weitere Anmeldung erfassen'), onClick: () => flow.reset() },
            { label: tx('Anmeldung bestätigen'), href: '#/intents/anmeldung-bestaetigen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Im nächsten Schritt kannst du die Anmeldung bestätigen.')}
        />
      )}
    </IntentWizardShell>
  );
}
