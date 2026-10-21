/**
 * Anmeldung bestätigen — 2-Schritt-Wizard mit Prüfung.
 * Steps: 1) Offene Anmeldung wählen → 2) Bestätigen oder auf Warteliste setzen → 3) Prüfen & speichern.
 * Reads: anmeldungen (veranstaltung, vorname, nachname, email, anmeldestatus). Writes: anmeldungen.anmeldestatus (update).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useAnmeldungBestaetigenFlow } from '@/lib/journey/flows/AnmeldungBestaetigen';
import { tx } from '@/i18n';

export default function AnmeldungBestaetigenPage() {
  const [step, setStep] = useState(1);
  const flow = useAnmeldungBestaetigenFlow({
    steps: { anmeldungen: 1, anmeldestatus: 2 },
    items: {
      anmeldungen: (r, ctx) => {
        const status = fieldLookup(r, 'anmeldestatus');
        const veranstaltung = ctx.ref('veranstaltung');
        const email = fieldText(r, 'email');
        return {
          id: r.id,
          title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim() || tx('Ohne Namen'),
          subtitle: [veranstaltung, email].filter(Boolean).join(' · '),
          status: status ?? undefined,
        };
      },
    },
  });

  return (
    <IntentWizardShell
      title={tx('Anmeldung bestätigen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Anmeldung bestätigen oder auf die Warteliste setzen.'),
        needs: [tx('Name der Person oder Veranstaltung')],
      }}
    >
      <WizardStep label={tx('Anmeldung')} description={tx('Welche Anmeldung möchtest du bearbeiten?')}>
        <EntitySelectStep
          {...flow.picks.anmeldungen.select}
          {...flow.pick('anmeldungen')}
          avatar="initials"
          mode="combobox"
          searchPlaceholder={tx('Name oder E-Mail …')}
          emptyText={tx('Keine offene Anmeldung vorhanden.')}
        />
        <StepNav
          hideBack
          onNext={() => (flow.targets.anmeldungen.record ? flow.validateStep(1) : tx('Bitte zuerst eine Anmeldung auswählen.'))}
          nextStepLabel={tx('Status')}
        />
      </WizardStep>
      <WizardStep label={tx('Status')} description={tx('Anmeldung bestätigen oder auf die Warteliste setzen.')} needs={['anmeldungen']}>
        <div className="space-y-4">
          <Bound form={flow.forms.anmeldungen} name="anmeldestatus" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Status der Anmeldung wird sofort aktualisiert.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[{ label: tx('Zum Dashboard'), href: '#/' }]}
        />
      )}
    </IntentWizardShell>
  );
}
