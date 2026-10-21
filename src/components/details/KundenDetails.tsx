import type { Kunden, Kontakte, Pruefgeraete } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface KundenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kunden;
  /** 1:N „Kontakte" (kunde): VOLLE Liste — der Block filtert auf diesen Record. */
  kontakteList: Kontakte[];
  /** Zeilen-Klick → overlay.push auf das Kontakte-Detail (nie der Edit-Dialog). */
  onOpenKontakte: (record: Kontakte) => void;
  /** Kontextuelles „+": öffnet den Kontakte-Dialog mit diesem Record vorgesetzt. */
  onAddKontakte?: () => void;
  /** 1:N „Prüfgeräte" (kunde): VOLLE Liste — der Block filtert auf diesen Record. */
  pruefgeraeteList: Pruefgeraete[];
  /** Zeilen-Klick → overlay.push auf das Pruefgeraete-Detail (nie der Edit-Dialog). */
  onOpenPruefgeraete: (record: Pruefgeraete) => void;
  /** Kontextuelles „+": öffnet den Pruefgeraete-Dialog mit diesem Record vorgesetzt. */
  onAddPruefgeraete?: () => void;
}

export function KundenDetails({
  record,
  kontakteList,
  onOpenKontakte,
  onAddKontakte,
  pruefgeraeteList,
  onOpenPruefgeraete,
  onAddPruefgeraete,
}: KundenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kunden', 'firmenname')} value={record.fields.firmenname} format="text" />
        <RecordField label={fieldLabel('kunden', 'branche')} value={record.fields.branche} format="text" />
        <RecordField label={fieldLabel('kunden', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('kunden', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('kunden', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('kunden', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('kunden', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('kunden', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('kunden', 'website')} value={record.fields.website} format="url" />
        <RecordField label={fieldLabel('kunden', 'kundenstatus')} value={record.fields.kundenstatus} format="pill" />
        <RecordField label={fieldLabel('kunden', 'bemerkungen')} value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('kontakte')}
        items={kontakteList.filter(r => extractRecordId(r.fields.kunde) === record.record_id)}
        map={r => ({ name: r.fields.vorname ?? appLabel('kontakte'), meta: undefined })}
        onOpen={onOpenKontakte}
        onAdd={onAddKontakte}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('pruefgeraete')}
        items={pruefgeraeteList.filter(r => extractRecordId(r.fields.kunde) === record.record_id)}
        map={r => ({ name: r.fields.bezeichnung ?? appLabel('pruefgeraete'), meta: r.fields.kaufdatum })}
        onOpen={onOpenPruefgeraete}
        onAdd={onAddPruefgeraete}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KUNDEN} recordId={record.record_id} readOnly={!perms.canWrite('kunden')} />
    </>
  );
}
