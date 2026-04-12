/**
 * MinuteMenu — Crawl quotidien des recettes (GitHub Actions)
 *
 * Sources : Marmiton (prioritaire) + 750g + CuisineAZ
 * Sortie  : Firestore collection `recipeCache` (même format que l'app)
 * Quota   : BATCH_SIZE recettes par run pour éviter le rate-limit
 */

import admin from 'firebase-admin';

/* ══════════════════════════════════════════════════════════════
   FIREBASE ADMIN
══════════════════════════════════════════════════════════════ */

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/* ══════════════════════════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════════════════════════ */

const BATCH_SIZE    = 30;   // recettes fetchées par run
const FS_TTL_DAYS   = 30;   // TTL cache Firestore (même que l'app)

const MARMITON_BASE = 'https://www.marmiton.org';
const G750_BASE     = 'https://www.750g.com';
const CAZ_BASE      = 'https://www.cuisineaz.com';

// Headers navigateur pour réduire les blocages anti-bot
const BROWSER_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control':   'no-cache',
  'Pragma':          'no-cache',
};

/* ══════════════════════════════════════════════════════════════
   POOL DE SEED URLS (miroir de app.js — sources FR uniquement)
══════════════════════════════════════════════════════════════ */

const MARMITON_SEED_URLS = [
  /* ── Classiques français ── */
  `${MARMITON_BASE}/recettes/recette_boeuf-bourguignon_18427.aspx`,
  `${MARMITON_BASE}/recettes/recette_quiche-lorraine_11011.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-dauphinois_11654.aspx`,
  `${MARMITON_BASE}/recettes/recette_blanquette-de-veau-a-l-ancienne_14887.aspx`,
  `${MARMITON_BASE}/recettes/recette_coq-au-vin_14023.aspx`,
  `${MARMITON_BASE}/recettes/recette_pot-au-feu_12346.aspx`,
  `${MARMITON_BASE}/recettes/recette_ratatouille_12012.aspx`,
  `${MARMITON_BASE}/recettes/recette_hachis-parmentier_16547.aspx`,
  `${MARMITON_BASE}/recettes/recette_moules-marinieres_17234.aspx`,
  `${MARMITON_BASE}/recettes/recette_tartiflette_14782.aspx`,
  `${MARMITON_BASE}/recettes/recette_cassoulet_12054.aspx`,
  `${MARMITON_BASE}/recettes/recette_navarin-d-agneau_16234.aspx`,
  `${MARMITON_BASE}/recettes/recette_osso-buco_15678.aspx`,
  /* ── Poulet ── */
  `${MARMITON_BASE}/recettes/recette_poulet-roti_17891.aspx`,
  `${MARMITON_BASE}/recettes/recette_poulet-au-curry_16701.aspx`,
  `${MARMITON_BASE}/recettes/recette_poulet-basquaise_15432.aspx`,
  `${MARMITON_BASE}/recettes/recette_tajine-de-poulet-aux-citrons-confits_21543.aspx`,
  /* ── Pâtes / riz ── */
  `${MARMITON_BASE}/recettes/recette_carbonara_15892.aspx`,
  `${MARMITON_BASE}/recettes/recette_lasagnes-bolognaise_13211.aspx`,
  `${MARMITON_BASE}/recettes/recette_risotto-aux-champignons_19234.aspx`,
  `${MARMITON_BASE}/recettes/recette_couscous-royal_13456.aspx`,
  `${MARMITON_BASE}/recettes/recette_paella_14321.aspx`,
  `${MARMITON_BASE}/recettes/recette_chili-con-carne_11432.aspx`,
  `${MARMITON_BASE}/recettes/recette_spaghetti-bolognaise_14892.aspx`,
  `${MARMITON_BASE}/recettes/recette_penne-all-arrabiata_23156.aspx`,
  `${MARMITON_BASE}/recettes/recette_tagliatelles-au-saumon-fume_20678.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-macaronis_16234.aspx`,
  `${MARMITON_BASE}/recettes/recette_riz-cantonnais_18943.aspx`,
  `${MARMITON_BASE}/recettes/recette_risotto-aux-asperges_25678.aspx`,
  `${MARMITON_BASE}/recettes/recette_risotto-au-poulet-et-champignons_27123.aspx`,
  /* ── Poisson ── */
  `${MARMITON_BASE}/recettes/recette_saumon-au-four_19876.aspx`,
  `${MARMITON_BASE}/recettes/recette_sole-meuniere_17123.aspx`,
  `${MARMITON_BASE}/recettes/recette_moules-au-roquefort_18932.aspx`,
  `${MARMITON_BASE}/recettes/recette_cabillaud-au-four_21034.aspx`,
  `${MARMITON_BASE}/recettes/recette_cabillaud-a-la-provencale_23765.aspx`,
  `${MARMITON_BASE}/recettes/recette_papillote-de-saumon-aux-legumes_19832.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-poisson_17654.aspx`,
  `${MARMITON_BASE}/recettes/recette_brandade-de-morue_15432.aspx`,
  /* ── Canard / veau ── */
  `${MARMITON_BASE}/recettes/recette_magret-de-canard-au-miel_18543.aspx`,
  `${MARMITON_BASE}/recettes/recette_magret-de-canard-sauce-orange_20543.aspx`,
  `${MARMITON_BASE}/recettes/recette_confit-de-canard_15678.aspx`,
  `${MARMITON_BASE}/recettes/recette_escalope-de-veau-a-la-normande_16789.aspx`,
  /* ── Porc ── */
  `${MARMITON_BASE}/recettes/recette_filet-mignon-de-porc-au-four_23451.aspx`,
  `${MARMITON_BASE}/recettes/recette_filet-mignon-de-porc-a-la-moutarde_25832.aspx`,
  `${MARMITON_BASE}/recettes/recette_roti-de-porc-au-four_26543.aspx`,
  `${MARMITON_BASE}/recettes/recette_cotes-de-porc-a-la-normande_24178.aspx`,
  `${MARMITON_BASE}/recettes/recette_cotes-de-porc-a-la-moutarde_19345.aspx`,
  `${MARMITON_BASE}/recettes/recette_travers-de-porc-au-miel_28431.aspx`,
  `${MARMITON_BASE}/recettes/recette_saute-de-porc-au-curry_27654.aspx`,
  `${MARMITON_BASE}/recettes/recette_porc-au-caramel_31245.aspx`,
  /* ── Agneau ── */
  `${MARMITON_BASE}/recettes/recette_gigot-d-agneau-roti_14562.aspx`,
  `${MARMITON_BASE}/recettes/recette_carre-d-agneau-aux-herbes_23187.aspx`,
  `${MARMITON_BASE}/recettes/recette_agneau-aux-legumes_19045.aspx`,
  `${MARMITON_BASE}/recettes/recette_epaule-d-agneau-confite_27891.aspx`,
  /* ── Gratins ── */
  `${MARMITON_BASE}/recettes/recette_gratin-de-pommes-de-terre_11923.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-courgettes_16345.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-brocolis-au-gruyere_18762.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-chou-fleur_15089.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-poireaux-au-jambon_20134.aspx`,
  /* ── Tartes salées / Quiches ── */
  `${MARMITON_BASE}/recettes/recette_quiche-au-thon-et-aux-poireaux_17823.aspx`,
  `${MARMITON_BASE}/recettes/recette_quiche-aux-champignons_16092.aspx`,
  `${MARMITON_BASE}/recettes/recette_tarte-aux-oignons-et-lardons_20456.aspx`,
  `${MARMITON_BASE}/recettes/recette_tarte-a-la-tomate-et-mozzarella_24389.aspx`,
  `${MARMITON_BASE}/recettes/recette_flamiche-aux-poireaux_18234.aspx`,
  /* ── Soupes ── */
  `${MARMITON_BASE}/recettes/recette_soupe-a-l-oignon-gratinee_13782.aspx`,
  `${MARMITON_BASE}/recettes/recette_veloute-de-potimarron_21456.aspx`,
  `${MARMITON_BASE}/recettes/recette_veloute-de-champignons_16892.aspx`,
  /* ── Plats du monde ── */
  `${MARMITON_BASE}/recettes/recette_moussaka_14765.aspx`,
  `${MARMITON_BASE}/recettes/recette_moussaka-grecque_23098.aspx`,
  `${MARMITON_BASE}/recettes/recette_tajine-de-boeuf-aux-pruneaux_19234.aspx`,
  `${MARMITON_BASE}/recettes/recette_poulet-tikka-masala_28765.aspx`,
  `${MARMITON_BASE}/recettes/recette_wok-de-boeuf-aux-legumes_26432.aspx`,
  `${MARMITON_BASE}/recettes/recette_bo-bun_29871.aspx`,
  /* ── Végétarien ── */
  `${MARMITON_BASE}/recettes/recette_curry-de-lentilles_22134.aspx`,
  `${MARMITON_BASE}/recettes/recette_quiche-aux-poireaux_14321.aspx`,
  `${MARMITON_BASE}/recettes/recette_curry-de-pois-chiches_24567.aspx`,
  `${MARMITON_BASE}/recettes/recette_tian-de-legumes_21345.aspx`,
  `${MARMITON_BASE}/recettes/recette_lentilles-a-la-saucisse_17890.aspx`,
  `${MARMITON_BASE}/recettes/recette_shakshuka_31234.aspx`,
  /* ── Express ── */
  `${MARMITON_BASE}/recettes/recette_steak-hache-sauce-au-poivre_18234.aspx`,
  `${MARMITON_BASE}/recettes/recette_omelette-aux-champignons_14567.aspx`,
  `${MARMITON_BASE}/recettes/recette_poulet-au-citron_22876.aspx`,
  `${MARMITON_BASE}/recettes/recette_escalope-milanaise_16789.aspx`,
];

