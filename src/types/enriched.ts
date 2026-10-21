import type { Anmeldungen, Kontakte, Pruefgeraete } from './app';

export type EnrichedKontakte = Kontakte & {
  kundeName: string;
};

export type EnrichedPruefgeraete = Pruefgeraete & {
  kundeName: string;
};

export type EnrichedAnmeldungen = Anmeldungen & {
  veranstaltungName: string;
  kontaktName: string;
};
