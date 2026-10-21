/**
 * Kunde mit Kontakt anlegen — 3-Schritt-Wizard + Prüfen.
 * Steps: 1) Firmendaten erfassen → 2) Kundenstatus wählen → 3) Ansprechpartner erfassen → 4) Prüfen & anlegen.
 * Reads: —. Writes: kunden, kontakte (via useKundeAnlegenFlow; Kontakt verknüpft mit dem neuen Kunden).
 * Composes: IntentWizardShell, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useKundeAnlegenFlow } from '@/lib/journey/flows/KundeAnlegen';
import { tx } from '@/i18n';

export default function KundeAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useKundeAnlegenFlow({
    steps: {
      firmenname: 1, branche: 1, strasse: 1, hausnummer: 1, plz: 1, ort: 1, telefon: 1, email: 1,
      kundenstatus: 2,
      vorname: 3, nachname: 3, position: 3, ist_anwender: 3,
    },
  });
  const { kunden, kontakte } = flow.forms;

  return (
    <IntentWizardShell
      title={tx('Kunde mit Kontakt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Lege einen Kunden oder Interessenten samt erstem Ansprechpartner an.'),
        needs: [tx('Firmenname und Adresse'), tx('Name des Ansprechpartners')],
      }}
    >
      <WizardStep label={tx('Firmendaten')} description={tx('Trage Name und Adresse der Firma ein.')}>
        <div className="space-y-4">
          <Bound form={kunden} name="firmenname" />
          <Bound form={kunden} name="branche" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Bound form={kunden} name="strasse" className="sm:col-span-2" />
            <Bound form={kunden} name="hausnummer" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Bound form={kunden} name="plz" />
            <Bound form={kunden} name="ort" className="sm:col-span-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Bound form={kunden} name="telefon" />
            <Bound form={kunden} name="email" />
          </div>
          <StepNav
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Kundenstatus')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Kundenstatus')} description={tx('Ist die Firma schon Kunde oder noch Interessent?')}>
        <div className="space-y-4">
          <Bound form={kunden} name="kundenstatus" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Ansprechpartner')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Ansprechpartner')} description={tx('Wer ist dein erster Kontakt in der Firma? Dieser Schritt ist optional.')}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Bound form={kontakte} name="vorname" />
            <Bound form={kontakte} name="nachname" />
          </div>
          <Bound form={kontakte} name="position" />
          <Bound form={kontakte} name="ist_anwender" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Kunde wird angelegt und der Ansprechpartner direkt mit ihm verknüpft.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Du kannst dem neuen Kunden jetzt ein Prüfgerät verkaufen.')}
          next={[
            { label: tx('Prüfgerät verkaufen'), href: '#/intents/geraet-verkaufen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