const G750_SEED_URLS = [
  `${G750_BASE}/quiche-lorraine-r1443.htm`,
  `${G750_BASE}/gratin-dauphinois-r1374.htm`,
  `${G750_BASE}/boeuf-bourguignon-r139.htm`,
  `${G750_BASE}/ratatouille-r53809.htm`,
  `${G750_BASE}/pates-carbonara-r200273.htm`,
  `${G750_BASE}/lasagnes-a-la-bolognaise-r1545.htm`,
  `${G750_BASE}/saumon-au-four-r204132.htm`,
  `${G750_BASE}/blanquette-de-veau-facile-r44182.htm`,
  `${G750_BASE}/poulet-basquaise-r87512.htm`,
  `${G750_BASE}/poulet-au-curry-r2251.htm`,
  `${G750_BASE}/poulet-roti-r4313.htm`,
  `${G750_BASE}/hachis-parmentier-r83853.htm`,
  `${G750_BASE}/tajine-de-poulet-au-citron-confit-r18045.htm`,
  `${G750_BASE}/coq-au-vin-r1424.htm`,
  `${G750_BASE}/tartiflette-r49998.htm`,
  `${G750_BASE}/cassoulet-de-castelnaudary-r151.htm`,
  `${G750_BASE}/moules-a-la-mariniere-r4248.htm`,
  `${G750_BASE}/couscous-r6613.htm`,
  `${G750_BASE}/paella-r7892.htm`,
  `${G750_BASE}/magret-de-canard-au-miel-r2733.htm`,
  `${G750_BASE}/risotto-classique-r204142.htm`,
  `${G750_BASE}/risotto-aux-champignons-r40709.htm`,
  `${G750_BASE}/chili-con-carne-r10937.htm`,
  `${G750_BASE}/gigot-dagneau-roti-r204294.htm`,
  `${G750_BASE}/osso-bucco-r1740.htm`,
  `${G750_BASE}/gratin-de-courgettes-r17989.htm`,
  `${G750_BASE}/soupe-a-l-oignon-gratinee-r1561.htm`,
  `${G750_BASE}/veloute-de-potimarron-r87654.htm`,
  `${G750_BASE}/pot-au-feu-r204226.htm`,
  `${G750_BASE}/filet-mignon-de-porc-a-la-moutarde-r74670.htm`,
];

