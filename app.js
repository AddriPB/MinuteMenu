/* ── Firebase ──────────────────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCoGUrQ71Qdra2useJX8tSI4nCDxJe0TgM",
  authDomain: "minutemenu-9e204.firebaseapp.com",
  projectId: "minutemenu-9e204",
  storageBucket: "minutemenu-9e204.firebasestorage.app",
  messagingSenderId: "466168015297",
  appId: "1:466168015297:web:f85b3b83fbf9356c846740"
};
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

/* ══════════════════════════════════════════════════════════════
   SOURCE DE DONNÉES : 750g + CuisineAZ (via proxy CORS)
══════════════════════════════════════════════════════════════ */

const G750_BASE      = 'https://www.750g.com';
const CAZ_BASE       = 'https://www.cuisineaz.com';
const MARMITON_BASE  = 'https://www.marmiton.org';

/*
  CORS proxies essayés dans l'ordre.
  Chaque entrée : { build(url)→proxyUrl, parse(response)→html }
*/
const CORS_PROXIES = [
  {
    build: u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    parse: async r => r.text()
  },
  {
    build: u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    parse: async r => { const d = await r.json(); return d.contents || ''; }
  },
  {
    build: u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    parse: async r => r.text()
  },
  {
    build: u => `https://killcors.com/${u}`,
    parse: async r => r.text()
  },
];

/* ── Pool de recettes 750g — uniquement plats principaux ──── */
const G750_SEED_URLS = [
  /* ── Classiques français ── */
  `${G750_BASE}/quiche-lorraine-r1443.htm`,
  `${G750_BASE}/gratin-dauphinois-r1374.htm`,
  `${G750_BASE}/boeuf-bourguignon-r139.htm`,
  `${G750_BASE}/ratatouille-r53809.htm`,
  `${G750_BASE}/pates-au-poulet-r83373.htm`,
  `${G750_BASE}/boeuf-bourguignon-facile-et-rapide-r205019.htm`,
  `${G750_BASE}/quiche-au-poulet-r73267.htm`,
  `${G750_BASE}/gratin-dauphinois-du-chef-damien-r99820.htm`,
  `${G750_BASE}/quiche-lorraine-r18979.htm`,
  `${G750_BASE}/quiche-lorraine-r100077.htm`,
  `${G750_BASE}/gratin-dauphinois-r17144.htm`,
  `${G750_BASE}/mon-boeuf-bourguignon-r46878.htm`,
  `${G750_BASE}/boeuf-bourguignon-r23900.htm`,
  `${G750_BASE}/quiche-lorraine-a-la-dinde-r9708.htm`,
  `${G750_BASE}/boeuf-bourguignon-r27517.htm`,

  /* ── Pâtes ── */
  `${G750_BASE}/pates-carbonara-r200273.htm`,
  `${G750_BASE}/spaghetti-a-la-carbonara-r78197.htm`,
  `${G750_BASE}/pates-carbonara-r7084.htm`,
  `${G750_BASE}/lasagnes-a-la-bolognaise-r1545.htm`,
  `${G750_BASE}/lasagnes-gourmandes-a-la-bolognaise-r96904.htm`,
  `${G750_BASE}/lasagne-a-la-bolognaise-r73460.htm`,
  `${G750_BASE}/spaghetti-bolognaise-r98317.htm`,
  `${G750_BASE}/spaghettis-a-la-bolognaise-r43475.htm`,
  `${G750_BASE}/spaghetti-a-la-bolognaise-r2133.htm`,
  `${G750_BASE}/penne-all-arrabbiata-comme-en-italie-r208713.htm`,
  `${G750_BASE}/penne-a-l-arrabiata-r204513.htm`,

  /* ── Poisson ── */
  `${G750_BASE}/duo-de-cabillaud-et-saumon-a-la-sauce-hollandaise-r79856.htm`,
  `${G750_BASE}/gratin-aux-deux-poissons-saumon-et-cabillaud-et-petits-legumes-r42028.htm`,
  `${G750_BASE}/fricassee-de-cabillaud-et-de-saumon-de-norvege-au-curcuma-r79758.htm`,
  `${G750_BASE}/saumon-grille-r4401.htm`,
  `${G750_BASE}/saumon-au-four-r204132.htm`,
  `${G750_BASE}/papillote-de-cabillaud-au-saumon-fume-r203490.htm`,
  `${G750_BASE}/filets-de-poisson-panes-au-four-r207042.htm`,
  `${G750_BASE}/saumon-aux-fruits-de-mer-r64435.htm`,

  /* ── Agneau / Veau ── */
  `${G750_BASE}/navarin-dagneau-r45542.htm`,
  `${G750_BASE}/navarin-dagneau-r92268.htm`,
  `${G750_BASE}/blanquette-dagneau-r7168.htm`,
  `${G750_BASE}/blanquette-de-veau-facile-r44182.htm`,
  `${G750_BASE}/blanquette-de-veau-r2801.htm`,
  `${G750_BASE}/escalope-de-veau-a-la-milanaise-r13406.htm`,
  `${G750_BASE}/escalopes-milanaises-r71929.htm`,
  `${G750_BASE}/escalope-milanaise-r18207.htm`,
  `${G750_BASE}/l-escalope-milanaise-r205377.htm`,

  /* ── Poulet ── */
  `${G750_BASE}/poulet-basquaise-r87512.htm`,
  `${G750_BASE}/poulet-basquaise-r61823.htm`,
  `${G750_BASE}/poulet-basquaise-r65928.htm`,
  `${G750_BASE}/poulet-au-curry-r2251.htm`,
  `${G750_BASE}/wok-de-poulet-au-curry-r60618.htm`,
  `${G750_BASE}/poulet-a-la-thai-r19557.htm`,
  `${G750_BASE}/poulet-roti-r4313.htm`,
  `${G750_BASE}/poulet-roti-r96856.htm`,
  `${G750_BASE}/poulet-roti-r71523.htm`,
  `${G750_BASE}/poulet-roti-et-ses-pommes-de-terre-r41818.htm`,
  `${G750_BASE}/cuisses-de-poulet-et-pomme-de-terre-au-four-r79431.htm`,

  /* ── Hachis / Parmentier ── */
  `${G750_BASE}/hachis-parmentier-r83853.htm`,
  `${G750_BASE}/hachis-camarguais-r83989.htm`,

  /* ── Tajine ── */
  `${G750_BASE}/poulet-aux-olives-et-citron-confit-r203932.htm`,
  `${G750_BASE}/tajine-de-poulet-au-citron-confit-r18045.htm`,
  `${G750_BASE}/tajine-de-poulet-au-citron-confit-et-aux-olives-violettes-r36653.htm`,
  `${G750_BASE}/tajine-de-merguez-legumes-et-semoule-r76663.htm`,

  /* ── Fruits de mer ── */
  `${G750_BASE}/gratin-de-fruits-de-mer-r40601.htm`,
  `${G750_BASE}/crevettes-et-fruits-de-mer-creole-r19720.htm`,
  `${G750_BASE}/risotto-facon-mariniere-r204302.htm`,
  `${G750_BASE}/riz-a-lespagnole-aux-fruits-de-mer-r96926.htm`,

  /* ── Porc ── */
  `${G750_BASE}/saute-de-porc-au-wok-r79360.htm`,
  `${G750_BASE}/cote-de-porc-a-la-moutarde-r51676.htm`,
  `${G750_BASE}/cotes-de-porc-r204183.htm`,
  `${G750_BASE}/filet-mignon-de-porc-a-la-moutarde-r74670.htm`,
  `${G750_BASE}/filet-mignon-de-porc-au-four-r99713.htm`,

  /* ── Coq au vin ── */
  `${G750_BASE}/coq-au-vin-r1424.htm`,
  `${G750_BASE}/coq-au-vin-r19963.htm`,
  `${G750_BASE}/coq-au-vin-r44858.htm`,

  /* ── Tartiflette ── */
  `${G750_BASE}/tartiflette-r49998.htm`,
  `${G750_BASE}/tartiflette-savoyarde-r97147.htm`,

  /* ── Cassoulet ── */
  `${G750_BASE}/cassoulet-de-castelnaudary-r151.htm`,
  `${G750_BASE}/cassoulet-r98605.htm`,

  /* ── Moules ── */
  `${G750_BASE}/moules-a-la-mariniere-r4248.htm`,
  `${G750_BASE}/moules-marinieres-r40004.htm`,

  /* ── Couscous ── */
  `${G750_BASE}/couscous-r6613.htm`,
  `${G750_BASE}/couscous-royal-r14629.htm`,
  `${G750_BASE}/couscous-traditionnel-r53978.htm`,

  /* ── Paella ── */
  `${G750_BASE}/paella-r7892.htm`,
  `${G750_BASE}/paella-r204362.htm`,

  /* ── Pot-au-feu ── */
  `${G750_BASE}/pot-au-feu-r204226.htm`,
  `${G750_BASE}/pot-au-feu-maison-r67956.htm`,

  /* ── Canard ── */
  `${G750_BASE}/magret-de-canard-au-miel-r2733.htm`,
  `${G750_BASE}/magret-de-canard-r55230.htm`,

  /* ── Osso buco ── */
  `${G750_BASE}/osso-bucco-r1740.htm`,
  `${G750_BASE}/osso-bucco-r15170.htm`,

  /* ── Risotto ── */
  `${G750_BASE}/risotto-classique-r204142.htm`,
  `${G750_BASE}/risotto-aux-champignons-r40709.htm`,
  `${G750_BASE}/risotto-au-poulet-r89284.htm`,

  /* ── Poulet à la crème ── */
  `${G750_BASE}/poulet-a-la-creme-r3046.htm`,
  `${G750_BASE}/poulet-a-la-creme-r84362.htm`,
  `${G750_BASE}/escalopes-a-la-creme-et-champignons-r21556.htm`,

  /* ── Chili ── */
  `${G750_BASE}/chili-con-carne-r10937.htm`,

  /* ── Poisson ── */
  `${G750_BASE}/sole-meuniere-r98057.htm`,
  `${G750_BASE}/saumon-au-four-aux-herbes-r200785.htm`,

  /* ── Gigot d'agneau ── */
  `${G750_BASE}/gigot-dagneau-roti-r204294.htm`,
  `${G750_BASE}/gigot-dagneau-classique-r31059.htm`,

  /* ── Gratin légumes ── */
  `${G750_BASE}/gratin-de-courgettes-r17989.htm`,
  `${G750_BASE}/gratin-de-courgettes-au-gruyere-r206304.htm`,
  `${G750_BASE}/gratin-de-courgettes-et-pommes-de-terre-r41360.htm`,
  `${G750_BASE}/gratin-de-courgette-r53438.htm`,

  /* ── Ratatouille (variantes) ── */
  `${G750_BASE}/ratatouille-r4662.htm`,
  `${G750_BASE}/ratatouille-r38385.htm`,

  /* ── Coq au vin (variantes) ── */
  `${G750_BASE}/coq-au-vin-r24347.htm`,
  `${G750_BASE}/coq-au-vin-blanc-r67951.htm`,

  /* ── Tartiflette (variante) ── */
  `${G750_BASE}/tartiflette-r41092.htm`,

  /* ── Cassoulet (variantes) ── */
  `${G750_BASE}/cassoulet-maison-r79045.htm`,
  `${G750_BASE}/cassoulet-de-toulouse-r37966.htm`,

  /* ── Moules (variante) ── */
  `${G750_BASE}/moules-marinieres-r61492.htm`,

  /* ── Couscous (variante) ── */
  `${G750_BASE}/couscous-au-poulet-et-merguez-r66999.htm`,

  /* ── Paella (variante) ── */
  `${G750_BASE}/paella-r87453.htm`,

  /* ── Pot-au-feu (variante) ── */
  `${G750_BASE}/pot-au-feu-r64371.htm`,

  /* ── Filet mignon bœuf ── */
  `${G750_BASE}/filet-mignon-de-boeuf-r39955.htm`,

  /* ── Osso buco (variante) ── */
  `${G750_BASE}/osso-bucco-r20831.htm`,

  /* ── Chili (variantes) ── */
  `${G750_BASE}/chili-con-carne-r95828.htm`,

  /* ── Blanquette de veau (variantes) ── */
  `${G750_BASE}/blanquette-de-veau-tradition-r10688.htm`,

  /* ── Sole (variante) ── */
  `${G750_BASE}/sole-meuniere-r98905.htm`,

  /* ── Hachis parmentier (variantes) ── */
  `${G750_BASE}/hachis-parmentier-rapide-r1613.htm`,
  `${G750_BASE}/hachis-parmentier-r52027.htm`,

  /* ── Navarin (variante) ── */
  `${G750_BASE}/navarin-dagneau-en-cocotte-r33056.htm`,

  /* ── Gigot d'agneau (variante) ── */
  `${G750_BASE}/gigot-dagneau-roti-et-son-jus-r4325.htm`,

  /* ── Pintade ── */
  `${G750_BASE}/pintade-rotie-a-lail-r19966.htm`,
  `${G750_BASE}/pintade-rotie-sauce-au-foie-gras-r5353.htm`,

  /* ── Saumon (variantes) ── */
  `${G750_BASE}/filet-de-saumon-au-four-r88912.htm`,
  `${G750_BASE}/pave-de-saumon-au-four-r69001.htm`,

  /* ── Quenelles ── */
  `${G750_BASE}/quenelles-de-brochet-r35048.htm`,
  `${G750_BASE}/quenelles-de-brochet-sauce-nantua-r8310.htm`,

  /* ── Côtes de porc (variantes) ── */
  `${G750_BASE}/cote-de-porc-au-vin-blanc-et-a-la-tomate-r45535.htm`,
  `${G750_BASE}/cotes-de-porc-charcutiere-r45032.htm`,

  /* ── Soupes & veloutés ── */
  `${G750_BASE}/soupe-a-l-oignon-gratinee-r1561.htm`,
  `${G750_BASE}/soupe-a-l-oignon-r51327.htm`,
  `${G750_BASE}/veloute-de-potimarron-r87654.htm`,
  `${G750_BASE}/soupe-de-poisson-r18462.htm`,
  `${G750_BASE}/soupe-au-pistou-r14326.htm`,
  `${G750_BASE}/veloute-de-champignons-r79234.htm`,
  `${G750_BASE}/veloute-de-carottes-r52819.htm`,
  `${G750_BASE}/soupe-de-legumes-maison-r204802.htm`,
  `${G750_BASE}/gaspacho-r27894.htm`,
  `${G750_BASE}/veloute-de-poireaux-r64521.htm`,

  /* ── Végétarien ── */
  `${G750_BASE}/curry-de-pois-chiches-r204701.htm`,
  `${G750_BASE}/curry-de-legumes-r60321.htm`,
  `${G750_BASE}/quiche-aux-poireaux-r14562.htm`,
  `${G750_BASE}/tarte-aux-poireaux-r24891.htm`,
  `${G750_BASE}/gratin-de-brocolis-r41237.htm`,
  `${G750_BASE}/poelée-de-legumes-du-soleil-r204628.htm`,
  `${G750_BASE}/wrap-de-legumes-r205312.htm`,
  `${G750_BASE}/risotto-aux-asperges-r91234.htm`,

  /* ── Plats rapides / express ── */
  `${G750_BASE}/riz-cantonnais-r204102.htm`,
  `${G750_BASE}/omelette-aux-champignons-r62345.htm`,
  `${G750_BASE}/tagliatelles-au-saumon-r65432.htm`,
  `${G750_BASE}/steak-sauce-poivre-r46781.htm`,
  `${G750_BASE}/poulet-au-citron-r203932.htm`,
  `${G750_BASE}/crevettes-a-l-ail-r56789.htm`,
];

