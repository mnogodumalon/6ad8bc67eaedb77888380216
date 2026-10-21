/**
 * Prüfgerät verkaufen — 4-Schritt-Wizard.
 * Steps: 1) Verfügbares Prüfgerät wählen → 2) Kunden wählen → 3) Preis & Zertifizierungsintervall → 4) Prüfen & abschließen.
 * Reads: pruefgeraete (nur verfügbare), kunden. Writes: pruefgeraete (Kunde, Kaufdatum, Status, Preis, Intervall), kunden (Status „Kunde“) — via useGeraetVerkaufenFlow.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber } from '@/lib/journey';
import { useGeraetVerkaufenFlow } from '@/lib/journey/flows/GeraetVerkaufen';
import { tx } from '@/i18n';

export default function GeraetVerkaufenPage() {
  const [step, setStep] = useState(1);
  const flow = useGeraetVerkaufenFlow({
    steps: { pruefgeraete: 1, kunden: 2, kunde: 2, preis: 3, zertifizierungsintervall: 3 },
    items: {
      pruefgeraete: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: [fieldText(r, 'hersteller'), fieldText(r, 'typ'), fieldText(r, 'seriennummer')].filter(Boolean).join(' · '),
        stats: fieldNumber(r, 'preis') != null ? [{ label: tx('Preis (€)'), value: fieldNumber(r, 'preis') as number }] : undefined,
      }),
      kunden: r => ({
        id: r.id,
        title: fieldText(r, 'firmenname'),
        subtitle: fieldText(r, 'ort'),
      }),
    },
  });

  const pruefgeraetePick = flow.pick('pruefgeraete');
  const kundenPick = flow.pick('kunden');
  const heute = format(new Date(), 'dd.MM.yyyy');

  return (
    <IntentWizardShell
      title={tx('Prüfgerät verkaufen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ein verfügbares Prüfgerät einem Kunden zuordnen und den Verkauf festhalten.'),
        needs: [tx('Das Prüfgerät'), tx('Den Kunden'), tx('Preis und Zertifizierungsintervall')],
      }}
    >
      <WizardStep label={tx('Prüfgerät')} description={tx('Welches verfügbare Prüfgerät wird verkauft?')}>
        <EntitySelectStep
          {...flow.picks.pruefgeraete.select}
          {...pruefgeraetePick}
          avatar="none"
          searchPlaceholder={tx('Bezeichnung, Hersteller oder Seriennummer …')}
          emptyText={tx('Kein Prüfgerät ist aktuell verfügbar.')}
        />
      </WizardStep>
      <WizardStep label={tx('Kunde')} description={tx('An wen geht das Gerät?')} needs={['pruefgeraete']}>
        <EntitySelectStep
          {...flow.picks.kunden.select}
          {...kundenPick}
          onSelect={id => {
            kundenPick.onSelect(id);
            flow.forms.pruefgeraete.set('kunde', id, flow.picks.kunden.labelOf(id));
          }}
          avatar="initials"
          searchPlaceholder={tx('Firmenname oder Ort …')}
        />
      </WizardStep>
      <WizardStep label={tx('Konditionen')} description={tx('Verkaufspreis und Zertifizierungsintervall festlegen.')} needs={['kunde']}>
        <div className="space-y-4">
          <Bound form={flow.forms.pruefgeraete} name="preis" hint={tx('In Euro, z. B. 1490')} />
          <Bound form={flow.forms.pruefgeraete} name="zertifizierungsintervall" hint={tx('In Monaten, z. B. 12')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() =>
              flow.forms.pruefgeraete.get('kunde')
                ? flow.validateStep(3)
                : tx('Bitte zuerst einen Kunden und ein verfügbares Prüfgerät auswählen.')
            }
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'kaufdatum', label: tx('Kaufdatum'), value: heute }]}
            whatHappensNext={tx('Das Gerät gilt als verkauft, der Kunde erhält den Status „Kunde“.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          title={tx('Prüfgerät verkauft')}
          facts={[
            { label: tx('Prüfgerät'), value: flow.picks.pruefgeraete.labelOf(pruefgeraetePick.selectedId ?? '') ?? '—' },
            { label: tx('Kunde'), value: flow.picks.kunden.labelOf(kundenPick.selectedId ?? '') ?? '—' },
            { label: tx('Kaufdatum'), value: heute },
          ]}
          next={[
            { label: tx('Noch ein Gerät verkaufen'), onClick: flow.reset },
            { label: tx('Neuen Kunden anlegen'), href: '#/intents/kunde-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