const CAZ_SEED_URLS = [
  `${CAZ_BASE}/recettes/lasagnes-a-la-bolognaise-facile-54832.aspx`,
  `${CAZ_BASE}/recettes/blanquette-de-veau-a-l-ancienne-1548.aspx`,
  `${CAZ_BASE}/recettes/pot-au-feu-traditionnel-5620.aspx`,
  `${CAZ_BASE}/recettes/tartiflette-facile-et-rapide-6782.aspx`,
  `${CAZ_BASE}/recettes/poulet-roti-simple-et-rapide-91.aspx`,
  `${CAZ_BASE}/recettes/boeuf-bourguignon-1352.aspx`,
  `${CAZ_BASE}/recettes/gratin-dauphinois-2341.aspx`,
  `${CAZ_BASE}/recettes/quiche-lorraine-1127.aspx`,
  `${CAZ_BASE}/recettes/coq-au-vin-2187.aspx`,
  `${CAZ_BASE}/recettes/moules-marinieres-3218.aspx`,
  `${CAZ_BASE}/recettes/cassoulet-2876.aspx`,
  `${CAZ_BASE}/recettes/couscous-royal-3156.aspx`,
  `${CAZ_BASE}/recettes/poulet-au-curry-5431.aspx`,
  `${CAZ_BASE}/recettes/poulet-basquaise-3456.aspx`,
  `${CAZ_BASE}/recettes/saumon-au-four-aux-herbes-9876.aspx`,
  `${CAZ_BASE}/recettes/carbonara-facile-8921.aspx`,
  `${CAZ_BASE}/recettes/risotto-aux-champignons-7234.aspx`,
  `${CAZ_BASE}/recettes/soupe-a-l-oignon-gratinee-2345.aspx`,
  `${CAZ_BASE}/recettes/curry-de-pois-chiches-34567.aspx`,
];