/* ── Pool de recettes CuisineAZ ──────────────────────────── */
const CAZ_SEED_URLS = [
  /* ── Déjà validées ── */
  `${CAZ_BASE}/recettes/lasagnes-a-la-bolognaise-facile-54832.aspx`,
  `${CAZ_BASE}/recettes/blanquette-de-veau-a-l-ancienne-1548.aspx`,
  `${CAZ_BASE}/recettes/pot-au-feu-traditionnel-5620.aspx`,
  `${CAZ_BASE}/recettes/tartiflette-facile-et-rapide-6782.aspx`,
  `${CAZ_BASE}/recettes/poulet-roti-simple-et-rapide-91.aspx`,
  `${CAZ_BASE}/recettes/pates-au-saumon-fume-10471.aspx`,

  /* ── Classiques français ── */
  `${CAZ_BASE}/recettes/boeuf-bourguignon-1352.aspx`,
  `${CAZ_BASE}/recettes/gratin-dauphinois-2341.aspx`,
  `${CAZ_BASE}/recettes/quiche-lorraine-1127.aspx`,
  `${CAZ_BASE}/recettes/ratatouille-3421.aspx`,
  `${CAZ_BASE}/recettes/coq-au-vin-2187.aspx`,
  `${CAZ_BASE}/recettes/hachis-parmentier-facile-4562.aspx`,
  `${CAZ_BASE}/recettes/moules-marinieres-3218.aspx`,
  `${CAZ_BASE}/recettes/cassoulet-2876.aspx`,
  `${CAZ_BASE}/recettes/couscous-royal-3156.aspx`,
  `${CAZ_BASE}/recettes/osso-buco-milanais-4123.aspx`,
  `${CAZ_BASE}/recettes/navarin-d-agneau-printanier-3987.aspx`,
  `${CAZ_BASE}/recettes/magret-de-canard-sauce-miel-6543.aspx`,

  /* ── Poulet / viandes ── */
  `${CAZ_BASE}/recettes/poulet-au-curry-5431.aspx`,
  `${CAZ_BASE}/recettes/poulet-basquaise-3456.aspx`,
  `${CAZ_BASE}/recettes/tajine-de-poulet-citron-confit-8234.aspx`,
  `${CAZ_BASE}/recettes/filet-mignon-moutarde-8901.aspx`,
  `${CAZ_BASE}/recettes/escalope-creme-champignons-9123.aspx`,
  `${CAZ_BASE}/recettes/pintade-rotie-au-four-7654.aspx`,
  `${CAZ_BASE}/recettes/chili-con-carne-4321.aspx`,

  /* ── Poisson ── */
  `${CAZ_BASE}/recettes/saumon-au-four-aux-herbes-9876.aspx`,
  `${CAZ_BASE}/recettes/sole-meuniere-7123.aspx`,
  `${CAZ_BASE}/recettes/gratin-de-crevettes-6234.aspx`,

  /* ── Pâtes / riz ── */
  `${CAZ_BASE}/recettes/carbonara-facile-8921.aspx`,
  `${CAZ_BASE}/recettes/risotto-aux-champignons-7234.aspx`,
  `${CAZ_BASE}/recettes/paella-valenciana-5678.aspx`,

  /* ── Soupes & veloutés ── */
  `${CAZ_BASE}/recettes/soupe-a-l-oignon-gratinee-2345.aspx`,
  `${CAZ_BASE}/recettes/veloute-de-potimarron-12345.aspx`,
  `${CAZ_BASE}/recettes/veloute-de-champignons-8765.aspx`,
  `${CAZ_BASE}/recettes/soupe-de-poisson-4567.aspx`,

  /* ── Végétarien ── */
  `${CAZ_BASE}/recettes/curry-de-pois-chiches-34567.aspx`,
  `${CAZ_BASE}/recettes/tarte-aux-poireaux-et-lardons-8765.aspx`,
  `${CAZ_BASE}/recettes/quiche-aux-champignons-11234.aspx`,
];

