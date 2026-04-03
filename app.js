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

/* ── Traduction automatique (Google Translate non-officiel, gratuit) ── */
const _tCache = {};

async function translateText(text) {
  if (!text || !text.trim()) return text;
  if (_tCache[text]) return _tCache[text];
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`;
    const res  = await fetch(url);
    const data = await res.json();
    const translated = data[0].map(item => item[0]).join('');
    _tCache[text] = translated;
    return translated;
  } catch (e) {
    return text;
  }
}

/* Traduit en lot les noms d'ingrédients inconnus du dictionnaire */
async function translateUnknownIngredients(ingredients) {
  const unknown = ingredients.filter(i => !i._translated);
  if (unknown.length === 0) return;
  try {
    const batch      = unknown.map(i => i.originalName).join('\n');
    const translated = await translateText(batch);
    const lines      = translated.split('\n');
    unknown.forEach((ing, idx) => {
      if (lines[idx] && lines[idx].trim()) {
        ing.name = lines[idx].trim();
      }
      ing._translated = true;
    });
  } catch (_) {}
}

/* Traduit les mesures via dictionnaire + Google Translate */
async function translateAllMeasures(ingredients) {
  const toTranslate = ingredients.filter(i => i.measureFr === undefined);
  if (toTranslate.length === 0) return;
  try {
    toTranslate.forEach(i => {
      i._measureDict = translateMeasure(i.measure || '');
    });
    const batch = toTranslate.map(i => i._measureDict).join('\n||||\n');
    const translated = await translateText(batch);
    const lines = translated.split(/\n?\|\|\|\|\n?/);
    toTranslate.forEach((ing, idx) => {
      const tr = lines[idx] ? lines[idx].trim() : ing._measureDict;
      ing.measureFr = tr || ing._measureDict;
      delete ing._measureDict;
    });
  } catch (_) {
    toTranslate.forEach(i => {
      i.measureFr = i.measureFr ?? translateMeasure(i.measure || '');
    });
  }
}

/* Traduit les noms de plats en français via Google Translate */
async function translateMealNames(meals) {
  const toTranslate = meals.filter(m => !m._nameFrTranslated);
  if (!toTranslate.length) return;
  try {
    const batch = toTranslate.map(m => m.name).join('\n||||\n');
    const translated = await translateText(batch);
    const lines = translated.split(/\n?\|\|\|\|\n?/);
    toTranslate.forEach((m, i) => {
      m.nameFr = (lines[i] && lines[i].trim()) ? lines[i].trim() : m.name;
      m._nameFrTranslated = true;
    });
  } catch (_) {
    toTranslate.forEach(m => { m._nameFrTranslated = true; });
  }
}

/* Traduit les étapes de la recette en lot */
async function translateSteps(steps) {
  if (!steps.length) return steps;
  try {
    const batch = steps.join('\n||||\n');
    const translated = await translateText(batch);
    const lines = translated.split(/\n?\|\|\|\|\n?/);
    if (lines.length === steps.length) {
      return lines.map(s => s.trim());
    }
  } catch (_) {}
  return steps;
}

/* Ajoute un saut de ligne après chaque phrase */
function addSentenceBreaks(text) {
  return text.replace(/([.!?])\s+/g, '$1<br>').trim();
}

/* ── Traductions statiques ──────────────────────────────────── */
const DISH_TYPES_FR = {
  'main course':    'plat principal',
  'main dish':      'plat principal',
  'side dish':      'accompagnement',
  'dessert':        'dessert',
  'appetizer':      'entrée',
  'salad':          'salade',
  'bread':          'pain',
  'breakfast':      'petit-déjeuner',
  'soup':           'soupe',
  'beverage':       'boisson',
  'sauce':          'sauce',
  'marinade':       'marinade',
  'fingerfood':     'amuse-bouche',
  'snack':          'en-cas',
  'drink':          'boisson',
  'starter':        'entrée',
  'antipasti':      'antipasti',
  'antipasto':      'antipasto',
  "hor d'oeuvre":   "hors-d'œuvre",
  'lunch':          'déjeuner',
  'dinner':         'dîner'
};

const CUISINES_SPOON_FR = {
  'french':           'française',
  'italian':          'italienne',
  'american':         'américaine',
  'mexican':          'mexicaine',
  'asian':            'asiatique',
  'chinese':          'chinoise',
  'japanese':         'japonaise',
  'thai':             'thaïlandaise',
  'indian':           'indienne',
  'mediterranean':    'méditerranéenne',
  'spanish':          'espagnole',
  'greek':            'grecque',
  'middle eastern':   'du Moyen-Orient',
  'british':          'britannique',
  'german':           'allemande',
  'eastern european': "d'Europe de l'Est",
  'nordic':           'nordique',
  'latin american':   'latino-américaine',
  'caribbean':        'caribéenne',
  'african':          'africaine',
  'korean':           'coréenne',
  'vietnamese':       'vietnamienne',
  'jewish':           'juive',
  'cajun':            'cajun',
  'creole':           'créole',
  'irish':            'irlandaise',
  'portuguese':       'portugaise',
  'scandinavian':     'scandinave'
};

function translateDishType(t) {
  return DISH_TYPES_FR[t.toLowerCase()] || t;
}
function translateCuisineSpoon(c) {
  return CUISINES_SPOON_FR[c.toLowerCase()] || c;
}

/* ── Traduction des quantités / mesures ─────────────────────── */

function convertMixedNumber(str) {
  return str.replace(/\b(\d+)\s+(\d+)\/(\d+)\b/g, (_, whole, num, den) => {
    const val = parseInt(whole) + parseInt(num) / parseInt(den);
    const rounded = Math.round(val * 100) / 100;
    return String(rounded).replace('.', ',');
  });
}

function convertPoundsToGrams(s) {
  return s.replace(
    /([\d]+(?:[,.]\d+)?)\s*(?:lbs?|pounds?)/gi,
    (_, n) => {
      const val = parseFloat(n.replace(',', '.'));
      return Math.round(val * 450) + 'g';
    }
  );
}

const UNITS_FR = {
  'teaspoons':   'cuillères à café',
  'teaspoon':    'cuillère à café',
  'tspns':       'cuillères à café',
  'tspn':        'cuillère à café',
  'tsps':        'cuillères à café',
  'tsp':         'cuillère à café',
  'tablespoons': 'cuillères à soupe',
  'tablespoon':  'cuillère à soupe',
  'tbsps':       'cuillères à soupe',
  'tbsp':        'cuillère à soupe',
  'tbs':         'cuillère à soupe',
  'tbl':         'cuillère à soupe',
  'fluid ounces':'onces liquides',
  'fluid ounce': 'once liquide',
  'fl oz':       'once liquide',
  'fl. oz':      'once liquide',
  'fl. oz.':     'once liquide',
  'cups':        'tasses',
  'cup':         'tasse',
  'pints':       'pintes',
  'pint':        'pinte',
  'pt':          'pinte',
  'quarts':      'quarts',
  'quart':       'quart',
  'qt':          'quart',
  'gallons':     'gallons',
  'gallon':      'gallon',
  'gal':         'gallon',
  'milliliters': 'millilitres',
  'millilitres': 'millilitres',
  'milliliter':  'millilitre',
  'millilitre':  'millilitre',
  'ml':          'ml',
  'mls':         'ml',
  'liters':      'litres',
  'litres':      'litres',
  'liter':       'litre',
  'litre':       'litre',
  'l':           'l',
  'ounces':      'onces',
  'ounce':       'once',
  'ozs':         'onces',
  'oz':          'once',
  'pounds':      'livres',
  'pound':       'livre',
  'lbs':         'livres',
  'lb':          'livre',
  'grams':       'grammes',
  'gram':        'gramme',
  'gms':         'grammes',
  'gm':          'gramme',
  'gs':          'g',
  'g':           'g',
  'kilograms':   'kilogrammes',
  'kilogram':    'kilogramme',
  'kgs':         'kg',
  'kg':          'kg',
  'pinches':     'pincées',
  'pinch':       'pincée',
  'dashes':      'traits',
  'dash':        'trait',
  'drops':       'gouttes',
  'drop':        'goutte',
  'smidgen':     'pointe',
  'smidgens':    'pointes',
  'sticks':      'bâtons',
  'stick':       'bâton',
  'cloves':      'gousses',
  'clove':       'gousse',
  'bunches':     'bottes',
  'bunch':       'botte',
  'sprigs':      'brins',
  'sprig':       'brin',
  'heads':       'têtes',
  'head':        'tête',
  'stalks':      'tiges',
  'stalk':       'tige',
  'ribs':        'branches',
  'rib':         'branche',
  'zests':       'zestes',
  'zest':        'zeste',
  'handfuls':    'poignées',
  'handful':     'poignée',
  'heaped tablespoons': 'cuillères à soupe bombées',
  'heaped tablespoon':  'cuillère à soupe bombée',
  'heaped teaspoons':   'cuillères à café bombées',
  'heaped teaspoon':    'cuillère à café bombée',
  'heaped spoonful':    'cuillère bombée',
  'level tablespoons':  'cuillères à soupe rases',
  'level tablespoon':   'cuillère à soupe rase',
  'level teaspoons':    'cuillères à café rases',
  'level teaspoon':     'cuillère à café rase',
  'level spoonful':     'cuillère rase',
  'large':       'grand',
  'medium':      'moyen',
  'small':       'petit',
  'large ones':  'gros',
  'whole':       'entier',
  'halved':      'en deux',
  'sliced':      'tranché',
  'chopped':     'haché',
  'diced':       'en dés',
  'crushed':     'écrasé',
  'minced':      'haché finement',
  'grated':      'râpé',
  'ground':      'moulu',
  'beaten':      'battu',
  'boiling':     'bouillant',
  'scoops':      'boules',
  'scoop':       'boule',
  'cooked':      'cuit',
  'peeled':      'pelé',
  'fresh':       'frais',
  'dried':       'séché',
  'frozen':      'congelé',
  'can':         'boîte',
  'cans':        'boîtes',
  'tin':         'boîte',
  'tins':        'boîtes',
  'package':     'sachet',
  'packages':    'sachets',
  'pack':        'sachet',
  'packs':       'sachets',
  'bag':         'sachet',
  'bags':        'sachets',
  'jar':         'bocal',
  'jars':        'bocaux',
  'bottle':      'bouteille',
  'bottles':     'bouteilles',
  'slice':       'tranche',
  'slices':      'tranches',
  'piece':       'morceau',
  'pieces':      'morceaux',
  'strip':       'lanière',
  'strips':      'lanières',
  'cube':        'cube',
  'cubes':       'cubes',
  'leaf':        'feuille',
  'leaves':      'feuilles',
  'spear':       'pointe',
  'spears':      'pointes',
  'floret':      'bouquet',
  'florets':     'bouquets',
  'clump':       'touffe',
  'wedge':       'quartier',
  'wedges':      'quartiers',
  'rasher':      'tranche',
  'rashers':     'tranches',
  'knob':        'noix',
  'knobs':       'noix',
  'fillet':      'filet',
  'fillets':     'filets',
  'leg':         'cuisse',
  'legs':        'cuisses',
  'inch':        'cm',
  'inches':      'cm',
  'centimeter':  'cm',
  'centimetre':  'cm',
  'cm':          'cm',
  'to taste':    'selon le goût',
  'as needed':   'selon besoin',
  'as required': 'selon besoin',
  'optional':    'facultatif',
  'or to taste': 'ou selon le goût'
};

function translateMeasure(raw) {
  if (!raw || !raw.trim()) return raw;
  let s = convertMixedNumber(raw.trim());
  s = convertPoundsToGrams(s);
  const keys = Object.keys(UNITS_FR)
    .filter(k => !['pounds','pound','lbs','lb'].includes(k))
    .sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const re = new RegExp('(?<![\\w\\u00C0-\\u024F])' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w\\u00C0-\\u024F])', 'gi');
    s = s.replace(re, UNITS_FR[key]);
  }
  return s;
}

/* Dictionnaire d'ingrédients courants EN→FR */
const ING_FR = {
  'chicken breast':'blanc de poulet','chicken thighs':'cuisses de poulet',
  'chicken':'poulet','beef':'bœuf','pork':'porc','lamb':'agneau',
  'salmon':'saumon','tuna':'thon','shrimp':'crevettes','prawns':'crevettes',
  'cod':'cabillaud','egg':'œuf','eggs':'œufs','milk':'lait',
  'butter':'beurre','cream':'crème','cheese':'fromage',
  'parmesan':'parmesan','mozzarella':'mozzarella','cheddar':'cheddar',
  'flour':'farine','sugar':'sucre','brown sugar':'sucre roux',
  'salt':'sel','pepper':'poivre','black pepper':'poivre noir',
  'olive oil':"huile d'olive",'vegetable oil':'huile végétale',
  'sunflower oil':'huile de tournesol','oil':'huile',
  'onion':'oignon','onions':'oignons','garlic':'ail',
  'tomato':'tomate','tomatoes':'tomates','tomato paste':'concentré de tomates',
  'tomato sauce':'sauce tomate','potatoes':'pommes de terre','potato':'pomme de terre',
  'carrots':'carottes','carrot':'carotte','celery':'céleri',
  'spinach':'épinards','mushrooms':'champignons','mushroom':'champignon',
  'bell pepper':'poivron','peppers':'poivrons','zucchini':'courgette',
  'aubergine':'aubergine','eggplant':'aubergine','broccoli':'brocoli',
  'cauliflower':'chou-fleur','cabbage':'chou','lettuce':'laitue',
  'cucumber':'concombre','peas':'petits pois','beans':'haricots',
  'chickpeas':'pois chiches','lentils':'lentilles',
  'rice':'riz','pasta':'pâtes','spaghetti':'spaghetti',
  'bread':'pain','breadcrumbs':'chapelure',
  'lemon':'citron','lime':'citron vert','orange':'orange',
  'apple':'pomme','banana':'banane','strawberries':'fraises',
  'parsley':'persil','coriander':'coriandre','cilantro':'coriandre',
  'basil':'basilic','thyme':'thym','rosemary':'romarin',
  'oregano':'origan','bay leaves':'laurier','bay leaf':'laurier',
  'cumin':'cumin','paprika':'paprika','turmeric':'curcuma',
  'cinnamon':'cannelle','ginger':'gingembre','chilli':'piment',
  'chili':'piment','cayenne pepper':'poivre de Cayenne',
  'curry powder':'poudre de curry','soy sauce':'sauce soja',
  'fish sauce':'sauce de poisson','oyster sauce':'sauce huître',
  'worcestershire sauce':'sauce Worcestershire',
  'vinegar':'vinaigre','balsamic vinegar':'vinaigre balsamique',
  'stock':'bouillon','chicken stock':'bouillon de poulet',
  'beef stock':'bouillon de bœuf','vegetable stock':'bouillon de légumes',
  'water':'eau','white wine':'vin blanc','red wine':'vin rouge',
  'honey':'miel','maple syrup':"sirop d'érable",
  'baking powder':'levure chimique','baking soda':'bicarbonate de soude',
  'vanilla extract':'extrait de vanille','vanilla':'vanille',
  'chocolate':'chocolat','cocoa powder':'cacao en poudre',
  'nuts':'noix','almonds':'amandes','walnuts':'noix','peanuts':'cacahuètes',
  'sesame seeds':'graines de sésame','sesame oil':'huile de sésame',
  'spring onions':'oignons verts','scallions':'oignons verts',
  'leek':'poireau','shallot':'échalote','shallots':'échalotes',
  'corn':'maïs','sweetcorn':'maïs doux',
  'coconut milk':'lait de coco','coconut':'noix de coco',
  'yogurt':'yaourt','sour cream':'crème fraîche',
  'mayonnaise':'mayonnaise','mustard':'moutarde',
  'ketchup':'ketchup','tabasco':'tabasco',
  'anchovies':'anchois','capers':'câpres','olives':'olives',
  'bacon':'bacon','ham':'jambon','sausage':'saucisse','sausages':'saucisses',
  'minced beef':'bœuf haché','ground beef':'bœuf haché',
  'turkey':'dinde','duck':'canard','rabbit':'lapin',
  'tofu':'tofu','tempeh':'tempeh',
  'mint':'menthe','dill':'aneth','chives':'ciboulette'
};

function translateIngredient(name) {
  const key = name.toLowerCase().trim();
  const fr  = ING_FR[key];
  return { name: fr || name, originalName: name, _translated: !!fr };
}

/* ── Conversion tasses → g ou ml selon l'ingrédient ─────────── */
// Table : 1 tasse (cup) par catégorie
const CUP_RULES = [
  {
    // Liquides : 250 ml / tasse
    test: name => /water|milk|cream|broth|stock|juice|wine|vinegar|oil|sauce|buttermilk|yogurt|syrup|honey|molasses|beer|cider|coconut milk|lemon|lime|orange juice|tomato|brine/.test(name),
    factor: 250, unit: 'ml', display: v => v >= 1000 ? (Math.round(v / 100) / 10) + ' l' : v + ' ml'
  },
  {
    // Farine : 125 g / tasse
    test: name => /flour|farine/.test(name),
    factor: 125, unit: 'g', display: v => v + ' g'
  },
  {
    // Sucre blanc/semoule : 200 g / tasse
    test: name => /\bsugar\b/.test(name) && !/brown|powdered|confectioners|icing/.test(name),
    factor: 200, unit: 'g', display: v => v + ' g'
  },
  {
    // Sucre roux / glace : 220 g / tasse (approximation)
    test: name => /brown sugar|powdered sugar|confectioners|icing sugar/.test(name),
    factor: 220, unit: 'g', display: v => v + ' g'
  },
  {
    // Beurre : 225 g / tasse
    test: name => /\bbutter\b/.test(name),
    factor: 225, unit: 'g', display: v => v + ' g'
  }
];

function convertCupsToMetric(ingredientName, amount) {
  if (!amount || amount === 0) return null;
  const name = (ingredientName || '').toLowerCase();
  for (const rule of CUP_RULES) {
    if (rule.test(name)) {
      return rule.display(Math.round(amount * rule.factor));
    }
  }
  return null; // inconnu → garder "tasse"
}

/* ── Formatage d'un nombre pour l'affichage FR ──────────────── */
function formatAmount(n) {
  if (!n || n === 0) return '';
  const rounded = Math.round(n * 100) / 100;
  if (rounded === Math.floor(rounded)) return String(rounded);
  return String(rounded).replace('.', ',');
}

/* ── État ────────────────────────────────────────────────────── */
let currentUser = null;
let dailyMeals  = [];
let activeMeal  = null;

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
  const screen = e.state && e.state.screen ? e.state.screen : 'login';
  showScreen(screen, false);
});

function navBack() {
  history.back();
}

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
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function goHome() {
  renderMealCards(dailyMeals);
  showScreen('home');
}

/* ── API Spoonacular ─────────────────────────────────────────── */
const SPOON_KEY = '184314a7cd904f2bbe5292ec50ee12af';
const SPOON     = 'https://api.spoonacular.com';

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

function processSpoonMeal(raw) {
  const ingredients = (raw.extendedIngredients || []).map(ing => {
    const amount = ing.amount || 0;
    const unit   = (ing.unit || '').trim();
    const ingName = ing.nameClean || ing.name || '';

    // Conversion lb → g
    if (/^lbs?$|^pounds?$/i.test(unit)) {
      const grams = Math.round(amount * 450);
      return { name: ingName, originalName: ingName, _translated: false, measure: grams + ' g' };
    }

    // Conversion cup → g ou ml selon l'ingrédient
    if (/^cups?$/i.test(unit)) {
      const converted = convertCupsToMetric(ingName, amount);
      if (converted) {
        const { name, originalName, _translated } = translateIngredient(ingName);
        return { name, originalName, _translated, measure: converted };
      }
    }

    const measureRaw = [amount ? formatAmount(amount) : '', unit].filter(Boolean).join(' ');
    const { name, originalName, _translated } = translateIngredient(ingName);
    return { name, originalName, _translated, measure: translateMeasure(measureRaw) };
  });

  const dishType = (raw.dishTypes || [])[0] || '';
  const cuisine  = (raw.cuisines  || [])[0] || '';
  const total    = raw.readyInMinutes || 0;
  const prepTime = raw.preparationMinutes > 0 ? raw.preparationMinutes : Math.round(total * 0.35) || 20;
  const cookTime = raw.cookingMinutes    > 0 ? raw.cookingMinutes    : Math.round(total * 0.65) || 30;

  return {
    id:           String(raw.id),
    name:         raw.title,
    nameFr:       raw.title,
    _nameFrTranslated: false,
    image:        raw.image || '',
    category:     dishType ? translateDishType(dishType) : '',
    area:         cuisine  ? translateCuisineSpoon(cuisine) : '',
    prepTime,
    cookTime,
    ingredients,
    analyzedInstructions: raw.analyzedInstructions || [],
    stepsFr: null
  };
}

async function fetchSpoonRandom() {
  const url = `${SPOON}/recipes/random?number=6&includeNutrition=false&instructionsRequired=true&apiKey=${SPOON_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Spoonacular ${res.status} — ${txt.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.recipes)) {
    throw new Error('Réponse inattendue : ' + JSON.stringify(data).slice(0, 120));
  }
  return data.recipes;
}

