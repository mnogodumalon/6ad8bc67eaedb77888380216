/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'kunden'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.kunden.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.kunden.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.kunden.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.kunden              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   kunden: firmenname, branche, strasse, hausnummer, plz, ort, telefon, email, …  ·  ← kontakte (list + contextual +) · ← pruefgeraete (list + contextual +)
 *   kontakte: vorname, nachname, kunde, position, email, telefon, ist_anwender  ·  → kunden · ← anmeldungen (list + contextual +)
 *   pruefgeraete: bezeichnung, hersteller, typ, seriennummer, anwendungsbereich, preis, kunde, kaufdatum, …  ·  → kunden
 *   veranstaltungen: titel, beginn, ort, beschreibung, max_teilnehmer, status  ·  ← anmeldungen (list + contextual +)
 *   anmeldungen: veranstaltung, vorname, nachname, email, telefon, firma, kontakt, anmeldestatus, …  ·  → veranstaltungen · → kontakte
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Kunden, Kontakte, Pruefgeraete, Veranstaltungen, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichKontakte, enrichPruefgeraete, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedKontakte, EnrichedPruefgeraete, EnrichedAnmeldungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KundenDialog, type KundenDialogDefaults } from '@/components/dialogs/KundenDialog';
import { KundenDetails } from '@/components/details/KundenDetails';
import { KontakteDialog, type KontakteDialogDefaults } from '@/components/dialogs/KontakteDialog';
import { KontakteDetails } from '@/components/details/KontakteDetails';
import { PruefgeraeteDialog, type PruefgeraeteDialogDefaults } from '@/components/dialogs/PruefgeraeteDialog';
import { PruefgeraeteDetails } from '@/components/details/PruefgeraeteDetails';
import { VeranstaltungenDialog, type VeranstaltungenDialogDefaults } from '@/components/dialogs/VeranstaltungenDialog';
import { VeranstaltungenDetails } from '@/components/details/VeranstaltungenDetails';
import { AnmeldungenDialog, type AnmeldungenDialogDefaults } from '@/components/dialogs/AnmeldungenDialog';
import { AnmeldungenDetails } from '@/components/details/AnmeldungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'kunden'; record: Kunden }
  | { type: 'kontakte'; record: EnrichedKontakte }
  | { type: 'pruefgeraete'; record: EnrichedPruefgeraete }
  | { type: 'veranstaltungen'; record: Veranstaltungen }
  | { type: 'anmeldungen'; record: EnrichedAnmeldungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  kunden: EntityCrudApi<Kunden, KundenDialogDefaults>;
  kontakte: EntityCrudApi<Kontakte, KontakteDialogDefaults>;
  pruefgeraete: EntityCrudApi<Pruefgeraete, PruefgeraeteDialogDefaults>;
  veranstaltungen: EntityCrudApi<Veranstaltungen, VeranstaltungenDialogDefaults>;
  anmeldungen: EntityCrudApi<Anmeldungen, AnmeldungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { kunden: Kunden[]; kontakte: EnrichedKontakte[]; pruefgeraete: EnrichedPruefgeraete[]; veranstaltungen: Veranstaltungen[]; anmeldungen: EnrichedAnmeldungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [kundenDialog, setKundenDialog] = useState<{ defaults?: KundenDialogDefaults; editing?: Kunden } | null>(null);
  const [kontakteDialog, setKontakteDialog] = useState<{ defaults?: KontakteDialogDefaults; editing?: Kontakte } | null>(null);
  const [pruefgeraeteDialog, setPruefgeraeteDialog] = useState<{ defaults?: PruefgeraeteDialogDefaults; editing?: Pruefgeraete } | null>(null);
  const [veranstaltungenDialog, setVeranstaltungenDialog] = useState<{ defaults?: VeranstaltungenDialogDefaults; editing?: Veranstaltungen } | null>(null);
  const [anmeldungenDialog, setAnmeldungenDialog] = useState<{ defaults?: AnmeldungenDialogDefaults; editing?: Anmeldungen } | null>(null);
  const enrichedKontakte = useMemo(() => enrichKontakte(data.kontakte, { kundenMap: data.kundenMap }), [data.kontakte, data.kundenMap]);
  const enrichedPruefgeraete = useMemo(() => enrichPruefgeraete(data.pruefgeraete, { kundenMap: data.kundenMap }), [data.pruefgeraete, data.kundenMap]);
  const enrichedAnmeldungen = useMemo(() => enrichAnmeldungen(data.anmeldungen, { veranstaltungenMap: data.veranstaltungenMap, kontakteMap: data.kontakteMap }), [data.anmeldungen, data.veranstaltungenMap, data.kontakteMap]);

  function detailKunden(record: Kunden, push = false) {
    const item: OverlayItem = { type: 'kunden', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKunden(fields: Kunden['fields']) {
    const editing = kundenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKunden(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKundenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kunden')} — ${t('crud_updated')}`, async () => {
        data.setKunden(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKundenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKundenEntry(fields);
      undoToast(`${appLabel('kunden')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKontakte(record: Kontakte, push = false) {
    const rec = enrichedKontakte.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kontakte', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKontakte(fields: Kontakte['fields']) {
    const editing = kontakteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKontakte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKontakteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kontakte')} — ${t('crud_updated')}`, async () => {
        data.setKontakte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKontakteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKontakteEntry(fields);
      undoToast(`${appLabel('kontakte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailPruefgeraete(record: Pruefgeraete, push = false) {
    const rec = enrichedPruefgeraete.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'pruefgeraete', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitPruefgeraete(fields: Pruefgeraete['fields']) {
    const editing = pruefgeraeteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setPruefgeraete(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updatePruefgeraeteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('pruefgeraete')} — ${t('crud_updated')}`, async () => {
        data.setPruefgeraete(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updatePruefgeraeteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createPruefgeraeteEntry(fields);
      undoToast(`${appLabel('pruefgeraete')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailVeranstaltungen(record: Veranstaltungen, push = false) {
    const item: OverlayItem = { type: 'veranstaltungen', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitVeranstaltungen(fields: Veranstaltungen['fields']) {
    const editing = veranstaltungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setVeranstaltungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateVeranstaltungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('veranstaltungen')} — ${t('crud_updated')}`, async () => {
        data.setVeranstaltungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateVeranstaltungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createVeranstaltungenEntry(fields);
      undoToast(`${appLabel('veranstaltungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAnmeldungen(record: Anmeldungen, push = false) {
    const rec = enrichedAnmeldungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'anmeldungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAnmeldungen(fields: Anmeldungen['fields']) {
    const editing = anmeldungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAnmeldungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAnmeldungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_updated')}`, async () => {
        data.setAnmeldungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAnmeldungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAnmeldungenEntry(fields);
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <KundenDialog
        open={kundenDialog !== null}
        onClose={() => setKundenDialog(null)}
        onSubmit={submitKunden}
        defaultValues={kundenDialog?.defaults}
        recordId={kundenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kunden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kunden']}
      />
      <KontakteDialog
        open={kontakteDialog !== null}
        onClose={() => setKontakteDialog(null)}
        onSubmit={submitKontakte}
        defaultValues={kontakteDialog?.defaults}
        recordId={kontakteDialog?.editing?.record_id}
        kundenList={data.kunden}
        enablePhotoScan={AI_PHOTO_SCAN['Kontakte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kontakte']}
      />
      <PruefgeraeteDialog
        open={pruefgeraeteDialog !== null}
        onClose={() => setPruefgeraeteDialog(null)}
        onSubmit={submitPruefgeraete}
        defaultValues={pruefgeraeteDialog?.defaults}
        recordId={pruefgeraeteDialog?.editing?.record_id}
        kundenList={data.kunden}
        enablePhotoScan={AI_PHOTO_SCAN['Pruefgeraete']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Pruefgeraete']}
      />
      <VeranstaltungenDialog
        open={veranstaltungenDialog !== null}
        onClose={() => setVeranstaltungenDialog(null)}
        onSubmit={submitVeranstaltungen}
        defaultValues={veranstaltungenDialog?.defaults}
        recordId={veranstaltungenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Veranstaltungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Veranstaltungen']}
      />
      <AnmeldungenDialog
        open={anmeldungenDialog !== null}
        onClose={() => setAnmeldungenDialog(null)}
        onSubmit={submitAnmeldungen}
        defaultValues={anmeldungenDialog?.defaults}
        recordId={anmeldungenDialog?.editing?.record_id}
        veranstaltungenList={data.veranstaltungen}
        kontakteList={data.kontakte}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'kunden') {
            return (
              <>
                <RecordHeader title={top.record.fields.firmenname ?? appLabel('kunden')} subtitle={undefined} />
                <KundenDetails
                  record={top.record}
                  kontakteList={data.kontakte}
                  onOpenKontakte={(r) => detailKontakte(r, true)}
                  onAddKontakte={perms.canWrite('kontakte') ? () => setKontakteDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } }) : undefined}
                  pruefgeraeteList={data.pruefgeraete}
                  onOpenPruefgeraete={(r) => detailPruefgeraete(r, true)}
                  onAddPruefgeraete={perms.canWrite('pruefgeraete') ? () => setPruefgeraeteDialog({ defaults: { kunde: createRecordUrl(APP_IDS.KUNDEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'kontakte') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('kontakte')} subtitle={undefined} />
                <KontakteDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={perms.canWrite('anmeldungen') ? () => setAnmeldungenDialog({ defaults: { kontakt: createRecordUrl(APP_IDS.KONTAKTE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'pruefgeraete') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('pruefgeraete')} subtitle={top.record.fields.kaufdatum ? formatDate(top.record.fields.kaufdatum) : undefined} />
                <PruefgeraeteDetails
                  record={top.record}
                  kundenList={data.kunden}
                  onOpenKunden={(r) => detailKunden(r, true)}
                />
              </>
            );
          }
          if (top.type === 'veranstaltungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.titel ?? appLabel('veranstaltungen')} subtitle={top.record.fields.beginn ? formatDate(top.record.fields.beginn) : undefined} />
                <VeranstaltungenDetails
                  record={top.record}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={perms.canWrite('anmeldungen') ? () => setAnmeldungenDialog({ defaults: { veranstaltung: createRecordUrl(APP_IDS.VERANSTALTUNGEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'anmeldungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('anmeldungen')} subtitle={top.record.fields.anmeldedatum ? formatDate(top.record.fields.anmeldedatum) : undefined} />
                <AnmeldungenDetails
                  record={top.record}
                  veranstaltungenList={data.veranstaltungen}
                  onOpenVeranstaltungen={(r) => detailVeranstaltungen(r, true)}
                  kontakteList={data.kontakte}
                  onOpenKontakte={(r) => detailKontakte(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'kunden') return perms.canWrite('kunden');
          if (top.type === 'kontakte') return perms.canWrite('kontakte');
          if (top.type === 'pruefgeraete') return perms.canWrite('pruefgeraete');
          if (top.type === 'veranstaltungen') return perms.canWrite('veranstaltungen');
          if (top.type === 'anmeldungen') return perms.canWrite('anmeldungen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'kunden') setKundenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kontakte') setKontakteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'pruefgeraete') setPruefgeraeteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'veranstaltungen') setVeranstaltungenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'anmeldungen') setAnmeldungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    kunden: {
      openCreate: (defaults?: KundenDialogDefaults) => (perms.canWrite('kunden') ? setKundenDialog({ defaults }) : refuse()),
      openEdit: (record: Kunden) => (perms.canWrite('kunden') ? setKundenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kunden) => detailKunden(record, false),
      canWrite: perms.canWrite('kunden'),
    },
    kontakte: {
      openCreate: (defaults?: KontakteDialogDefaults) => (perms.canWrite('kontakte') ? setKontakteDialog({ defaults }) : refuse()),
      openEdit: (record: Kontakte) => (perms.canWrite('kontakte') ? setKontakteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Kontakte) => detailKontakte(record, false),
      canWrite: perms.canWrite('kontakte'),
    },
    pruefgeraete: {
      openCreate: (defaults?: PruefgeraeteDialogDefaults) => (perms.canWrite('pruefgeraete') ? setPruefgeraeteDialog({ defaults }) : refuse()),
      openEdit: (record: Pruefgeraete) => (perms.canWrite('pruefgeraete') ? setPruefgeraeteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Pruefgeraete) => detailPruefgeraete(record, false),
      canWrite: perms.canWrite('pruefgeraete'),
    },
    veranstaltungen: {
      openCreate: (defaults?: VeranstaltungenDialogDefaults) => (perms.canWrite('veranstaltungen') ? setVeranstaltungenDialog({ defaults }) : refuse()),
      openEdit: (record: Veranstaltungen) => (perms.canWrite('veranstaltungen') ? setVeranstaltungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Veranstaltungen) => detailVeranstaltungen(record, false),
      canWrite: perms.canWrite('veranstaltungen'),
    },
    anmeldungen: {
      openCreate: (defaults?: AnmeldungenDialogDefaults) => (perms.canWrite('anmeldungen') ? setAnmeldungenDialog({ defaults }) : refuse()),
      openEdit: (record: Anmeldungen) => (perms.canWrite('anmeldungen') ? setAnmeldungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Anmeldungen) => detailAnmeldungen(record, false),
      canWrite: perms.canWrite('anmeldungen'),
    },
    enriched: { kunden: data.kunden, kontakte: enrichedKontakte, pruefgeraete: enrichedPruefgeraete, veranstaltungen: data.veranstaltungen, anmeldungen: enrichedAnmeldungen },
  };
}