/* ── Pool de recettes Marmiton ───────────────────────────── */
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

  /* ── Poisson ── */
  `${MARMITON_BASE}/recettes/recette_saumon-au-four_19876.aspx`,
  `${MARMITON_BASE}/recettes/recette_sole-meuniere_17123.aspx`,
  `${MARMITON_BASE}/recettes/recette_moules-au-roquefort_18932.aspx`,

  /* ── Canard / veau ── */
  `${MARMITON_BASE}/recettes/recette_magret-de-canard-au-miel_18543.aspx`,
  `${MARMITON_BASE}/recettes/recette_escalope-de-veau-a-la-normande_16789.aspx`,

  /* ── Soupes ── */
  `${MARMITON_BASE}/recettes/recette_soupe-a-l-oignon-gratinee_13782.aspx`,
  `${MARMITON_BASE}/recettes/recette_veloute-de-potimarron_21456.aspx`,
  `${MARMITON_BASE}/recettes/recette_veloute-de-champignons_16892.aspx`,

  /* ── Végétarien ── */
  `${MARMITON_BASE}/recettes/recette_curry-de-lentilles_22134.aspx`,
  `${MARMITON_BASE}/recettes/recette_quiche-aux-poireaux_14321.aspx`,

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
  `${MARMITON_BASE}/recettes/recette_gratin-de-pates-bolognaise_22567.aspx`,

  /* ── Tartes salées / Quiches ── */
  `${MARMITON_BASE}/recettes/recette_quiche-au-thon-et-aux-poireaux_17823.aspx`,
  `${MARMITON_BASE}/recettes/recette_quiche-aux-champignons_16092.aspx`,
  `${MARMITON_BASE}/recettes/recette_tarte-aux-oignons-et-lardons_20456.aspx`,
  `${MARMITON_BASE}/recettes/recette_tarte-a-la-tomate-et-mozzarella_24389.aspx`,
  `${MARMITON_BASE}/recettes/recette_flamiche-aux-poireaux_18234.aspx`,

  /* ── Poisson ── */
  `${MARMITON_BASE}/recettes/recette_cabillaud-au-four_21034.aspx`,
  `${MARMITON_BASE}/recettes/recette_cabillaud-a-la-provencale_23765.aspx`,
  `${MARMITON_BASE}/recettes/recette_papillote-de-saumon-aux-legumes_19832.aspx`,
  `${MARMITON_BASE}/recettes/recette_dos-de-cabillaud-en-croute-de-parmesan_26541.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-poisson_17654.aspx`,
  `${MARMITON_BASE}/recettes/recette_brandade-de-morue_15432.aspx`,

  /* ── Pâtes supplémentaires ── */
  `${MARMITON_BASE}/recettes/recette_spaghetti-bolognaise_14892.aspx`,
  `${MARMITON_BASE}/recettes/recette_penne-all-arrabiata_23156.aspx`,
  `${MARMITON_BASE}/recettes/recette_tagliatelles-au-saumon-fume_20678.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-macaronis_16234.aspx`,
  `${MARMITON_BASE}/recettes/recette_spaghetti-aux-fruits-de-mer_24512.aspx`,

  /* ── Riz / Céréales ── */
  `${MARMITON_BASE}/recettes/recette_riz-cantonnais_18943.aspx`,
  `${MARMITON_BASE}/recettes/recette_riz-pilaf-au-poulet_22341.aspx`,
  `${MARMITON_BASE}/recettes/recette_risotto-aux-asperges_25678.aspx`,
  `${MARMITON_BASE}/recettes/recette_risotto-au-poulet-et-champignons_27123.aspx`,

  /* ── Plats du monde ── */
  `${MARMITON_BASE}/recettes/recette_boeuf-bourguignon-a-l-ancienne_21076.aspx`,
  `${MARMITON_BASE}/recettes/recette_moussaka_14765.aspx`,
  `${MARMITON_BASE}/recettes/recette_moussaka-grecque_23098.aspx`,
  `${MARMITON_BASE}/recettes/recette_tajine-de-boeuf-aux-pruneaux_19234.aspx`,
  `${MARMITON_BASE}/recettes/recette_poulet-tikka-masala_28765.aspx`,
  `${MARMITON_BASE}/recettes/recette_wok-de-boeuf-aux-legumes_26432.aspx`,
  `${MARMITON_BASE}/recettes/recette_bo-bun_29871.aspx`,

  /* ── Canard ── */
  `${MARMITON_BASE}/recettes/recette_confit-de-canard_15678.aspx`,
  `${MARMITON_BASE}/recettes/recette_magret-de-canard-sauce-orange_20543.aspx`,

  /* ── Végétarien supplémentaire ── */
  `${MARMITON_BASE}/recettes/recette_curry-de-pois-chiches_24567.aspx`,
  `${MARMITON_BASE}/recettes/recette_tian-de-legumes_21345.aspx`,
  `${MARMITON_BASE}/recettes/recette_lentilles-a-la-saucisse_17890.aspx`,
  `${MARMITON_BASE}/recettes/recette_shakshuka_31234.aspx`,
  `${MARMITON_BASE}/recettes/recette_gratin-de-quinoa-aux-legumes_29432.aspx`,

  /* ── Plats rapides / express ── */
  `${MARMITON_BASE}/recettes/recette_steak-hache-sauce-au-poivre_18234.aspx`,
  `${MARMITON_BASE}/recettes/recette_omelette-aux-champignons_14567.aspx`,
  `${MARMITON_BASE}/recettes/recette_poulet-au-citron_22876.aspx`,
  `${MARMITON_BASE}/recettes/recette_crevettes-sautees-a-l-ail_25431.aspx`,
  `${MARMITON_BASE}/recettes/recette_escalope-milanaise_16789.aspx`,
];

/* Toutes les seeds combinées : 750g en priorité, puis CAZ, puis Marmiton */
const ALL_SEED_URLS = [...G750_SEED_URLS, ...CAZ_SEED_URLS, ...MARMITON_SEED_URLS];

