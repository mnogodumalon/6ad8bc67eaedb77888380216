import type { Anmeldungen, Veranstaltungen, Kontakte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface AnmeldungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Anmeldungen;
  /** N:1-Ziel „Veranstaltungen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  veranstaltungenList: Veranstaltungen[];
  /** Klick auf die Veranstaltungen-Relation → overlay.push auf dessen Detail. */
  onOpenVeranstaltungen?: (record: Veranstaltungen) => void;
  /** N:1-Ziel „Kontakte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kontakteList: Kontakte[];
  /** Klick auf die Kontakte-Relation → overlay.push auf dessen Detail. */
  onOpenKontakte?: (record: Kontakte) => void;
}

export function AnmeldungenDetails({
  record,
  veranstaltungenList,
  onOpenVeranstaltungen,
  kontakteList,
  onOpenKontakte,
}: AnmeldungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const veranstaltungTarget = veranstaltungenList.find(r => r.record_id === extractRecordId(record.fields.veranstaltung));
  const kontaktTarget = kontakteList.find(r => r.record_id === extractRecordId(record.fields.kontakt));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('anmeldungen', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('anmeldungen', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'firma')} value={record.fields.firma} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'anmeldestatus')} value={record.fields.anmeldestatus} format="pill" />
        <RecordField label={fieldLabel('anmeldungen', 'anmerkung')} value={record.fields.anmerkung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('anmeldungen', 'anmeldedatum')} value={record.fields.anmeldedatum} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('anmeldungen', 'veranstaltung')}
          name={veranstaltungTarget?.fields.titel ?? '—'}
          meta={[veranstaltungTarget?.fields.ort].filter(Boolean).join(' · ') || undefined}
          onClick={veranstaltungTarget && onOpenVeranstaltungen ? () => onOpenVeranstaltungen!(veranstaltungTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('anmeldungen', 'kontakt')}
          name={kontaktTarget?.fields.vorname ?? '—'}
          meta={[kontaktTarget?.fields.email, kontaktTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={kontaktTarget && onOpenKontakte ? () => onOpenKontakte!(kontaktTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('anmeldungen')} />
    </>
  );
}