const ALL_SEED_URLS = [...MARMITON_SEED_URLS, ...G750_SEED_URLS, ...CAZ_SEED_URLS];

/* ══════════════════════════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════════════════════════ */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function extractIdFromUrl(url) {
  const m750 = url.match(/-r(\d+)\.htm$/);
  if (m750) return '750g_' + m750[1];
  const mMar = url.match(/recette_[a-z0-9][a-z0-9-]+_(\d+)\.aspx$/);
  if (mMar) return 'marmiton_' + mMar[1];
  const mCaz = url.match(/-(\d+)\.aspx$/);
  if (mCaz) return 'caz_' + mCaz[1];
  return null;
}

function parseISO8601Duration(s) {
  if (!s) return 0;
  const m = String(s).match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 60) + parseInt(m[2] || 0);
}

function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à').replace(/&acirc;/g, 'â').replace(/&ocirc;/g, 'ô')
    .replace(/&ugrave;/g, 'ù').replace(/&ucirc;/g, 'û').replace(/&icirc;/g, 'î')
    .replace(/&ccedil;/g, 'ç').replace(/&oelig;/g, 'œ').replace(/&aelig;/g, 'æ')
    .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018')
    .replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/* ══════════════════════════════════════════════════════════════
   EXTRACTION JSON-LD
══════════════════════════════════════════════════════════════ */

function extractJsonLD(html) {
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let parsed;
    try { parsed = JSON.parse(m[1].trim()); } catch (_) { continue; }
    const items = Array.isArray(parsed)
      ? parsed
      : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
    for (const item of items) {
      const type = item['@type'];
      if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return item;
    }
  }
  return null;
}

