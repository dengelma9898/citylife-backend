/**
 * Seeds the 10 prototype Christmas markets into the DEV project (citylife-fe75a) only.
 *
 * Source of truth: `christmas_market_fixtures.dart` in the app worktree
 * (10 markets, season 2026). The markets are written directly to the
 * Firestore collection `christmasMarkets`, bypassing ChristmasMarketsService.
 *
 * Editorial notice (check before go-live): periods and opening hours are
 * prototype example values (source: frankentourismus.de, retrieved Nov 2026);
 * image rights for the Nürnberg `imageUrl` must be clarified.
 *
 * Safety:
 * - Aborts unless certificates/service_account.json belongs to citylife-fe75a.
 * - Default mode is a dry run (prints the plan, touches no Firebase project).
 * - Pass --write to persist, --delete to remove the seeded documents again.
 * - Idempotent: document IDs are the fixture slugs, writes use merge.
 * - On --write, the feature-flag document `settings/christmas_markets_settings`
 *   is created with `isEnabled: false` only if it does not exist yet
 *   (an already activated flag is never reset by the seed).
 *
 * Usage:
 *   node scripts/seed-christmas-markets-citylife.js           # dry run
 *   node scripts/seed-christmas-markets-citylife.js --write   # create/update entries
 *   node scripts/seed-christmas-markets-citylife.js --delete  # remove seed entries
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('node:path');

const EXPECTED_PROJECT_ID = 'citylife-fe75a';
const COLLECTION = 'christmasMarkets';
const FLAG_DOCUMENT_ID = 'christmas_markets_settings';
const SEED_MARKER = 'christmas-markets-seed';

/** UTC midnight so Firestore stores the market day as Timestamp without timezone drift. */
function marketDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

