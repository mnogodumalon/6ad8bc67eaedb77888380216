import { useMemo, useState } from 'react';
import { addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { IconAlertTriangle, IconCalendarEvent, IconPlus, IconUserCheck, IconCertificate } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { Pruefgeraete, Anmeldungen } from '@/types/app';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { dateFnsLocale, tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import type { Kunden } from '@/types/app';

const SOON_DAYS = 60;

function toneForStatus(status: string | undefined): KanbanTone {
  if (status === 'verkauft') return 'success';
  if (status === 'in_pruefung') return 'warning';
  if (status === 'ausgemustert') return 'default';
  return 'primary';
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { kunden, pruefgeraete, veranstaltungen, anmeldungen, setPruefgeraete, setAnmeldungen, fetchAll } = data;
  const clock = useClock();
  const [onlySoon, setOnlySoon] = useState(false);

  const advanceDevice = (g: Pruefgeraete) => {
    const prev = g.fields.status;
    const next = lookupOption('pruefgeraete', 'status', 'in_pruefung');
    setPruefgeraete(list => list.map(x => x.record_id === g.record_id ? { ...x, fields: { ...x.fields, status: next } } : x));
    LivingAppsService.updatePruefgeraeteEntry(g.record_id, { status: 'in_pruefung' }).catch(() => { void fetchAll(); });
    undoToast(tx`${g.fields.bezeichnung ?? ''} — zur Prüfung vorgemerkt`, () => {
      setPruefgeraete(list => list.map(x => x.record_id === g.record_id ? { ...x, fields: { ...x.fields, status: prev } } : x));
      LivingAppsService.updatePruefgeraeteEntry(g.record_id, { status: prev?.key }).catch(() => { void fetchAll(); });
    });
  };

  const places = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of anmeldungen) {
      const k = a.fields.anmeldestatus?.key;
      if (k === 'abgesagt' || k === 'warteliste') continue;
      const vid = extractRecordId(a.fields.veranstaltung);
      if (vid) map.set(vid, (map.get(vid) ?? 0) + 1);
    }
    return map;
  }, [anmeldungen]);

  const confirmRegistration = (a: Anmeldungen) => {
    const prev = a.fields.anmeldestatus;
    const vid = extractRecordId(a.fields.veranstaltung);
    const v = veranstaltungen.find(x => x.record_id === vid);
    const max = v?.fields.max_teilnehmer;
    const full = vid && max != null && (places.get(vid) ?? 0) >= max && prev?.key !== 'bestaetigt';
    const key = full ? 'warteliste' : 'bestaetigt';
    const next = lookupOption('anmeldungen', 'anmeldestatus', key);
    setAnmeldungen(list => list.map(x => x.record_id === a.record_id ? { ...x, fields: { ...x.fields, anmeldestatus: next } } : x));
    LivingAppsService.updateAnmeldungenEntry(a.record_id, { anmeldestatus: key }).catch(() => { void fetchAll(); });
    const name = `${a.fields.vorname ?? ''} ${a.fields.nachname ?? ''}`.trim();
    undoToast(full ? tx`${name} — Veranstaltung ausgebucht, auf Warteliste gesetzt` : tx`${name} — bestätigt`, () => {
      setAnmeldungen(list => list.map(x => x.record_id === a.record_id ? { ...x, fields: { ...x.fields, anmeldestatus: prev } } : x));
      LivingAppsService.updateAnmeldungenEntry(a.record_id, { anmeldestatus: prev?.key }).catch(() => { void fetchAll(); });
    });
  };

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'pruefgeraete' && top.record.fields.status?.key !== 'in_pruefung' && top.record.fields.status?.key !== 'ausgemustert') {
        return { label: tx('Zur Prüfung vormerken'), onClick: () => advanceDevice(top.record) };
      }
      if (top.type === 'anmeldungen' && top.record.fields.anmeldestatus?.key !== 'bestaetigt' && top.record.fields.anmeldestatus?.key !== 'teilgenommen' && top.record.fields.anmeldestatus?.key !== 'abgesagt') {
        return { label: tx('Anmeldung bestätigen'), onClick: () => confirmRegistration(top.record) };
      }
      return undefined;
    },
  });
  const enrichedPruefgeraete = crud.enriched.pruefgeraete;
  const enrichedAnmeldungen = crud.enriched.anmeldungen;
  const enrichedVeranstaltungen = crud.enriched.veranstaltungen;

  const today = format(clock, 'yyyy-MM-dd');

  // Certification due date = purchase + interval; only devices in the field matter.
  const due = useMemo(() => {
    const now = parseISO(today);
    return enrichedPruefgeraete.flatMap(g => {
      const k = g.fields.status?.key;
      const interval = g.fields.zertifizierungsintervall;
      if (!g.fields.kaufdatum || !interval || k === 'ausgemustert' || k === 'in_pruefung') return [];
      const d = addMonths(parseISO(g.fields.kaufdatum.slice(0, 10)), interval);
      return [{ g, date: d, days: differenceInCalendarDays(d, now) }];
    }).sort((a, b) => a.days - b.days);
  }, [enrichedPruefgeraete, today]);
  const overdue = due.filter(x => x.days < 0);
  const soon = due.filter(x => x.days >= 0 && x.days <= SOON_DAYS);
  const dueById = useMemo(() => new Map(due.map(x => [x.g.record_id, x])), [due]);

  const columns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['pruefgeraete']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label, tone: toneForStatus(o.key) })),
    [],
  );
  const visibleDevices = onlySoon ? enrichedPruefgeraete.filter(g => soon.some(s => s.g.record_id === g.record_id)) : enrichedPruefgeraete;
  const cards: KanbanCard[] = visibleDevices.map(g => {
    const d = dueById.get(g.record_id);
    const dueText = d ? (d.days < 0 ? tx`Zertifizierung seit ${formatDate(format(d.date, 'yyyy-MM-dd'))} fällig` : tx`Zertifizierung bis ${formatDate(format(d.date, 'yyyy-MM-dd'))}`) : '';
    return {
      id: `geraet:${g.record_id}`,
      column: g.fields.status?.key ?? columns[0]?.key ?? '',
      title: g.fields.bezeichnung ?? g.fields.seriennummer ?? '—',
      subtitle: [g.kundeName, dueText].filter(Boolean).join(' · '),
      tone: toneForStatus(g.fields.status?.key),
    };
  });

  const moveCard = (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    const g = pruefgeraete.find(x => x.record_id === rid);
    if (!g || g.fields.status?.key === newColumn) return;
    const prev = g.fields.status;
    setPruefgeraete(list => list.map(x => x.record_id === rid ? { ...x, fields: { ...x.fields, status: lookupOption('pruefgeraete', 'status', newColumn) } } : x));
    LivingAppsService.updatePruefgeraeteEntry(rid, { status: newColumn }).catch(() => { void fetchAll(); });
    undoToast(tx`${g.fields.bezeichnung ?? ''} — Status geändert`, () => {
      setPruefgeraete(list => list.map(x => x.record_id === rid ? { ...x, fields: { ...x.fields, status: prev } } : x));
      LivingAppsService.updatePruefgeraeteEntry(rid, { status: prev?.key }).catch(() => { void fetchAll(); });
    });
  };

  // Registrations awaiting action
  const open = enrichedAnmeldungen.filter(a => {
    const k = a.fields.anmeldestatus?.key;
    return !k || k === 'angemeldet' || k === 'warteliste';
  });

  // Upcoming events with free places
  const upcoming = enrichedVeranstaltungen
    .filter(v => v.fields.beginn && v.fields.beginn.slice(0, 10) >= today && v.fields.status?.key !== 'abgesagt' && v.fields.status?.key !== 'durchgefuehrt')
    .sort((a, b) => (a.fields.beginn ?? '').localeCompare(b.fields.beginn ?? ''));
  const freeOf = (id: string, max?: number) => (max != null ? max - (places.get(id) ?? 0) : null);
  const nextEvent = upcoming[0];
  const nextFree = nextEvent ? freeOf(nextEvent.record_id, nextEvent.fields.max_teilnehmer) : null;

  const kundenRows = useMemo<ChartRow<Kunden>[]>(() => kunden.map(k => ({ id: `kunde:${k.record_id}`, data: k })), [kunden]);

  const loc = { locale: dateFnsLocale() };
  const isEmpty = pruefgeraete.length + veranstaltungen.length + kunden.length + anmeldungen.length === 0;

  let context: string;
  if (overdue.length > 0) {
    context = tx`Bei ${namen(overdue.map(x => x.g.fields.bezeichnung ?? ''))} ist die Zertifizierung überfällig.`;
  } else if (nextEvent) {
    context = nextFree != null
      ? tx`Nächste Veranstaltung: ${nextEvent.fields.titel ?? ''} am ${format(parseISO(nextEvent.fields.beginn!), 'EEE d. MMM', loc)} — ${nextFree} Plätze frei.`
      : tx`Nächste Veranstaltung: ${nextEvent.fields.titel ?? ''} am ${format(parseISO(nextEvent.fields.beginn!), 'EEE d. MMM', loc)}.`;
  } else if (open.length > 0) {
    context = tx`${namen(open.map(a => a.fields.vorname ?? ''))} warten auf eine Rückmeldung zur Anmeldung.`;
  } else {
    context = tx`Alle Zertifizierungen im Plan, keine offenen Anmeldungen.`;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isEmpty ? tx`Richte deinen Vertrieb ein — starte mit dem ersten Prüfgerät.` : context}</p>
        </div>
        {crud.pruefgeraete.canWrite && (
          <Button onClick={() => crud.pruefgeraete.openCreate({ status: 'verfuegbar' })} className="w-full sm:w-auto">
            <IconPlus size={16} className="shrink-0" />
            {tx('Neues Prüfgerät')}
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={overdue.length > 0 ? (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{ label: tx('Zur Prüfung vormerken'), onClick: () => advanceDevice(overdue[0].g) }}
          >
            <b>{namen(overdue.map(x => x.g.fields.bezeichnung ?? ''), 3)}</b>{' '}
            {tx`Zertifizierung überfällig — ältester Termin war ${formatDate(format(overdue[0].date, 'yyyy-MM-dd'))}.`}
          </HeroBanner>
        ) : undefined}
        kpis={isEmpty ? undefined : (
          <StatStrip>
            <StatStripItem
              title={tx(tx`Zertifizierung in ${SOON_DAYS} Tagen`)}
              value={soon.length}
              icon={<IconCertificate size={18} className="text-muted-foreground" />}
              tone={soon.length > 0 ? 'warning' : 'default'}
              onClick={() => setOnlySoon(v => !v)}
              active={onlySoon}
            />
            <StatStripItem
              title={tx('Offene Anmeldungen')}
              value={open.length}
              icon={<IconUserCheck size={18} className="text-muted-foreground" />}
            />
            <StatStripItem
              title={tx('Freie Plätze nächste Veranstaltung')}
              value={nextFree != null ? nextFree : '—'}
              icon={<IconCalendarEvent size={18} className="text-muted-foreground" />}
              tone={nextFree === 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        )}
        primary={
          <KanbanWidget
            cards={cards}
            columns={columns}
            defaultCollapsed={['ausgemustert']}
            onCardClick={card => {
              const g = pruefgeraete.find(x => x.record_id === card.id.split(':')[1]);
              if (g) crud.pruefgeraete.openDetail(g);
            }}
            onCardMove={moveCard}
            onAddCard={column => crud.pruefgeraete.openCreate({ status: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Anmeldungen')}
              icon={<IconUserCheck size={14} />}
              items={open.map(a => ({
                id: a.record_id,
                title: `${a.fields.vorname ?? ''} ${a.fields.nachname ?? ''}`.trim(),
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{a.fields.anmeldestatus?.label ?? tx('Neu')}</span>
                    <span className="text-muted-foreground"> · {a.veranstaltungName}</span>
                  </>
                ),
                action: { label: tx('Bestätigen'), onClick: () => confirmRegistration(a) },
              }))}
              onItemClick={id => { const a = anmeldungen.find(x => x.record_id === id); if (a) crud.anmeldungen.openDetail(a); }}
              empty={{
                text: nextEvent ? tx`Alles bearbeitet — nächste Veranstaltung: ${nextEvent.fields.titel ?? ''}` : tx('Alles bearbeitet.'),
                action: crud.anmeldungen.canWrite ? { label: tx('Anmeldung erfassen'), onClick: () => crud.anmeldungen.openCreate({ anmeldestatus: 'angemeldet', anmeldedatum: today }) } : undefined,
              }}
            />
            <WorkList
              title={tx('Kommende Veranstaltungen')}
              icon={<IconCalendarEvent size={14} />}
              items={upcoming.map(v => {
                const free = freeOf(v.record_id, v.fields.max_teilnehmer);
                return {
                  id: v.record_id,
                  title: v.fields.titel ?? '—',
                  secondLine: (
                    <>
                      <span className="text-muted-foreground">{formatDate(v.fields.beginn)}</span>
                      {free != null && (
                        <span className={free <= 0 ? 'font-medium text-destructive' : 'font-medium text-emerald-600'}>
                          {' · '}{free <= 0 ? tx('ausgebucht') : tx`${free} Plätze frei`}
                        </span>
                      )}
                    </>
                  ),
                };
              })}
              onItemClick={id => { const v = veranstaltungen.find(x => x.record_id === id); if (v) crud.veranstaltungen.openDetail(v); }}
              empty={{
                text: tx('Keine Veranstaltung geplant.'),
                action: crud.veranstaltungen.canWrite ? { label: tx('Veranstaltung planen'), onClick: () => crud.veranstaltungen.openCreate({ status: 'geplant' }) } : undefined,
              }}
            />
            <ChartWidget<Kunden>
              title={tx('Kunden nach Status')}
              rows={kundenRows}
              dimension={{ kind: 'category', accessor: r => r.data.fields.kundenstatus, label: appLabel('kunden') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