/* ── Fetch via proxy CORS ────────────────────────────────────── */
async function fetchViaProxy(url) {
  let lastErr;
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy.build(url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(14000) });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status} (${proxyUrl.split('/')[2]})`); continue; }
      const html = await proxy.parse(res);
      if (typeof html === 'string' && html.length > 500) return html;
      lastErr = new Error('Réponse trop courte');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('Tous les proxies ont échoué pour ' + url);
}

/* ── Extraction des URLs de recettes depuis le HTML ──────────── */
function extractRecipeUrls(html) {
  const seen   = new Set();
  const result = [];

  // 750g : href="/slug-rNUMERO.htm"
  const re750 = /href="(?:https:\/\/www\.750g\.com)?(\/[a-z0-9][a-z0-9-]+-r\d+\.htm)"/gi;
  let m;
  while ((m = re750.exec(html)) !== null) {
    const full = G750_BASE + m[1];
    if (!seen.has(full)) { seen.add(full); result.push(full); }
  }

  // CuisineAZ : href="/recettes/slug-ID.aspx"
  const reCAZ = /href="(\/recettes\/[a-z0-9][a-z0-9-]+-\d+\.aspx)"/gi;
  while ((m = reCAZ.exec(html)) !== null) {
    const full = CAZ_BASE + m[1];
    if (!seen.has(full)) { seen.add(full); result.push(full); }
  }

  // Marmiton : href="/recettes/recette_slug_ID.aspx"
  const reMar = /href="(\/recettes\/recette_[a-z0-9][a-z0-9-]+_\d+\.aspx)"/gi;
  while ((m = reMar.exec(html)) !== null) {
    const full = MARMITON_BASE + m[1];
    if (!seen.has(full)) { seen.add(full); result.push(full); }
  }

  return result;
}

/* ── Extraction du JSON-LD schema.org depuis le HTML ─────────── */
/*
  Décode les entités de caractères dans les valeurs JSON (injectées par certains
  proxies qui HTML-encodent le contenu des balises <script>).
  NE touche pas &amp;&lt;&gt;&quot; pour ne pas casser la syntaxe JSON.
*/
function decodeJsonLDEntities(str) {
  return str
    // Apostrophes / guillemets simples
    .replace(/&rsquo;/g,  '\u2019')
    .replace(/&lsquo;/g,  '\u2018')
    .replace(/&#8217;/g,  '\u2019')
    .replace(/&#8216;/g,  '\u2018')
    .replace(/&#39;/g,    '\u0027')
    .replace(/&#x27;/g,   '\u0027')
    // Lettres accentuées françaises
    .replace(/&eacute;/g, '\u00e9')
    .replace(/&egrave;/g, '\u00e8')
    .replace(/&ecirc;/g,  '\u00ea')
    .replace(/&euml;/g,   '\u00eb')
    .replace(/&agrave;/g, '\u00e0')
    .replace(/&acirc;/g,  '\u00e2')
    .replace(/&auml;/g,   '\u00e4')
    .replace(/&icirc;/g,  '\u00ee')
    .replace(/&iuml;/g,   '\u00ef')
    .replace(/&ocirc;/g,  '\u00f4')
    .replace(/&ouml;/g,   '\u00f6')
    .replace(/&ugrave;/g, '\u00f9')
    .replace(/&ucirc;/g,  '\u00fb')
    .replace(/&uuml;/g,   '\u00fc')
    .replace(/&ccedil;/g, '\u00e7')
    .replace(/&Eacute;/g, '\u00c9')
    .replace(/&Egrave;/g, '\u00c8')
    .replace(/&Agrave;/g, '\u00c0')
    .replace(/&Ccedil;/g, '\u00c7')
    .replace(/&Ocirc;/g,  '\u00d4')
    // Ligatures
    .replace(/&oelig;/g,  '\u0153')
    .replace(/&OElig;/g,  '\u0152')
    .replace(/&aelig;/g,  '\u00e6')
    // Espaces et typographie
    .replace(/&nbsp;/g,   '\u00a0')
    .replace(/&thinsp;/g, '\u2009')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&laquo;/g,  '\u00ab')
    .replace(/&raquo;/g,  '\u00bb')
    // Codes numériques génériques (&#NNN; et &#xHHH;) — seulement hors guillemets
    .replace(/&#(\d+);/g,    (_, n) => { const c = +n; return (c === 34 || c === 38 || c === 60 || c === 62) ? _ : String.fromCharCode(c); })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { const c = parseInt(h, 16); return (c === 34 || c === 38 || c === 60 || c === 62) ? _ : String.fromCharCode(c); });
}

function extractJsonLD(html) {
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let jsonStr = m[1].trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (_) {
      // Certains proxies HTML-encodent le contenu des <script> :
      // on décode les entités de caractères (pas &amp;&lt;&gt;&quot;)
      try { parsed = JSON.parse(decodeJsonLDEntities(jsonStr)); } catch (_2) { continue; }
    }
    const items = Array.isArray(parsed)
      ? parsed
      : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
    for (const item of items) {
      const type = item['@type'];
      const isRecipe = type === 'Recipe'
        || (Array.isArray(type) && type.includes('Recipe'));
      if (isRecipe) return item;
    }
  }
  return null;
}

/* ── Décodage des entités HTML ───────────────────────────────── */
/*
  Dictionnaire pur JS — ne dépend PAS du DOM (le textarea trick échoue
  silencieusement dans certains contextes de chargement).
  Couvre : entités nommées françaises, apostrophes typographiques,
  codes numériques &#NNN; et &#xHHH;.
*/
const _HTML_ENT = {
  // Ponctuation / espace
  amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:'\u00a0',
  thinsp:'\u2009', ensp:'\u2002', emsp:'\u2003',
  laquo:'\u00ab', raquo:'\u00bb',
  mdash:'\u2014', ndash:'\u2013', bull:'\u2022', middot:'\u00b7',
  hellip:'\u2026', shy:'\u00ad',
  // Guillemets / apostrophes typographiques
  rsquo:'\u2019', lsquo:'\u2018',
  rdquo:'\u201d', ldquo:'\u201c',
  sbquo:'\u201a', bdquo:'\u201e',
  // Minuscules accentuées
  agrave:'\u00e0', aacute:'\u00e1', acirc:'\u00e2', atilde:'\u00e3',
  auml:'\u00e4',   aring:'\u00e5', aelig:'\u00e6',
  ccedil:'\u00e7',
  egrave:'\u00e8', eacute:'\u00e9', ecirc:'\u00ea', euml:'\u00eb',
  igrave:'\u00ec', iacute:'\u00ed', icirc:'\u00ee', iuml:'\u00ef',
  eth:'\u00f0',    ntilde:'\u00f1',
  ograve:'\u00f2', oacute:'\u00f3', ocirc:'\u00f4', otilde:'\u00f5',
  ouml:'\u00f6',   oslash:'\u00f8',
  ugrave:'\u00f9', uacute:'\u00fa', ucirc:'\u00fb', uuml:'\u00fc',
  yacute:'\u00fd', yuml:'\u00ff',
  szlig:'\u00df',  oelig:'\u0153',
  // Majuscules accentuées
  Agrave:'\u00c0', Aacute:'\u00c1', Acirc:'\u00c2', Atilde:'\u00c3',
  Auml:'\u00c4',   Aring:'\u00c5', AElig:'\u00c6',
  Ccedil:'\u00c7',
  Egrave:'\u00c8', Eacute:'\u00c9', Ecirc:'\u00ca', Euml:'\u00cb',
  Igrave:'\u00cc', Iacute:'\u00cd', Icirc:'\u00ce', Iuml:'\u00cf',
  Ntilde:'\u00d1',
  Ograve:'\u00d2', Oacute:'\u00d3', Ocirc:'\u00d4', Otilde:'\u00d5',
  Ouml:'\u00d6',   Oslash:'\u00d8',
  Ugrave:'\u00d9', Uacute:'\u00da', Ucirc:'\u00db', Uuml:'\u00dc',
  OElig:'\u0152',
};

function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return str;
  const _pass = (s) => s
    // Entités nommées : &eacute; &rsquo; etc.
    .replace(/&([a-zA-Z]+\d*);/g,   (m, e) => Object.prototype.hasOwnProperty.call(_HTML_ENT, e) ? _HTML_ENT[e] : m)
    // Entités numériques décimales : &#233;
    .replace(/&#(\d+);/g,           (_, n) => String.fromCharCode(+n))
    // Entités numériques hexadécimales : &#xe9; &#x2019;
    .replace(/&#x([0-9a-f]+);/gi,   (_, h) => String.fromCharCode(parseInt(h, 16)));
  // Double passe : gère &amp;eacute; → &eacute; → é (données doublement encodées)
  return _pass(_pass(str));
}

/* ── Durée ISO 8601 → minutes ────────────────────────────────── */
function parseISO8601Duration(s) {
  if (!s) return 0;
  const m = String(s).match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 60) + parseInt(m[2] || 0);
}

/* ── Parser un ingrédient français ──────────────────────────── */
/*
  Exemples d'entrée (déjà décodés) :
    "200 g de farine"
    "2 œufs"
    "3 cuillères à soupe d'huile d'olive"
    "1 oignon"
    "sel et poivre"
*/
const FR_UNITS_RE = [
  'cuill?[eè]res?\\s+à\\s+soupe', 'cuill?[eè]res?\\s+à\\s+café',
  'cuill?[eè]res?\\s+à\\s+dessert',
  'c\\.?à\\.?s\\.?', 'c\\.?à\\.?c\\.?', 'càs', 'càc', 'cs', 'cc',
  'kg', 'g', 'mg',
  'litres?', 'l(?=\\b)', 'dl', 'cl', 'ml',
  'tasses?', 'verres?', 'bols?',
  'bottes?', 'bouquets?', 'brins?', 'tiges?',
  'pincées?', 'poignées?', 'gouttes?', 'filets?',
  'tranches?', 'morceaux?', 'portions?', 'parts?',
  'boîtes?', 'bocaux?', 'sachets?', 'pochettes?',
  'gousses?', 'noix?',
  'cm', 'mm',
].join('|');

// \u0027 = apostrophe droite, \u2018 = ' gauche, \u2019 = ' droite
const ING_RE = new RegExp(
  `^([\\d][\\d,.\\s\u00bd\u00bc\u00be/]*)\\s*(${FR_UNITS_RE})?\\s*` +
  `(?:de\\s+|d[\u0027\u2018\u2019]\\s*|du\\s+|des\\s+|l[\u0027\u2018\u2019]\\s*|le\\s+|la\\s+|les\\s+)?(.+)$`,
  'i'
);

function parseFrenchIngredient(str) {
  str = str.trim();
  if (!str) return null;

  const m = str.match(ING_RE);
  if (m) {
    const qty     = m[1].trim();
    const unit    = (m[2] || '').trim();
    const name    = m[3].trim();
    const measure = [qty, unit].filter(Boolean).join('\u00a0'); // espace insécable
    return { measure, name };
  }

  // Pas de quantité numérique initiale : toute la chaîne est le nom
  return { measure: '', name: str };
}

/* ── Transformer le JSON-LD → objet repas interne ────────────── */
function processCuisineAZRecipe(schema, url) {
  if (!schema || !schema.name) return null;

  const id = extractIdFromUrl(url) || String(Date.now());

  // Nom — décodage entités
  const name = decodeHtmlEntities(schema.name.trim());

  // Ingrédients — décodage entités avant parsing
  const ingredients = (schema.recipeIngredient || [])
    .map(raw => {
      const str    = decodeHtmlEntities(String(raw));
      const parsed = parseFrenchIngredient(str);
      if (!parsed) return null;
      return {
        name:          parsed.name,
        originalName:  parsed.name,
        _translated:   true,
        measure:       parsed.measure,
        measureFr:     parsed.measure,
        _measureConverted: true
      };
    })
    .filter(Boolean);

  // Instructions — décodage entités
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

  // Temps
  const prepTime  = parseISO8601Duration(schema.prepTime);
  const cookTime  = parseISO8601Duration(schema.cookTime);
  const totalTime = parseISO8601Duration(schema.totalTime) || (prepTime + cookTime);
  const prep = prepTime  || Math.round((totalTime || 50) * 0.35) || 15;
  const cook = cookTime  || Math.round((totalTime || 50) * 0.65) || 30;

  // Image
  let image = schema.image || '';
  if (Array.isArray(image))       image = image[0] || '';
  if (typeof image === 'object')  image = image.url || image['@id'] || '';

  // Catégorie
  let category = '';
  const rawCat = schema.recipeCategory;
  if (Array.isArray(rawCat))            category = rawCat[0] || '';
  else if (typeof rawCat === 'string')  category = rawCat;

  // Exclure les recettes hors cuisine (cocktails, boissons, etc.)
  const categoryLower = category.toLowerCase();
  const NON_FOOD_KEYWORDS = ['cocktail', 'boisson', 'drink', 'smoothie', 'jus ', 'sirop', 'alcool', 'bière', 'vin ', 'liqueur', 'spiritueux'];
  if (NON_FOOD_KEYWORDS.some(kw => categoryLower.includes(kw))) return null;

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
    analyzedInstructions: [{
      steps: steps.map((s, i) => ({ number: i + 1, step: s }))
    }],
    stepsFr: steps,
    url
  };
}

/* ── Extraction de l'ID depuis une URL de recette ────────────── */
function extractIdFromUrl(url) {
  const m750 = url.match(/-r(\d+)\.htm$/);
  if (m750) return '750g_' + m750[1];
  // Marmiton : recette_slug_ID.aspx — avant CuisineAZ car les deux finissent en .aspx
  const mMar = url.match(/recette_[a-z0-9][a-z0-9-]+_(\d+)\.aspx$/);
  if (mMar) return 'marmiton_' + mMar[1];
  const mCaz = url.match(/-(\d+)\.aspx$/);
  if (mCaz) return 'caz_' + mCaz[1];
  return null;
}

/* ── Découverte et cache des URLs de recettes ────────────────── */
const POOL_DOC_ID   = 'global_v4'; // v4 = Marmiton + pool étendu
const POOL_TTL_DAYS = 7;

async function loadRecipePool() {
  try {
    const doc = await db.collection('recipePool').doc(POOL_DOC_ID).get();
    if (doc.exists) {
      const d = doc.data();
      const ageDays = (Date.now() - (d.updatedAt?.toMillis?.() || 0)) / 86400000;
      if (ageDays < POOL_TTL_DAYS && Array.isArray(d.urls) && d.urls.length >= 10) {
        return d.urls;
      }
    }
  } catch (_) {}
  return null;
}

async function saveRecipePool(urls) {
  try {
    await db.collection('recipePool').doc(POOL_DOC_ID).set({
      urls,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (_) {}
}

async function discoverRecipeUrls() {
  const cached = await loadRecipePool();
  if (cached) return cached;

  const found = new Set(ALL_SEED_URLS);

  // Enrichissement depuis les pages de catégories 750g
  const g750Pages = [
    '/recettes-plats/', '/recettes-soupes-potages/',
    '/recettes-vegetariennes/', '/recettes-poissons/', '/recettes-tartes-salees/'
  ];
  for (const path of g750Pages) {
    try {
      const html = await fetchViaProxy(G750_BASE + path);
      extractRecipeUrls(html).forEach(u => found.add(u));
    } catch (_) {}
  }

  // Enrichissement depuis Marmiton (catégories principales)
  const marmitonPages = [
    '/recettes/index-des-recettes/',
    '/recettes/les-mieux-notes/',
  ];
  for (const path of marmitonPages) {
    try {
      const html = await fetchViaProxy(MARMITON_BASE + path);
      extractRecipeUrls(html).forEach(u => found.add(u));
    } catch (_) {}
  }

  const result = [...found];
  if (result.length >= 10) saveRecipePool(result);
  return result;
}

/* ══════════════════════════════════════════════════════════════
   CACHE MULTI-NIVEAUX DES RECETTES
   L1 : localStorage (sync, instantané)
   L2 : Firestore   (async, ~100 ms)
   L3 : HTTP proxy  (async, 2-5 s)
══════════════════════════════════════════════════════════════ */

const LS_RECIPE_PREFIX  = 'mm_rc_';
const LS_RECIPE_TTL_MS  = 14 * 86400000;  // 14 jours en localStorage
const FS_RECIPE_TTL_DAYS = 30;            // 30 jours en Firestore

/* ── L1 : localStorage ───────────────────────────────────────── */
function getLocalRecipe(id) {
  try {
    const raw = localStorage.getItem(LS_RECIPE_PREFIX + id);
    if (!raw) return null;
    const { meal, ts } = JSON.parse(raw);
    if (Date.now() - ts > LS_RECIPE_TTL_MS) {
      localStorage.removeItem(LS_RECIPE_PREFIX + id);
      return null;
    }
    return meal;
  } catch (_) { return null; }
}

function setLocalRecipe(id, meal) {
  try {
    localStorage.setItem(LS_RECIPE_PREFIX + id, JSON.stringify({ meal, ts: Date.now() }));
  } catch (_) {} // quota dépassé → on ignore silencieusement
}

/* ── Vérifie si une URL est déjà dans le cache L1 ─────────────── */
function hasLocalCache(url) {
  const id = extractIdFromUrl(url);
  if (!id) return false;
  try {
    const raw = localStorage.getItem(LS_RECIPE_PREFIX + id);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return (Date.now() - ts) <= LS_RECIPE_TTL_MS;
  } catch (_) { return false; }
}

/* ── L2 : Firestore ──────────────────────────────────────────── */
async function getFirestoreRecipe(id) {
  try {
    const doc = await db.collection('recipeCache').doc(id).get();
    if (!doc.exists) return null;
    const d = doc.data();
    const ageDays = (Date.now() - (d.cachedAt?.toMillis?.() || 0)) / 86400000;
    if (ageDays > FS_RECIPE_TTL_DAYS || !d.meal) return null;
    return d.meal;
  } catch (_) { return null; }
}

function setFirestoreRecipe(id, meal) {
  // fire & forget : n'attend pas la confirmation
  db.collection('recipeCache').doc(id).set({
    meal,
    cachedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(() => {});
}

/* ── Fetch une recette (L1 → L2 → HTTP) ─────────────────────── */
async function fetchRecipeFromUrl(url) {
  const id = extractIdFromUrl(url);

  // L1 : localStorage (sync, instantané)
  if (id) {
    const cached = getLocalRecipe(id);
    if (cached) return cached;
  }

  // L2 : Firestore (~100 ms)
  if (id) {
    const cached = await getFirestoreRecipe(id);
    if (cached) {
      setLocalRecipe(id, cached); // remonter en L1 pour la prochaine fois
      return cached;
    }
  }

  // L3 : fetch HTTP via proxy CORS
  const html   = await fetchViaProxy(url);
  const schema = extractJsonLD(html);
  if (!schema) throw new Error('Pas de JSON-LD dans ' + url);
  const meal = processCuisineAZRecipe(schema, url);
  if (!meal) throw new Error('Recette incomplète');

  // Stocker en L1 et L2 (fire & forget pour L2)
  if (id) {
    setLocalRecipe(id, meal);
    setFirestoreRecipe(id, meal);
  }

  return meal;
}

/* ── Anti-blocage : délai aléatoire pour les sources sensibles ── */
function sleep(minMs, maxMs) {
  const ms = minMs + Math.random() * (maxMs - minMs);
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

/* ── Récupérer N recettes uniques ────────────────────────────── */
/*
  excludeIds : IDs à ignorer (plats préparés récents).
  Stratégie :
   1. URLs déjà en cache L1 en priorité (instantané, 0 réseau)
   2. Non-Marmiton fetchés en parallèle (Promise.allSettled)
   3. Marmiton en séquentiel avec délai uniquement si fetch L3
   4. Fallback si pool épuisé : accepte les plats préparés anciens
*/
async function fetchUniqueMeals(count, excludeIds = []) {
  const pool       = await discoverRecipeUrls();
  const excludeSet = new Set(excludeIds.map(String));
  const usedIds    = new Set();
  const result     = [];

  const eligible = pool.filter(url => {
    const id = extractIdFromUrl(url);
    return id && !excludeSet.has(id);
  });

  // Shuffle puis trier : URLs déjà en cache L1 en priorité
  const shuffled = shuffle(eligible);
  const sorted   = [
    ...shuffled.filter(u => hasLocalCache(u)),
    ...shuffled.filter(u => !hasLocalCache(u))
  ];

  // Séparer Marmiton (rate-limit) des autres sources
  const nonMar  = sorted.filter(u => !u.includes('marmiton.org'));
  const marUrls = sorted.filter(u => u.includes('marmiton.org'));

  // 750g + CuisineAZ : fetch en parallèle (candidats × 3 pour absorber les échecs)
  const batchSize   = Math.min(count * 3, nonMar.length);
  const nonMarBatch = nonMar.slice(0, batchSize);
  const settled     = await Promise.allSettled(nonMarBatch.map(u => fetchRecipeFromUrl(u)));
  for (const r of settled) {
    if (result.length >= count) break;
    if (r.status !== 'fulfilled' || !r.value) continue;
    const meal = r.value;
    if (!usedIds.has(meal.id)) { usedIds.add(meal.id); result.push(meal); }
  }

  // Marmiton en séquentiel si besoin de compléter
  for (const url of marUrls) {
    if (result.length >= count) break;
    const id = extractIdFromUrl(url);
    if (!id || usedIds.has(id)) continue;
    // Délai uniquement pour les fetches L3 (pas de cache local)
    if (!hasLocalCache(url) && result.length > 0) await sleep(700, 1500);
    try {
      const meal = await fetchRecipeFromUrl(url);
      usedIds.add(meal.id); result.push(meal);
    } catch (e) { console.warn('Recette ignorée :', url, '—', e.message); }
  }

  // Fallback : pool épuisé → on accepte les plats préparés anciens
  if (result.length < count && excludeIds.length > 0) {
    console.info('Pool épuisé — fallback sur les plats préparés');
    const fallback = shuffle(pool.filter(url => {
      const id = extractIdFromUrl(url);
      return id && !usedIds.has(id);
    }));
    for (const url of fallback) {
      if (result.length >= count) break;
      const id = extractIdFromUrl(url);
      if (!id || usedIds.has(id)) continue;
      try {
        const meal = await fetchRecipeFromUrl(url);
        usedIds.add(meal.id); result.push(meal);
      } catch (_) {}
    }
  }

  return result;
}

/* ── Pré-chauffage du cache en arrière-plan ──────────────────── */
/*
  Après l'affichage des repas du jour, télécharge silencieusement
  d'autres recettes du pool pour remplir le cache localStorage.
  Fire & forget — n'impacte pas l'UI.
*/
const WARM_BATCH = 12;

async function warmCache(excludeIds = []) {
  if (warmCache._running) return;
  warmCache._running = true;
  try {
    const pool       = await discoverRecipeUrls();
    const excludeSet = new Set(excludeIds.map(String));
    const uncached   = shuffle(pool.filter(url => {
      const id = extractIdFromUrl(url);
      return id && !excludeSet.has(id) && !hasLocalCache(url);
    })).slice(0, WARM_BATCH);

    for (const url of uncached) {
      if (!warmCache._running) break;
      try {
        if (url.includes('marmiton.org')) await sleep(2000, 4000);
        await fetchRecipeFromUrl(url);
      } catch (_) {}
    }
  } finally {
    warmCache._running = false;
  }
}

/* ══════════════════════════════════════════════════════════════
   UTILITAIRES UI
══════════════════════════════════════════════════════════════ */

function addSentenceBreaks(text) {
  return text.replace(/([.!?])\s+/g, '$1<br>').trim();
}

function parseSteps(stepsArr) {
  if (!stepsArr || !stepsArr.length) return [];
  const steps = [];
  for (const section of stepsArr) {
    for (const step of (section.steps || [])) {
      if (step.step && step.step.trim().length > 4) steps.push(step.step.trim());
    }
  }
  return steps;
}

/* ── État ────────────────────────────────────────────────────── */
let currentUser   = null;
let dailyMeals    = [];
let activeMeal    = null;
let searchResults = null; // null = mode daily meals, array = résultats de recherche

/* ── Navigation avec historique navigateur ──────────────────── */
const SCREENS = ['login', 'home', 'ingredients', 'recipe'];

function showScreen(name, pushHistory = true) {
  SCREENS.forEach(s =>
    document.getElementById('screen-' + s).classList.remove('active')
  );
  document.getElementById('screen-' + name).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (pushHistory) {
    history.pushState({ screen: name }, '', '');
  }
}

window.addEventListener('popstate', (e) => {
  const screen = e.state?.screen ?? 'login';
  if (screen === 'home') {
    resetSearch();
    renderMealCards(dailyMeals);
  }
  showScreen(screen, false);
});

function navBack() { history.back(); }

/* ── Utilitaires ────────────────────────────────────────────── */
function parisDateKey() {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function setLoading(on) {
  document.getElementById('loading-overlay').classList.toggle('show', on);
}

function showToast(msg, ms = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function resetSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  searchResults = null;
}

function goHome() {
  resetSearch();
  renderMealCards(dailyMeals);
  showScreen('home');
}

/* ── Firestore ──────────────────────────────────────────────── */
async function getOrCreateUser(code) {
  const ref = db.collection('users').doc(code);
  const doc = await ref.get();
  if (!doc.exists) {
    const data = { code, createdAt: firebase.firestore.FieldValue.serverTimestamp(), preparedMeals: [], preparedDates: {} };
    await ref.set(data);
    return { code, preparedMeals: [], preparedDates: {} };
  }
  return { code, preparedMeals: [], preparedDates: {}, ...doc.data() };
}

const MEALS_V = 2; // Incrémenter pour invalider le cache Firestore journalier

async function loadDailyMeals(userCode) {
  const doc = await db.collection('dailyMeals').doc(userCode).get();
  if (doc.exists && doc.data().date === parisDateKey() && doc.data().v === MEALS_V) {
    const meals = doc.data().meals;
    if (!meals || !meals[0]) return null;
    const firstId = meals[0].id || '';
    // Invalide les anciens caches Spoonacular ou sans préfixe source
    if (!meals[0].url || (!firstId.startsWith('750g_') && !firstId.startsWith('caz_') && !firstId.startsWith('marmiton_'))) return null;
    return meals;
  }
  return null;
}

async function saveDailyMeals(userCode, meals) {
  await db.collection('dailyMeals').doc(userCode).set({ date: parisDateKey(), v: MEALS_V, meals });
}

async function persistPrepared(userCode, mealId) {
  await db.collection('users').doc(userCode).update({
    preparedMeals: firebase.firestore.FieldValue.arrayUnion(mealId),
    [`preparedDates.${mealId}`]: firebase.firestore.FieldValue.serverTimestamp()
  });
  if (!currentUser.preparedMeals) currentUser.preparedMeals = [];
  if (!currentUser.preparedMeals.includes(mealId)) currentUser.preparedMeals.push(mealId);
  if (!currentUser.preparedDates) currentUser.preparedDates = {};
  currentUser.preparedDates[mealId] = Date.now();
}

/* ── IDs préparés actifs (règle 15 jours) ────────────────────── */
/*
  Ne retourne que les IDs préparés il y a moins de 15 jours.
  Sans date connue (ancienne entrée) → exclus par sécurité.
*/
const PREPARED_TTL_MS = 15 * 86400000;

function getActivePreparedIds() {
  const now   = Date.now();
  const dates = currentUser.preparedDates || {};
  return (currentUser.preparedMeals || []).filter(id => {
    const raw = dates[id];
    if (!raw) return true; // pas de date → conservatif, on exclut
    const ts = raw?.toMillis?.() || raw;
    return (now - ts) < PREPARED_TTL_MS;
  });
}

/* ── Connexion ──────────────────────────────────────────────── */
async function handleLogin() {
  const input = document.getElementById('code-input');
  const code  = input.value.trim().toUpperCase();
  const err   = document.getElementById('login-error');

  err.style.display = 'none';
  if (code.length < 3) {
    err.textContent = 'Le code doit contenir au moins 3 caractères.';
    err.style.display = 'block';
    return;
  }

  setLoading(true);
  try {
    currentUser = await getOrCreateUser(code);
    localStorage.setItem('mm_user', code);
    setLoading(false);
    await initHome();
  } catch (e) {
    setLoading(false);
    err.textContent = 'Erreur de connexion. Vérifiez votre réseau.';
    err.style.display = 'block';
    console.error(e);
  }
}

document.getElementById('code-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
});

document.getElementById('search-input').addEventListener('input', e => {
  if (!e.target.value.trim()) {
    searchResults = null;
    renderMealCards(dailyMeals);
  }
});

/* ── Déconnexion ────────────────────────────────────────────── */
function handleLogout() {
  localStorage.removeItem('mm_user');
  currentUser = null;
  dailyMeals  = [];
  activeMeal  = null;
  document.getElementById('code-input').value = '';
  showScreen('login');
}

/* ══════════════════════════════════════════════════════════════
   RECHERCHE PAR MOT-CLÉ (slug matching)
══════════════════════════════════════════════════════════════ */

/*
  Normalise un terme pour le comparer aux slugs d'URL (déjà en ASCII-kebab).
  Exemples : "Bœuf" → "boeuf"  |  "Côte" → "cote"  |  "poulet rôti" → "poulet roti"
*/
function normalizeQuery(q) {
  return q.toLowerCase().trim()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/\s+/g, ' ');
}

/*
  Extrait uniquement la portion "nom du plat" du slug d'une URL de recette.
  On exclut le domaine, les chemins de catégorie et l'ID numérique final.
  Ex: "https://www.750g.com/poulet-au-curry-r2251.htm" → "poulet-au-curry"
      "https://www.marmiton.org/recettes/recette_boeuf-bourguignon_18427.aspx" → "boeuf-bourguignon"
      "https://www.cuisineaz.com/recettes/gratin-dauphinois-2341.aspx" → "gratin-dauphinois"
*/
function extractRecipeSlug(url) {
  // 750g : /slug-rID.htm
  const m750 = url.match(/\/([a-z0-9][a-z0-9-]+)-r\d+\.htm$/);
  if (m750) return m750[1];
  // Marmiton : /recettes/recette_slug_ID.aspx
  const mMar = url.match(/recette_([a-z0-9][a-z0-9-]+)_\d+\.aspx$/);
  if (mMar) return mMar[1];
  // CuisineAZ : /recettes/slug-ID.aspx
  const mCaz = url.match(/recettes\/([a-z0-9][a-z0-9-]+)-\d+\.aspx$/);
  if (mCaz) return mCaz[1];
  return '';
}

async function searchMeals(query) {
  const q = normalizeQuery(query);
  if (!q) return;

  const searchBtn = document.getElementById('search-btn');
  searchBtn.disabled = true;
  showSkeletons();

  try {
    // Mots-clés à retrouver dans le slug du nom du plat uniquement
    const words = q.split(' ').filter(Boolean);
    const preparedSet = new Set(getActivePreparedIds().map(String));

    const matching = shuffle(ALL_SEED_URLS.filter(url => {
      // Exclure les plats déjà préparés
      const id = extractIdFromUrl(url);
      if (id && preparedSet.has(id)) return false;
      // Correspondance stricte sur le nom du plat (slug uniquement)
      const slug = normalizeQuery(extractRecipeSlug(url));
      return slug && words.every(w => slug.includes(w));
    }));

    if (matching.length === 0) {
      searchResults = [];
      document.getElementById('meals-grid').innerHTML = `
        <div class="empty-state">
          <div class="big-icon">🔍</div>
          <h3>Aucun résultat</h3>
          <p>Aucune recette trouvée pour «&nbsp;${escHtml(query)}&nbsp;».<br>Essayez un autre terme.</p>
        </div>`;
      return;
    }

    const results = [];
    const usedIds = new Set();

    // 750g + CuisineAZ : fetch en parallèle (jusqu'à 6 candidats → prendre les 3 premiers OK)
    const nonMar = matching.filter(u => !u.includes('marmiton.org')).slice(0, 6);
    const marUrls = matching.filter(u => u.includes('marmiton.org'));

    // Vérifie que le nom de la recette correspond bien à la recherche
    // (protège contre les entrées de cache corrompues ou redirections proxy)
    const matchesQuery = (meal) => {
      const name = normalizeQuery(meal.nameFr || meal.name || '');
      return words.some(w => name.includes(w));
    };

    const settled = await Promise.allSettled(nonMar.map(u => fetchRecipeFromUrl(u)));
    for (const r of settled) {
      if (results.length >= 3) break;
      if (r.status !== 'fulfilled' || !r.value) continue;
      const meal = r.value;
      if (usedIds.has(meal.id)) continue;
      if (!matchesQuery(meal)) {
        console.warn('Résultat hors-sujet ignoré (cache corrompu) :', meal.name);
        // Purger l'entrée corrompue du cache pour éviter la récidive
        try { localStorage.removeItem(LS_RECIPE_PREFIX + meal.id); } catch (_) {}
        db.collection('recipeCache').doc(meal.id).delete().catch(() => {});
        continue;
      }
      usedIds.add(meal.id);
      results.push(meal);
    }

    // Marmiton en fallback séquentiel (avec délai anti-blocage)
    for (const url of marUrls) {
      if (results.length >= 3) break;
      const id = extractIdFromUrl(url);
      if (!id || usedIds.has(id)) continue;
      if (results.length > 0) await sleep(700, 1500);
      try {
        const meal = await fetchRecipeFromUrl(url);
        if (!matchesQuery(meal)) {
          console.warn('Résultat hors-sujet ignoré (cache corrompu) :', meal.name);
          try { localStorage.removeItem(LS_RECIPE_PREFIX + meal.id); } catch (_) {}
          db.collection('recipeCache').doc(meal.id).delete().catch(() => {});
          continue;
        }
        usedIds.add(meal.id);
        results.push(meal);
      } catch (e) {
        console.warn('Recherche — recette ignorée :', url, e.message);
      }
    }

    if (results.length === 0) {
      searchResults = [];
      document.getElementById('meals-grid').innerHTML = `
        <div class="empty-state">
          <div class="big-icon">😕</div>
          <h3>Résultats indisponibles</h3>
          <p>Les recettes n'ont pas pu être chargées.<br>Vérifiez votre connexion et réessayez.</p>
        </div>`;
      return;
    }

    searchResults = results;
    renderMealCards(results);
  } catch (e) {
    console.error('searchMeals:', e);
    showToast('Erreur lors de la recherche.');
    renderMealCards(dailyMeals);
  } finally {
    searchBtn.disabled = false;
  }
}

function handleSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  searchMeals(q);
}

/* ── Écran d'accueil ────────────────────────────────────────── */
async function initHome() {
  showScreen('home');
  showSkeletons();

  try {
    const activePrepared = getActivePreparedIds();
    const prepared       = new Set(activePrepared);
    let meals = await loadDailyMeals(currentUser.code);

    if (meals) {
      // Filtrer les plats préparés récemment (règle 15 jours)
      const unprepared = meals.filter(m => !prepared.has(m.id));
      const missing    = 3 - unprepared.length;

      if (missing > 0) {
        const alreadySeen = new Set([...activePrepared, ...meals.map(m => m.id)]);
        const replacements = await fetchUniqueMeals(missing, [...alreadySeen]);
        meals = [...unprepared, ...replacements];
        await saveDailyMeals(currentUser.code, meals);
      } else {
        meals = unprepared.slice(0, 3);
      }
    } else {
      meals = await fetchUniqueMeals(3, activePrepared);
      if (meals.length === 0) throw new Error('Aucune recette récupérée');
      await saveDailyMeals(currentUser.code, meals);
    }

    dailyMeals = meals;
    renderMealCards(meals);
    // Pré-chauffage cache en arrière-plan (non bloquant)
    setTimeout(() => warmCache([...activePrepared, ...meals.map(m => m.id)]), 3000);
  } catch (e) {
    console.error(e);
    document.getElementById('meals-grid').innerHTML =
      `<div class="empty-state">
        <div class="big-icon">⚠️</div>
        <h3>Erreur de chargement</h3>
        <p>Impossible de récupérer les recettes.<br>Vérifiez votre connexion et réessayez.</p>
       </div>`;
  }
}

/* ── Actualiser les repas ───────────────────────────────────── */
async function refreshMeals() {
  // Reset la recherche en cours
  document.getElementById('search-input').value = '';
  searchResults = null;

  const btn = document.getElementById('btn-refresh');
  btn.classList.add('spinning');
  btn.disabled = true;

  showSkeletons();
  try {
    const activePrepared = getActivePreparedIds();
    const meals = await fetchUniqueMeals(3, activePrepared);
    if (meals.length === 0) throw new Error('Aucune recette récupérée');
    dailyMeals = meals;
    await saveDailyMeals(currentUser.code, meals);
    renderMealCards(meals);
    setTimeout(() => warmCache([...activePrepared, ...meals.map(m => m.id)]), 3000);
  } catch (e) {
    console.error(e);
    showToast("Erreur lors de l'actualisation.");
    renderMealCards(dailyMeals);
  } finally {
    btn.classList.remove('spinning');
    btn.disabled = false;
  }
}

function showSkeletons() {
  document.getElementById('meals-grid').innerHTML = [1, 2, 3].map(() => `
    <div class="skel-card">
      <div class="skel" style="height:185px;border-radius:0;"></div>
      <div style="padding:14px">
        <div class="skel" style="height:17px;width:65%;margin-bottom:10px;"></div>
        <div class="skel" style="height:12px;width:30%;"></div>
      </div>
    </div>`).join('');
}

function renderMealCards(meals) {
  const grid = document.getElementById('meals-grid');
  if (!meals || meals.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="big-icon">🎉</div>
        <h3>Tous les plats ont été explorés !</h3>
        <p>De nouvelles suggestions vous attendent demain à minuit.</p>
      </div>`;
    return;
  }
  grid.innerHTML = meals.map(m => {
    const totalTime = (m.prepTime || 0) + (m.cookTime || 0);
    const displayName = escHtml(decodeHtmlEntities(m.nameFr || m.name || ''));
    const timeHtml = totalTime ? `
      <div class="meal-time-row">
        <span class="meal-total-time">⏰ ${totalTime} min</span>
        <span class="meal-time-detail">⏱ ${m.prepTime} min &nbsp;🔥 ${m.cookTime} min</span>
      </div>` : '';
    return `
    <div class="meal-card" onclick="openMeal('${m.id}')">
      <img class="meal-card-img" src="${escHtml(m.image || '')}" alt="${displayName}"
           onerror="this.src='';this.style.minHeight='80px';this.style.background='#FFF0E8';"
           loading="lazy" />
      <div class="meal-card-body">
        <div class="meal-card-name">${displayName}</div>
        ${timeHtml}
      </div>
    </div>`;
  }).join('');
}