const MARKETS = [
  {
    id: 'nuernberg-christkindlesmarkt',
    name: 'Nürnberger Christkindlesmarkt',
    city: 'Nürnberg',
    place: 'Hauptmarkt',
    description:
      'Einer der ältesten und bekanntesten Weihnachtsmärkte Deutschlands: Rot-weiß gestreifte Buden, Christkind, Zwetschgenmännle und Nürnberger Lebkuchen.',
    periodLabel: '27.11. – 24.12.2026',
    openingHoursLabel: 'Täglich 10–21 Uhr, Heiligabend bis 14 Uhr',
    startDate: marketDate(2026, 11, 27),
    endDate: marketDate(2026, 12, 24),
    latitude: 49.4541,
    longitude: 11.0773,
    imageUrl:
      'https://www.frankentourismus.de/data/thumbs/img/7995361_weihnachtsmarkt-panorama.jpg',
    highlights: ['Christkind', 'Zwetschgenmännle', 'Kinderweihnacht'],
  },
  {
    id: 'fuerth-weihnachtsmarkt',
    name: 'Fürther Weihnachtsmarkt',
    city: 'Fürth',
    place: 'Fürther Freiheit',
    description:
      'Mittelalterlicher Weihnachtsmarkt auf der Fürther Freiheit mit Handwerk, Feuerstellen und historischem Flair.',
    periodLabel: '26.11. – 23.12.2026',
    openingHoursLabel: 'Täglich 10–21 Uhr',
    startDate: marketDate(2026, 11, 26),
    endDate: marketDate(2026, 12, 23),
    latitude: 49.4715,
    longitude: 10.9898,
    highlights: ['Mittelaltermarkt', 'Handwerk', 'Feuershows'],
  },
  {
    id: 'erlangen-weihnachtsmarkt',
    name: 'Erlanger Weihnachtsmarkt',
    city: 'Erlangen',
    place: 'Hugenottenplatz',
    description:
      'Gleich mehrere Märkte in der Innenstadt: historischer Weihnachtsmarkt am Neustädter Kirchenplatz und Buden am Hugenottenplatz.',
    periodLabel: '23.11. – 24.12.2026',
    openingHoursLabel: 'Täglich 11–21 Uhr',
    startDate: marketDate(2026, 11, 23),
    endDate: marketDate(2026, 12, 24),
    latitude: 49.5964,
    longitude: 11.004,
    highlights: ['Historischer Markt', 'Waldweihnacht', 'Riesenrad'],
  },
  {
    id: 'roth-christkindlesmarkt',
    name: 'Rother Christkindlesmarkt',
    city: 'Roth',
    place: 'Marktplatz',
    description:
      'Kleiner, feiner Markt rund um den Marktplatz – laut Frankentourismus 19. bis 22.11.2026.',
    periodLabel: '19. – 22.11.2026',
    openingHoursLabel: 'Do–So, Zeiten vor Ort prüfen',
    startDate: marketDate(2026, 11, 19),
    endDate: marketDate(2026, 11, 22),
    latitude: 49.2459,
    longitude: 11.0911,
    highlights: ['Kurzes Adventswochenende', 'Altstadt'],
  },
  {
    id: 'rothenburg-reiterlesmarkt',
    name: 'Rothenburger Reiterlesmarkt',
    city: 'Rothenburg ob der Tauber',
    place: 'Marktplatz',
    description:
      'Weihnachtsmarkt in der mittelalterlichen Altstadt – ganzjähriges Weihnachtsmuseum inklusive. Start laut Frankentourismus am 20.11.2026.',
    periodLabel: '20.11. – 23.12.2026',
    openingHoursLabel: 'Täglich 11–19 Uhr',
    startDate: marketDate(2026, 11, 20),
    endDate: marketDate(2026, 12, 23),
    latitude: 49.3772,
    longitude: 10.1789,
    highlights: ['Reiterle', 'Altstadt', 'Weihnachtsmuseum'],
  },
  {
    id: 'ansbach-weihnachtsmarkt',
    name: 'Ansbacher Weihnachtsmarkt',
    city: 'Ansbach',
    place: 'Martin-Luther-Platz',
    description:
      'Markt vor der Kulisse der St.-Gumbertus-Kirche mit Krippenausstellung und regionalen Spezialitäten.',
    periodLabel: '26.11. – 24.12.2026',
    openingHoursLabel: 'Täglich 11–20 Uhr',
    startDate: marketDate(2026, 11, 26),
    endDate: marketDate(2026, 12, 24),
    latitude: 49.3029,
    longitude: 10.5717,
    highlights: ['Krippenausstellung', 'Residenzstadt'],
  },
  {
    id: 'bamberg-weihnachtsmarkt',
    name: 'Bamberger Weihnachtsmarkt',
    city: 'Bamberg',
    place: 'Maximiliansplatz',
    description:
      'Weihnachtsmarkt in der UNESCO-Welterbestadt, dazu Krippenstationen in der ganzen Altstadt.',
    periodLabel: '24.11. – 23.12.2026',
    openingHoursLabel: 'Täglich 9:30–20 Uhr',
    startDate: marketDate(2026, 11, 24),
    endDate: marketDate(2026, 12, 23),
    latitude: 49.8917,
    longitude: 10.888,
    highlights: ['Welterbe-Altstadt', 'Krippenweg'],
  },
  {
    id: 'wuerzburg-weihnachtsmarkt',
    name: 'Würzburger Weihnachtsmarkt',
    city: 'Würzburg',
    place: 'Marktplatz',
    description:
      'Über 100 Stände vor der gotischen Marienkapelle, dazu Künstler-Weihnachtsmarkt im Rathaus-Innenhof.',
    periodLabel: '27.11. – 23.12.2026',
    openingHoursLabel: 'Täglich 10–20:30 Uhr',
    startDate: marketDate(2026, 11, 27),
    endDate: marketDate(2026, 12, 23),
    latitude: 49.7939,
    longitude: 9.9296,
    highlights: ['Marienkapelle', 'Künstlermarkt', 'Frankenwein'],
  },
  {
    id: 'dinkelsbuehl-weihnachtsmarkt',
    name: 'Dinkelsbühler Weihnachtsmarkt',
    city: 'Dinkelsbühl',
    place: 'Weinmarkt',
    description:
      'Romantischer Markt in einer der am besten erhaltenen mittelalterlichen Städte Deutschlands.',
    periodLabel: '26.11. – 22.12.2026',
    openingHoursLabel: 'Täglich 11–20 Uhr',
    startDate: marketDate(2026, 11, 26),
    endDate: marketDate(2026, 12, 22),
    latitude: 49.069,
    longitude: 10.3189,
    highlights: ['Fachwerk-Altstadt', 'Münster St. Georg'],
  },
  {
    id: 'forchheim-weihnachtsmarkt',
    name: 'Forchheimer Weihnachtsmarkt',
    city: 'Forchheim',
    place: 'Rathausplatz',
    description:
      'Bekannt für den „schönsten Adventskalender der Welt“: die bemalte Rathausfassade mit 24 Fenstern.',
    periodLabel: '27.11. – 24.12.2026',
    openingHoursLabel: 'Täglich 11–20 Uhr',
    startDate: marketDate(2026, 11, 27),
    endDate: marketDate(2026, 12, 24),
    latitude: 49.7193,
    longitude: 11.0583,
    highlights: ['Rathaus-Adventskalender', 'Fachwerk'],
  },
];