function processRecipe(schema, url) {
  if (!schema || !schema.name) return null;

  const id   = extractIdFromUrl(url);
  const name = decodeHtmlEntities(schema.name.trim());

  const ingredients = (schema.recipeIngredient || [])
    .map(raw => {
      const str = decodeHtmlEntities(String(raw));
      return { name: str, originalName: str, _translated: true, measure: '', measureFr: '', _measureConverted: true };
    })
    .filter(Boolean);

  const rawInstructions = schema.recipeInstructions || [];
  const steps = [];
  for (const inst of rawInstructions) {
    if (typeof inst === 'string' && inst.trim()) {
      steps.push(decodeHtmlEntities(inst.trim()));
    } else if (inst && typeof inst === 'object') {
      if (inst['@type'] === 'HowToStep') {
        const text = decodeHtmlEntities((inst.text || inst.name || '').trim());
        if (text) steps.push(text);
      } else if (inst['@type'] === 'HowToSection') {
        for (const item of (inst.itemListElement || [])) {
          const text = decodeHtmlEntities((item.text || item.name || '').trim());
          if (text) steps.push(text);
        }
      }
    }
  }

  if (!steps.length || !ingredients.length) return null;

  const prepTime  = parseISO8601Duration(schema.prepTime);
  const cookTime  = parseISO8601Duration(schema.cookTime);
  const totalTime = parseISO8601Duration(schema.totalTime) || (prepTime + cookTime);
  const prep = prepTime  || Math.round((totalTime || 50) * 0.35) || 15;
  const cook = cookTime  || Math.round((totalTime || 50) * 0.65) || 30;

  let image = schema.image || '';
  if (Array.isArray(image))      image = image[0] || '';
  if (typeof image === 'object') image = image.url || image['@id'] || '';
  if (typeof image === 'object') image = '';

  let category = '';
  const rawCat = schema.recipeCategory;
  if (Array.isArray(rawCat))           category = rawCat[0] || '';
  else if (typeof rawCat === 'string') category = rawCat;

  const NON_FOOD = ['cocktail', 'boisson', 'drink', 'smoothie', 'sirop', 'alcool', 'liqueur'];
  if (NON_FOOD.some(kw => category.toLowerCase().includes(kw))) return null;

  return {
    id,
    name,
    nameFr: name,
    _nameFrTranslated: true,
    image,
    category,
    area:     schema.recipeCuisine || '',
    prepTime: prep,
    cookTime: cook,
    ingredients,
    analyzedInstructions: [{ steps: steps.map((s, i) => ({ number: i + 1, step: s })) }],
    stepsFr: steps,
    url
  };
}

/* ══════════════════════════════════════════════════════════════
   SITEMAP MARMITON — découverte d'URLs supplémentaires
══════════════════════════════════════════════════════════════ */

async function fetchMarmitonUrlsFromSitemap() {
  const indexUrl = `${MARMITON_BASE}/wsitemap_recipes_index.xml`;
  const indexXml = await fetchPage(indexUrl);

  // Extraire les URLs des child sitemaps
  const childUrls = [...indexXml.matchAll(/<loc>(https:\/\/www\.marmiton\.org\/wsitemap_recipes[^<]+)<\/loc>/gi)]
    .map(m => m[1])
    .slice(0, 3); // 3 premiers suffit pour ~3000 URLs

  const recipeUrls = [];
  for (const childUrl of childUrls) {
    await sleep(1000 + Math.random() * 1000);
    const xml = await fetchPage(childUrl);
    const urls = [...xml.matchAll(/<loc>(https:\/\/www\.marmiton\.org\/recettes\/recette_[^<]+\.aspx)<\/loc>/gi)]
      .map(m => m[1]);
    recipeUrls.push(...urls);
    console.log(`  Sitemap ${childUrl.split('/').pop()} : ${urls.length} URLs`);
  }

  return recipeUrls;
}