/* ── Écran Ingrédients ──────────────────────────────────────── */
async function openMeal(mealId) {
  // Chercher dans les résultats de recherche en priorité, puis dans les repas du jour
  activeMeal = (searchResults && searchResults.find(m => m.id === mealId))
    || dailyMeals.find(m => m.id === mealId);
  if (!activeMeal) return;

  const mealName = decodeHtmlEntities(activeMeal.nameFr || activeMeal.name || '');

  document.getElementById('ing-img').src   = activeMeal.image || '';
  document.getElementById('ing-img').alt   = mealName;
  document.getElementById('ing-title').textContent = mealName;

  const catParts = [];
  if (activeMeal.category) catParts.push(escHtml(decodeHtmlEntities(activeMeal.category)));
  if (activeMeal.area)     catParts.push(escHtml('Cuisine ' + decodeHtmlEntities(activeMeal.area)));
  const timeParts = [];
  if (activeMeal.prepTime) timeParts.push(activeMeal.prepTime + ' min prép.');
  if (activeMeal.cookTime) timeParts.push(activeMeal.cookTime + ' min cuisson');
  let subHtml = '';
  if (catParts.length)  subHtml += `<span class="sub-category">${catParts.join(' · ')}</span>`;
  if (catParts.length && timeParts.length) subHtml += `<span class="sub-sep"> · </span>`;
  if (timeParts.length) subHtml += `<span class="sub-meta">${escHtml(timeParts.join(' · '))}</span>`;
  document.getElementById('ing-sub').innerHTML = subHtml;

  document.getElementById('ing-list').innerHTML = activeMeal.ingredients.map(ing => `
    <li class="ing-item">
      <div class="ing-dot"></div>
      <span class="ing-name">${escHtml(decodeHtmlEntities(ing.name || ''))}</span>
      <span class="ing-measure">${escHtml(decodeHtmlEntities(ing.measureFr || ing.measure || ''))}</span>
    </li>`).join('');

  showScreen('ingredients');
}

