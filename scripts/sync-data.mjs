import { mkdir, writeFile } from 'node:fs/promises';

const SOURCES = {
  prices: 'https://www.fantacalcio.it/quotazioni-fantacalcio',
  stats: 'https://www.fantacalcio.it/statistiche-serie-a',
};

const headers = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
};

const clean = (value = '') =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const attr = (block, name) => {
  const match = block.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return clean(match?.[1]);
};

const cell = (block, key) => {
  const match = block.match(
    new RegExp(`<t[dh][^>]*data-col-key="${key}"[^>]*>([\\s\\S]*?)<\\/t[dh]>`, 'i'),
  );
  return clean(match?.[1]);
};

const number = (value) => {
  const normalized = String(value ?? '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  return normalized ? Number(normalized) : 0;
};

function rowsFrom(html) {
  return [...html.matchAll(/<tr class="player-row"([\s\S]*?)<\/tr>/gi)].map(
    (match) => match[0],
  );
}

async function get(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

const [pricesHtml, statsHtml] = await Promise.all([
  get(SOURCES.prices),
  get(SOURCES.stats),
]);

const stats = new Map(
  rowsFrom(statsHtml).map((row) => {
    const name = attr(row, 'data-filter-keywords');
    const team = cell(row, 'sq');
    return [
      `${name}::${team}`,
      {
        appearances: number(cell(row, 'pg')),
        average: number(cell(row, 'mv')),
        fantasyAverage: number(cell(row, 'mfv')),
        goals: number(cell(row, 'gol')),
        goalsAgainst: number(cell(row, 'gs')),
        penalties: cell(row, 'rig') || '0 / 0',
        penaltiesSaved: number(cell(row, 'rp')),
        assists: number(cell(row, 'ass')),
        yellows: number(cell(row, 'amm')),
        reds: number(cell(row, 'esp')),
      },
    ];
  }),
);

const players = rowsFrom(pricesHtml).map((row) => {
  const name = attr(row, 'data-filter-keywords');
  const team = cell(row, 'sq');
  const href = row.match(/<a class="player-name player-link"[\s\S]*?href="([^"]+)"/i)?.[1] ?? '';
  const officialId = number(href.match(/\/(\d+)\/?$/)?.[1]);
  return {
    id: officialId || number(attr(row, 'data-index')) + 1,
    name,
    team,
    role: attr(row, 'data-filter-role-classic').toUpperCase(),
    mantra: attr(row, 'data-filter-role-mantra').toUpperCase().split('|').filter(Boolean),
    availability: number(attr(row, 'data-filter-playeds')),
    initialQuote: number(cell(row, 'c_qi')),
    quote: number(cell(row, 'c_qa')),
    fvm: number(cell(row, 'c_fvm')),
    mantraQuote: number(cell(row, 'm_qa')),
    mantraFvm: number(cell(row, 'm_fvm')),
    href,
    ...(stats.get(`${name}::${team}`) ?? {
      appearances: 0,
      average: 0,
      fantasyAverage: 0,
      goals: 0,
      goalsAgainst: 0,
      penalties: '0 / 0',
      penaltiesSaved: 0,
      assists: 0,
      yellows: 0,
      reds: 0,
    }),
  };
});

await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../data/players.json', import.meta.url),
  `${JSON.stringify({ updatedAt: new Date().toISOString(), sources: SOURCES, players }, null, 2)}\n`,
  'utf8',
);

console.log(`Sincronizzati ${players.length} giocatori (${stats.size} con statistiche).`);
