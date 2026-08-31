export type TeamInfo = {
  code: string;
  name: string;
  primary: string;
  secondary: string;
  penalties: string[];
  freeKicks: string[];
  corners: string[];
};

export const teams: TeamInfo[] = [
  { code: 'ATA', name: 'Atalanta', primary: '#166534', secondary: '#7dd3fc', penalties: ['Kessié', 'Scamacca', 'De Ketelaere'], freeKicks: ['Samardzic', 'De Ketelaere', 'Gaetano', 'Raspadori'], corners: ['Samardzic', 'Gaetano', 'Bernasconi', 'Bellanova'] },
  { code: 'BOL', name: 'Bologna', primary: '#991b1b', secondary: '#1e3a8a', penalties: ['Orsolini', 'Dovbyk', 'Bernardeschi'], freeKicks: ['Orsolini', 'Bernardeschi', 'Ferguson'], corners: ['Orsolini', 'Miranda', 'Bernardeschi', 'Ferguson'] },
  { code: 'CAG', name: 'Cagliari', primary: '#9f1239', secondary: '#172554', penalties: ['Fazzini', 'Mina', 'Deiola'], freeKicks: ['Fazzini', 'Maldini', 'Obert'], corners: ['Fazzini', 'Obert', 'Maldini', 'Romano'] },
  { code: 'COM', name: 'Como', primary: '#1d4ed8', secondary: '#dbeafe', penalties: ['Da Cunha', 'Nico Paz', 'Douvikas'], freeKicks: ['Nico Paz', 'Baturina', 'Da Cunha'], corners: ['Nico Paz', 'Baturina', 'Da Cunha', 'Perrone'] },
  { code: 'FIO', name: 'Fiorentina', primary: '#6d28d9', secondary: '#ede9fe', penalties: ['Gudmundsson', 'Pellegrino', 'Mandragora'], freeKicks: ['Gudmundsson', 'Mastantuono', 'Mandragora', 'Fagioli'], corners: ['Fagioli', 'Gudmundsson', 'Mastantuono', 'Mandragora'] },
  { code: 'FRO', name: 'Frosinone', primary: '#1d4ed8', secondary: '#fde047', penalties: ['Calò', 'Raimondo'], freeKicks: ['Calò', 'Ghedjemis', 'Kvernadze'], corners: ['Calò', 'Kvernadze', 'Ghedjemis'] },
  { code: 'GEN', name: 'Genoa', primary: '#9f1239', secondary: '#1e3a8a', penalties: ['Colombo', 'Messias', 'Vitinha'], freeKicks: ['Baldanzi', 'Messias', 'Frendrup'], corners: ['Mitaj', 'Baldanzi', 'Messias', 'Frendrup'] },
  { code: 'INT', name: 'Inter', primary: '#1d4ed8', secondary: '#111827', penalties: ['Calhanoglu', 'Lautaro Martinez', 'Zielinski'], freeKicks: ['Dimarco', 'Calhanoglu', 'Sucic', 'Zielinski'], corners: ['Calhanoglu', 'Dimarco', 'Zielinski'] },
  { code: 'JUV', name: 'Juventus', primary: '#111827', secondary: '#f9fafb', penalties: ['Yildiz', 'Locatelli', 'Kolo Muani'], freeKicks: ['Yildiz', 'Cambiaso', 'Locatelli'], corners: ['Yildiz', 'Cambiaso', 'Locatelli', 'Zhegrova'] },
  { code: 'LAZ', name: 'Lazio', primary: '#0284c7', secondary: '#e0f2fe', penalties: ['Zaccagni', 'Pinamonti', 'Cataldi'], freeKicks: ['Zaccagni', 'Cataldi', 'Taylor', 'Rovella'], corners: ['Zaccagni', 'Taylor', 'Rovella', 'Cataldi'] },
  { code: 'LEC', name: 'Lecce', primary: '#dc2626', secondary: '#fde047', penalties: ['Geubbels', 'Stulic', 'Pierotti'], freeKicks: ['Gallo', 'Pierotti', 'Berisha'], corners: ['Gallo', 'Pierotti', 'Berisha'] },
  { code: 'MIL', name: 'Milan', primary: '#dc2626', secondary: '#111827', penalties: ['Gonçalo Ramos', 'Pulisic'], freeKicks: ['Modric', 'Pulisic', 'Ricci'], corners: ['Modric', 'Pulisic', 'Bartesaghi', 'Jashari'] },
  { code: 'MON', name: 'Monza', primary: '#dc2626', secondary: '#f9fafb', penalties: ['Pessina', 'Cutrone', 'Petagna'], freeKicks: ['Colpani', 'Pessina', 'Ciurria'], corners: ['Pessina', 'Colpani', 'Ciurria', 'Birindelli'] },
  { code: 'NAP', name: 'Napoli', primary: '#0284c7', secondary: '#e0f2fe', penalties: ['De Bruyne', 'Højlund'], freeKicks: ['De Bruyne', 'Politano', 'Neres', 'Lobotka'], corners: ['De Bruyne', 'Politano', 'Neres', 'Lobotka'] },
  { code: 'PAR', name: 'Parma', primary: '#1d4ed8', secondary: '#facc15', penalties: ['El Bilal Touré', 'Bernabé'], freeKicks: ['Bernabé', 'Nicolussi Caviglia', 'Valeri'], corners: ['Bernabé', 'Valeri', 'Ordonez'] },
  { code: 'ROM', name: 'Roma', primary: '#9f1239', secondary: '#f59e0b', penalties: ['Malen', 'Dybala', 'Soulé'], freeKicks: ['Dybala', 'Soulé', 'Pellegrini'], corners: ['Dybala', 'Soulé', 'Wesley'] },
  { code: 'SAS', name: 'Sassuolo', primary: '#16a34a', secondary: '#111827', penalties: ['Berardi', 'Sebastiano Esposito'], freeKicks: ['Berardi', 'Laurienté', 'Volpato'], corners: ['Berardi', 'Laurienté', 'Doig'] },
  { code: 'TOR', name: 'Torino', primary: '#7f1d1d', secondary: '#f1f5f9', penalties: ['Vlasic', 'Zapata', 'Simeone'], freeKicks: ['Vlasic', 'Oristanio', 'Coco', 'Biraghi'], corners: ['Vlasic', 'Oristanio', 'Biraghi'] },
  { code: 'UDI', name: 'Udinese', primary: '#111827', secondary: '#f8fafc', penalties: ['Davis', 'Solet', 'Zaniolo'], freeKicks: ['Zaniolo', 'Ekkelenkamp', 'Vojvoda', 'Miller'], corners: ['Zaniolo', 'Vojvoda', 'Ekkelenkamp', 'Miller'] },
  { code: 'VEN', name: 'Venezia', primary: '#ea580c', secondary: '#14532d', penalties: ['Busio', 'Akor Adams'], freeKicks: ['Busio', 'Basic', 'Kike Pérez', 'Helgason'], corners: ['Busio', 'Kike Pérez', 'Basic', 'Helgason', 'Yeboah'] },
];

export const teamByCode = Object.fromEntries(teams.map((team) => [team.code, team]));

export const dataSources = [
  { label: 'Listone e statistiche', href: 'https://www.fantacalcio.it/quotazioni-fantacalcio' },
  { label: 'Gerarchie rigoristi', href: 'https://www.goal.com/it/liste/fantacalcio-rigoristi-serie-a-2026-2027-tiratori-e-gerarchie-dal-dischetto-delle-20-squadre-del-campionato/bltdebca56c3bd91419' },
  { label: 'Punizioni e corner', href: 'https://www.fantacalciopedia.com/articoli-fcp/consigli-fantacalcio/216-rigoristi-e-tiratori-2026-27.html' },
];