/* ── Écran Recette ──────────────────────────────────────────── */
async function showRecipe() {
  if (!activeMeal) return;

  const mealName = decodeHtmlEntities(activeMeal.nameFr || activeMeal.name || '');

  document.getElementById('rec-img').src   = activeMeal.image || '';
  document.getElementById('rec-img').alt   = mealName;
  document.getElementById('rec-title').textContent = mealName;

  const recCatParts = [];
  if (activeMeal.category) recCatParts.push(escHtml(decodeHtmlEntities(activeMeal.category)));
  if (activeMeal.area)     recCatParts.push(escHtml('Cuisine ' + decodeHtmlEntities(activeMeal.area)));
  const recSub = document.getElementById('rec-sub');
  if (recSub) recSub.innerHTML = recCatParts.length
    ? `<span class="sub-category">${recCatParts.join(' · ')}</span>`
    : '';

  document.getElementById('rec-prep').textContent  = activeMeal.prepTime;
  document.getElementById('rec-cook').textContent  = activeMeal.cookTime;
  document.getElementById('rec-total').textContent = (activeMeal.prepTime || 0) + (activeMeal.cookTime || 0);

  const done = (currentUser.preparedMeals || []).includes(activeMeal.id);
  const btn  = document.getElementById('btn-prepared');
  btn.disabled    = done;
  btn.textContent = done ? '✅ Déjà préparé' : '✅ Préparé !';

  showScreen('recipe');

  const stepsEl = document.getElementById('rec-steps');
  const steps   = activeMeal.stepsFr || parseSteps(activeMeal.analyzedInstructions);

  if (steps.length) {
    stepsEl.innerHTML = steps.map((s, i) => `
      <div class="step-item">
        <div class="step-num">${i + 1}</div>
        <div class="step-text">${addSentenceBreaks(escHtml(decodeHtmlEntities(s)))}</div>
      </div>`).join('');
  } else {
    stepsEl.innerHTML = '<p style="color:var(--gray);font-style:italic;font-size:13.5px;">Instructions non disponibles pour ce plat.</p>';
  }
}