async function fetchUniqueMeals(count, excludeIds = []) {
  const result  = [];
  const usedIds = new Set(excludeIds.map(String));
  const maxTry  = 6;

  for (let attempt = 0; attempt < maxTry && result.length < count; attempt++) {
    try {
      const batch = await fetchSpoonRandom();
      for (const raw of batch) {
        if (result.length >= count) break;
        if (!raw.analyzedInstructions || !raw.analyzedInstructions.length) continue;
        if (!usedIds.has(String(raw.id))) {
          usedIds.add(String(raw.id));
          result.push(processSpoonMeal(raw));
        }
      }
    } catch (e) {
      console.error('fetchUniqueMeals erreur:', e);
      showToast('Erreur API : ' + e.message.slice(0, 80));
      break;
    }
  }
  return result;
}

/* ── Firestore ──────────────────────────────────────────────── */
async function getOrCreateUser(code) {
  const ref = db.collection('users').doc(code);
  const doc = await ref.get();
  if (!doc.exists) {
    const data = { code, createdAt: firebase.firestore.FieldValue.serverTimestamp(), preparedMeals: [] };
    await ref.set(data);
    return { code, preparedMeals: [] };
  }
  return { code, preparedMeals: [], ...doc.data() };
}

async function loadDailyMeals(userCode) {
  const doc = await db.collection('dailyMeals').doc(userCode).get();
  if (doc.exists && doc.data().date === parisDateKey()) {
    return doc.data().meals;
  }
  return null;
}

