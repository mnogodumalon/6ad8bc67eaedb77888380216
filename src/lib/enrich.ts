import type { EnrichedAnmeldungen, EnrichedKontakte, EnrichedPruefgeraete } from '@/types/enriched';
import type { Anmeldungen, Kontakte, Kunden, Pruefgeraete, Veranstaltungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface KontakteMaps {
  kundenMap: Map<string, Kunden>;
}

export function enrichKontakte(
  kontakte: Kontakte[],
  maps: KontakteMaps
): EnrichedKontakte[] {
  return kontakte.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'firmenname'),
  }));
}

interface PruefgeraeteMaps {
  kundenMap: Map<string, Kunden>;
}

export function enrichPruefgeraete(
  pruefgeraete: Pruefgeraete[],
  maps: PruefgeraeteMaps
): EnrichedPruefgeraete[] {
  return pruefgeraete.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'firmenname'),
  }));
}

interface AnmeldungenMaps {
  veranstaltungenMap: Map<string, Veranstaltungen>;
  kontakteMap: Map<string, Kontakte>;
}

export function enrichAnmeldungen(
  anmeldungen: Anmeldungen[],
  maps: AnmeldungenMaps
): EnrichedAnmeldungen[] {
  return anmeldungen.map(r => ({
    ...r,
    veranstaltungName: resolveDisplay(r.fields.veranstaltung, maps.veranstaltungenMap, 'titel'),
    kontaktName: resolveDisplay(r.fields.kontakt, maps.kontakteMap, 'vorname', 'nachname'),
  }));
}