/* ── Bouton Détails ─────────────────────────────────────────── */
function openDetails() {
  if (!activeMeal) return;
  const name  = decodeHtmlEntities(activeMeal.nameFr || activeMeal.name || '');
  const query = encodeURIComponent(name + ' recette');
  window.open(`https://www.google.com/search?q=${query}&lr=lang_fr`, '_blank');
  markPreparedSilent();
}

async function markPreparedSilent() {
  if (!activeMeal || !currentUser) return;
  if ((currentUser.preparedMeals || []).includes(activeMeal.id)) return;
  try {
    await persistPrepared(currentUser.code, activeMeal.id);
    const btn = document.getElementById('btn-prepared');
    if (btn) { btn.disabled = true; btn.textContent = '✅ Déjà préparé'; }
  } catch (e) {
    console.error('markPreparedSilent:', e);
  }
}

/* ── Marquer comme préparé ──────────────────────────────────── */
async function markPrepared() {
  if (!activeMeal || !currentUser) return;

  const btn = document.getElementById('btn-prepared');
  btn.disabled    = true;
  btn.textContent = '⏳ Enregistrement…';

  // Détecter si le plat vient d'une recherche (pas dans dailyMeals)
  const isFromSearch = !dailyMeals.some(m => m.id === activeMeal.id);

  try {
    await persistPrepared(currentUser.code, activeMeal.id);

    btn.textContent = '✅ Bon appétit !';
    showToast('Plat enregistré comme préparé !');

    if (isFromSearch) {
      // Plat issu d'une recherche : reset la recherche et retour aux repas du jour
      setTimeout(() => {
        resetSearch();
        renderMealCards(dailyMeals);
        showScreen('home');
      }, 1400);
      return;
    }

    // Plat issu des repas du jour : chercher un remplacement
    const remaining  = dailyMeals.filter(m => m.id !== activeMeal.id);
    const allExclude = [...getActivePreparedIds(), ...dailyMeals.map(m => m.id)];
    const remplacement = await fetchUniqueMeals(1, allExclude);

    dailyMeals = [...remaining, ...remplacement];
    await saveDailyMeals(currentUser.code, dailyMeals);

    setTimeout(() => {
      renderMealCards(dailyMeals);
      showScreen('home');
    }, 1400);
  } catch (e) {
    console.error(e);
    btn.disabled    = false;
    btn.textContent = '✅ Préparé !';
    showToast('Erreur. Veuillez réessayer.');
  }
}

/* ── Connexion automatique au rechargement ──────────────────── */
(async function boot() {
  history.replaceState({ screen: 'login' }, '', '');

  const saved = localStorage.getItem('mm_user');
  if (!saved) return;

  setLoading(true);
  try {
    currentUser = await getOrCreateUser(saved);
    setLoading(false);
    await initHome();
  } catch (e) {
    setLoading(false);
    console.warn('Connexion automatique échouée :', e);
  }
})();