async function saveDailyMeals(userCode, meals) {
  await db.collection('dailyMeals').doc(userCode).set({ date: parisDateKey(), meals });
}

async function persistPrepared(userCode, mealId) {
  await db.collection('users').doc(userCode).update({
    preparedMeals: firebase.firestore.FieldValue.arrayUnion(mealId)
  });
  if (!currentUser.preparedMeals) currentUser.preparedMeals = [];
  if (!currentUser.preparedMeals.includes(mealId)) {
    currentUser.preparedMeals.push(mealId);
  }
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

/* ── Déconnexion ────────────────────────────────────────────── */
function handleLogout() {
  localStorage.removeItem('mm_user');
  currentUser = null;
  dailyMeals  = [];
  activeMeal  = null;
  document.getElementById('code-input').value = '';
  showScreen('login');
}

/* ── Écran d'accueil ────────────────────────────────────────── */
async function initHome() {
  showScreen('home');
  showSkeletons();

  try {
    let meals = await loadDailyMeals(currentUser.code);
    if (!meals) {
      meals = await fetchUniqueMeals(3, currentUser.preparedMeals || []);
      await saveDailyMeals(currentUser.code, meals);
    }
    dailyMeals = meals;
    renderMealCards(meals);
    await translateMealNames(meals);
    renderMealCards(meals);
  } catch (e) {
    console.error(e);
    document.getElementById('meals-grid').innerHTML =
      '<div class="empty-state"><div class="big-icon">⚠️</div><h3>Erreur de chargement</h3><p>Impossible de récupérer les recettes.<br>Vérifiez votre connexion et réessayez.</p></div>';
  }
}

/* ── Actualiser les repas ───────────────────────────────────── */
async function refreshMeals() {
  const btn = document.getElementById('btn-refresh');
  btn.classList.add('spinning');
  btn.disabled = true;

  showSkeletons();
  try {
    const prepared = (currentUser.preparedMeals || []);
    const meals = await fetchUniqueMeals(3, prepared);
    dailyMeals = meals;
    await saveDailyMeals(currentUser.code, meals);
    renderMealCards(meals);
    await translateMealNames(meals);
    renderMealCards(meals);
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
  document.getElementById('meals-grid').innerHTML = [1,2,3].map(() => `
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
    const timeHtml = totalTime ? `
      <div class="meal-time-row">
        <span class="meal-total-time">${totalTime} min</span>
        ${(m.prepTime || m.cookTime) ? `<span class="meal-time-detail">⏱ ${m.prepTime} min &nbsp;🔥 ${m.cookTime} min</span>` : ''}
      </div>` : '';
    return `
    <div class="meal-card" onclick="openMeal('${m.id}')">
      <img class="meal-card-img" src="${escHtml(m.image)}" alt="${escHtml(m.nameFr || m.name)}"
           onerror="this.src='';this.style.minHeight='80px';this.style.background='#FFF0E8';"
           loading="lazy" />
      <div class="meal-card-body">
        <div class="meal-card-name">${escHtml(m.nameFr || m.name)}</div>
        ${timeHtml}
      </div>
    </div>`;
  }).join('');
}

/* ── Écran Ingrédients ──────────────────────────────────────── */
async function openMeal(mealId) {
  activeMeal = dailyMeals.find(m => m.id === mealId);
  if (!activeMeal) return;

  document.getElementById('ing-img').src = activeMeal.image;
  document.getElementById('ing-img').alt = activeMeal.nameFr || activeMeal.name;
  document.getElementById('ing-title').textContent = activeMeal.nameFr || activeMeal.name;

  const parts = [];
  if (activeMeal.category) parts.push(activeMeal.category);
  if (activeMeal.area)     parts.push('Cuisine ' + activeMeal.area);
  if (activeMeal.prepTime) parts.push(activeMeal.prepTime + ' min prép.');
  if (activeMeal.cookTime) parts.push(activeMeal.cookTime + ' min cuisson');
  document.getElementById('ing-sub').textContent = parts.join('  ·  ');

  await translateUnknownIngredients(activeMeal.ingredients);

  const renderList = () => {
    document.getElementById('ing-list').innerHTML = activeMeal.ingredients.map(ing => `
      <li class="ing-item">
        <div class="ing-dot"></div>
        <span class="ing-name">${escHtml(ing.name)}</span>
        <span class="ing-measure">${escHtml(ing.measureFr !== undefined ? ing.measureFr : translateMeasure(ing.measure || ''))}</span>
      </li>`).join('');
  };
  renderList();

  await translateAllMeasures(activeMeal.ingredients);
  renderList();

  showScreen('ingredients');
}

/* ── Écran Recette ──────────────────────────────────────────── */
async function showRecipe() {
  if (!activeMeal) return;

  document.getElementById('rec-img').src   = activeMeal.image;
  document.getElementById('rec-img').alt   = activeMeal.nameFr || activeMeal.name;
  document.getElementById('rec-title').textContent = activeMeal.nameFr || activeMeal.name;
  document.getElementById('rec-prep').textContent  = activeMeal.prepTime;
  document.getElementById('rec-cook').textContent  = activeMeal.cookTime;
  document.getElementById('rec-total').textContent = (activeMeal.prepTime || 0) + (activeMeal.cookTime || 0);

  const done = (currentUser.preparedMeals || []).includes(activeMeal.id);
  const btn  = document.getElementById('btn-prepared');
  btn.disabled    = done;
  btn.textContent = done ? '✅ Déjà préparé' : '✅ Préparé !';

  showScreen('recipe');

  const stepsEl  = document.getElementById('rec-steps');
  const rawSteps = parseSteps(activeMeal.analyzedInstructions);

  if (!rawSteps.length) {
    stepsEl.innerHTML = '<p style="color:var(--gray);font-style:italic;font-size:13.5px;">Instructions non disponibles pour ce plat.</p>';
    return;
  }

  const renderSteps = (steps) => {
    stepsEl.innerHTML = steps.map((s, i) => `
      <div class="step-item">
        <div class="step-num">${i + 1}</div>
        <div class="step-text">${addSentenceBreaks(escHtml(s))}</div>
      </div>`).join('');
  };

  if (activeMeal.stepsFr && activeMeal.stepsFr.length === rawSteps.length) {
    renderSteps(activeMeal.stepsFr);
  } else {
    renderSteps(rawSteps);
    activeMeal.stepsFr = await translateSteps(rawSteps);
    renderSteps(activeMeal.stepsFr);
  }
}

/* ── Bouton Détails ─────────────────────────────────────────── */
function openDetails() {
  if (!activeMeal) return;
  const name  = activeMeal.nameFr || activeMeal.name;
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

  try {
    await persistPrepared(currentUser.code, activeMeal.id);

    const remaining  = dailyMeals.filter(m => m.id !== activeMeal.id);
    const allExclude = (currentUser.preparedMeals || []).concat(dailyMeals.map(m => m.id));
    const remplacement = await fetchUniqueMeals(1, allExclude);

    dailyMeals = remaining.concat(remplacement);
    await saveDailyMeals(currentUser.code, dailyMeals);

    btn.textContent = '✅ Bon appétit !';
    showToast('Plat enregistré comme préparé !');

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