/* ══════════════════════════════════════════════════════════════
   FETCH HTTP DIRECT (pas de proxy CORS côté serveur)
══════════════════════════════════════════════════════════════ */

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal:  AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

/* ══════════════════════════════════════════════════════════════
   FIRESTORE — IDs déjà en cache
══════════════════════════════════════════════════════════════ */

async function getAlreadyCachedIds() {
  const snapshot = await db.collection('recipeCache').select('cachedAt').get();
  const now  = Date.now();
  const fresh = new Set();
  snapshot.forEach(doc => {
    const data  = doc.data();
    const ageDays = (now - (data.cachedAt?.toMillis?.() || 0)) / 86400000;
    if (ageDays < FS_TTL_DAYS) fresh.add(doc.id);
  });
  return fresh;
}

/* ══════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════ */

async function main() {
  console.log('🍽️  MinuteMenu — crawl démarré\n');

  // 1. IDs déjà frais en Firestore
  const cached = await getAlreadyCachedIds();
  console.log(`Cache existant : ${cached.size} recettes\n`);

  // 2. Construire le pool d'URLs
  const urlPool = new Set(ALL_SEED_URLS);

  // 3. Enrichir via sitemap Marmiton
  try {
    console.log('Lecture du sitemap Marmiton...');
    const sitemapUrls = await fetchMarmitonUrlsFromSitemap();
    sitemapUrls.forEach(u => urlPool.add(u));
    console.log(`Sitemap : +${sitemapUrls.length} URLs (total pool : ${urlPool.size})\n`);
  } catch (e) {
    console.warn(`⚠️  Sitemap Marmiton inaccessible : ${e.message}`);
    console.warn('   → On continue avec les seeds uniquement\n');
  }

  // 4. Séparer les sources et filtrer les déjà cachés
  const filterUncached = (urls) => shuffle(urls.filter(url => {
    const id = extractIdFromUrl(url);
    return id && !cached.has(id);
  }));

  const g750Uncached     = filterUncached(G750_SEED_URLS);
  const cazUncached      = filterUncached(CAZ_SEED_URLS);
  const marmitonUncached = filterUncached([...urlPool].filter(u => u.includes('marmiton.org')));

  console.log(`URLs disponibles — 750g : ${g750Uncached.length} | CuisineAZ : ${cazUncached.length} | Marmiton : ${marmitonUncached.length}`);
  console.log(`Quota : ${BATCH_SIZE}\n`);

  // 5. 750g + CuisineAZ en priorité (pas de Cloudflare), Marmiton en fallback
  const batch = [...g750Uncached, ...cazUncached, ...marmitonUncached].slice(0, BATCH_SIZE);

  // 6. Fetch + écriture Firestore
  let success = 0, skipped = 0, failed = 0;

  for (const url of batch) {
    const id = extractIdFromUrl(url);

    // Délai anti-rate-limit (plus long pour Marmiton)
    const delayMs = url.includes('marmiton.org')
      ? 2000 + Math.random() * 3000
      :  500 + Math.random() * 1000;
    await sleep(delayMs);

    try {
      const html   = await fetchPage(url);
      const schema = extractJsonLD(html);
      if (!schema) { skipped++; console.log(`  ⏭️  Pas de JSON-LD : ${url}`); continue; }

      const meal = processRecipe(schema, url);
      if (!meal)  { skipped++; console.log(`  ⏭️  Recette incomplète : ${url}`); continue; }

      await db.collection('recipeCache').doc(id).set({
        meal,
        cachedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      success++;
      console.log(`  ✅ ${meal.name}`);
    } catch (e) {
      failed++;
      console.warn(`  ❌ ${url}`);
      console.warn(`     ${e.message}`);
    }
  }

  console.log(`\n🏁 Terminé — ${success} ajoutées, ${skipped} ignorées, ${failed} erreurs`);
  console.log(`   Cache total estimé : ~${cached.size + success} recettes`);
}

main().catch(e => { console.error(e); process.exit(1); });