function assertSeedDataIsValid(markets) {
  if (markets.length !== 10) throw new Error(`Expected 10 markets, got ${markets.length}`);
  const ids = new Set(markets.map(market => market.id));
  if (ids.size !== markets.length) throw new Error('Duplicate market ids in seed data');
  for (const market of markets) {
    if (!market.name || !market.city || !market.place || !market.description) {
      throw new Error(`Market with missing required text field: ${market.id}`);
    }
    if (market.endDate < market.startDate) throw new Error(`endDate before startDate: ${market.id}`);
    if (market.latitude < -90 || market.latitude > 90) throw new Error(`Invalid latitude: ${market.id}`);
    if (market.longitude < -180 || market.longitude > 180) {
      throw new Error(`Invalid longitude: ${market.id}`);
    }
  }
}

function createFirestore() {
  const serviceAccountPath = path.join(__dirname, '..', 'certificates', 'service_account.json');
  const serviceAccount = require(serviceAccountPath);
  if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Refusing to run: service account project is "${serviceAccount.project_id}", expected "${EXPECTED_PROJECT_ID}" (DEV only)`,
    );
  }
  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return getFirestore(app);
}

function toDocument(market, now) {
  const { id, ...rest } = market;
  void id;
  return {
    ...rest,
    imageUrl: market.imageUrl ?? null,
    createdAt: now,
    updatedAt: now,
    createdBy: SEED_MARKER,
    updatedBy: SEED_MARKER,
  };
}

async function ensureFeatureFlagDocument(db) {
  const ref = db.collection('settings').doc(FLAG_DOCUMENT_ID);
  const doc = await ref.get();
  if (doc.exists) {
    console.log(`KEEP (already exists): settings/${FLAG_DOCUMENT_ID} isEnabled=${doc.data().isEnabled}`);
    return;
  }
  await ref.set({ isEnabled: false, updatedAt: new Date() });
  console.log(`CREATE: settings/${FLAG_DOCUMENT_ID} with isEnabled=false (activate deliberately later)`);
}

async function seed(db, shouldWrite) {
  assertSeedDataIsValid(MARKETS);
  console.log(
    `Seed plan: ${MARKETS.length} Christmas markets for project ${EXPECTED_PROJECT_ID} into collection ${COLLECTION}`,
  );
  const now = new Date();
  for (const market of MARKETS) {
    console.log(
      `${shouldWrite ? 'WRITE' : 'DRY-RUN'}: ${market.id} – ${market.name} (${market.city}, ${market.periodLabel})`,
    );
    if (shouldWrite) {
      await db.collection(COLLECTION).doc(market.id).set(toDocument(market, now), { merge: true });
    }
  }
  if (shouldWrite) {
    await ensureFeatureFlagDocument(db);
    console.log('Done. Re-running --write updates the same documents (merge, deterministic IDs).');
  } else {
    console.log('Dry run only (no Firebase access). Re-run with --write to persist.');
  }
}

async function deleteSeedData(db) {
  assertSeedDataIsValid(MARKETS);
  console.log(`Deleting ${MARKETS.length} seeded documents from ${EXPECTED_PROJECT_ID}...`);
  for (const market of MARKETS) {
    await db.collection(COLLECTION).doc(market.id).delete();
    console.log(`DELETE: ${market.id}`);
  }
  console.log('Done. The feature-flag document is kept on purpose (toggle it via the admin API).');
}

async function main() {
  if (!process.argv.includes('--write') && !process.argv.includes('--delete')) {
    return seed(null, false);
  }
  const db = createFirestore();
  if (process.argv.includes('--delete')) return deleteSeedData(db);
  return seed(db, true);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
