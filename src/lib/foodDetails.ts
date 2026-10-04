import type { MenuItem } from '../types';

export interface FoodNutritionalFacts {
  calories: number; // in kcal
  protein: number;  // in g
  carbs: number;    // in g
  fats: number;     // in g
  highlights: string;
}

export interface FoodDetailedItem {
  catchyLine: string;
  nutritionBenefit: string;
  nutritionalFacts: FoodNutritionalFacts;
  photoUrl: string;
  emoji: string;
  isVeg: boolean;
}

interface DishProfile {
  pattern: RegExp;
  photoUrl: string;
  catchyLine: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  highlights: string;
  emoji: string;
}

export const dishProfiles: DishProfile[] = [
  {
    pattern: /vada pav|wada pav/i,
    photoUrl: '/food/vada-pav.jpg',
    catchyLine: 'The undisputed campus king: spiced golden batata vada tucked inside warm soft pav with fiery garlic chutney.',
    calories: 275,
    protein: 6,
    carbs: 42,
    fats: 9,
    highlights: 'Instant carbohydrate boost and authentic Pune street spices for quick fuel between lectures.',
    emoji: '🍔'
  },
  {
    pattern: /samosa/i,
    photoUrl: '/food/samosa.jpg',
    catchyLine: 'Golden flaky crust bursting with piping-hot cumin-spiced potatoes, green peas, and crushed coriander.',
    calories: 210,
    protein: 4,
    carbs: 26,
    fats: 10,
    highlights: 'Crispy comfort pastry loaded with energy-dense potato and warm digestive spices.',
    emoji: '🥟'
  },
  {
    pattern: /misal/i,
    photoUrl: '/food/misal-pav.jpg',
    catchyLine: 'Fiery sprouted moth bean usal submerged in spicy rassa, crowned with crunchy farsan, diced onions, and lime.',
    calories: 340,
    protein: 14,
    carbs: 48,
    fats: 11,
    highlights: 'Sprouted legume protein and dietary fiber deliver long-lasting satiety and stamina.',
    emoji: '🍲'
  },
  {
    pattern: /masala dosa|cheese masala dosa/i,
    photoUrl: '/food/masala-dosa.jpg',
    catchyLine: 'Crispy golden fermented rice crepe rolled around spiced mustard potato mash, served with sambar and coconut chutney.',
    calories: 320,
    protein: 7,
    carbs: 52,
    fats: 9,
    highlights: 'Naturally fermented batter provides gut-friendly probiotics and steady clean energy.',
    emoji: '🥞'
  },
  {
    pattern: /dosa/i,
    photoUrl: '/food/masala-dosa.jpg',
    catchyLine: 'Crispy roasted golden crepe made from fermented lentils and rice, paired with aromatic piping-hot sambar.',
    calories: 230,
    protein: 6,
    carbs: 44,
    fats: 5,
    highlights: 'Light on digestion, low in saturated fat, and naturally gluten-free fermented carbs.',
    emoji: '🥞'
  },
  {
    pattern: /idli/i,
    photoUrl: '/food/idli-sambar.jpg',
    catchyLine: 'Steamed pillow-soft fermented rice cakes that melt in your mouth, served with tangy lentil sambar and fresh chutney.',
    calories: 160,
    protein: 6,
    carbs: 36,
    fats: 1,
    highlights: 'Virtually zero oil, steamed, easily digestible complex carbs and complete plant amino acids.',
    emoji: '⚪'
  },
  {
    pattern: /wada sambar|medu wada|medu vada|single wada/i,
    photoUrl: '/food/medu-vada.jpg',
    catchyLine: 'Golden-crisp black gram donut fritters with a fluffy airy interior, dunked in fragrant hot sambar.',
    calories: 280,
    protein: 9,
    carbs: 30,
    fats: 13,
    highlights: 'Urad dal provides high plant protein and essential iron for muscle maintenance.',
    emoji: '🍩'
  },
  {
    pattern: /poha|kanda poha/i,
    photoUrl: '/food/kanda-poha.jpg',
    catchyLine: 'Fluffy flattened rice tempered with roasted peanuts, curry leaves, green chilies, onions, and fresh lemon.',
    calories: 220,
    protein: 5,
    carbs: 42,
    fats: 4,
    highlights: 'Iron-rich, probiotic flattened rice that keeps you sharp and active without feeling sluggish.',
    emoji: '🥣'
  },
  {
    pattern: /upma/i,
    photoUrl: '/food/upma.jpg',
    catchyLine: 'Savory roasted semolina gently tempered with crunchy mustard seeds, curry leaves, ginger, and green chilies.',
    calories: 210,
    protein: 6,
    carbs: 39,
    fats: 3,
    highlights: 'Semolina has a gentle glycemic profile that prevents post-breakfast energy crashes.',
    emoji: '🥣'
  },
  {
    pattern: /black tea|tea|chai/i,
    photoUrl: '/food/tea.jpg',
    catchyLine: 'The legendary cutting chai brewed with aromatic cardamom, fresh ginger, and rich milk for study marathons.',
    calories: 65,
    protein: 2,
    carbs: 9,
    fats: 2,
    highlights: 'Antioxidants and natural caffeine improve alertness, focus, and study stamina.',
    emoji: '☕'
  },
  {
    pattern: /cold coffee/i,
    photoUrl: '/food/cold-coffee.jpg',
    catchyLine: 'Chilled, creamy, thick blended chocolate coffee with frothy head to beat the Pune afternoon heat.',
    calories: 165,
    protein: 5,
    carbs: 24,
    fats: 5,
    highlights: 'Cooling dairy proteins and refreshing iced caffeine for an instant afternoon revival.',
    emoji: '🧋'
  },
  {
    pattern: /black coffee|coffee/i,
    photoUrl: '/food/coffee.jpg',
    catchyLine: 'Freshly brewed aromatic coffee with thick froth to conquer 8 AM practicals and late night coding.',
    calories: 85,
    protein: 3,
    carbs: 11,
    fats: 3,
    highlights: 'Caffeine boosts metabolic rate and neuro-cognitive focus for problem solving.',
    emoji: '☕'
  },
  {
    pattern: /bread pattice|bread pakora/i,
    photoUrl: '/food/bread-pakora.jpg',
    catchyLine: 'Triangular bread slices stuffed with spiced potato mash, batter-dipped in gram flour and fried golden crisp.',
    calories: 290,
    protein: 6,
    carbs: 38,
    fats: 12,
    highlights: 'Warm satisfying comfort snack packed with carbohydrates for high energy days.',
    emoji: '🥪'
  },
  {
    pattern: /onion pakoda|pakoda|bhaji/i,
    photoUrl: '/food/onion-pakoda.jpg',
    catchyLine: 'Crunchy golden fritters of thinly sliced onions coated in spiced besan and fried till crackling.',
    calories: 240,
    protein: 5,
    carbs: 26,
    fats: 12,
    highlights: 'Chickpea flour provides dietary fiber and zinc in this classic canteen monsoon favorite.',
    emoji: '🧆'
  },
  {
    pattern: /chilly pakoda|mirchi/i,
    photoUrl: '/food/mirchi-pakoda.jpg',
    catchyLine: 'Mild green Bhavnagri chilies dipped in seasoned chickpea batter and deep-fried to crisp perfection.',
    calories: 220,
    protein: 4,
    carbs: 24,
    fats: 11,
    highlights: 'Capsaicin in mild peppers stimulates metabolism and natural mood elevation.',
    emoji: '🌶️'
  },
  {
    pattern: /maggi|maggie|noodles/i,
    photoUrl: '/food/maggi.jpg',
    catchyLine: 'Hot 2-minute canteen style noodles cooked with savory tastemaker, sweet corn, and garden veggies.',
    calories: 310,
    protein: 6,
    carbs: 45,
    fats: 12,
    highlights: 'Instant mood-lifting comfort meal best enjoyed piping hot on a cool breezy evening.',
    emoji: '🍜'
  },
  {
    pattern: /sandwich|toast|bread butter/i,
    photoUrl: '/food/veg-sandwich.jpg',
    catchyLine: 'Crispy golden toasted bread layered with fresh sliced tomatoes, cucumbers, beetroot, and mint chutney.',
    calories: 260,
    protein: 7,
    carbs: 38,
    fats: 8,
    highlights: 'Vitamins from raw garden veggies combined with wholesome grain carbohydrates.',
    emoji: '🥪'
  },
  {
    pattern: /paratha/i,
    photoUrl: '/food/aloo-paratha.jpg',
    catchyLine: 'Tawa-crisped golden whole wheat flatbread stuffed with spiced potato mash, served with cool curd.',
    calories: 330,
    protein: 8,
    carbs: 49,
    fats: 11,
    highlights: 'Whole wheat dietary fiber paired with cooling probiotic curd for sustained energy.',
    emoji: '🫓'
  },
  {
    pattern: /sabudana/i,
    photoUrl: '/food/sabudana-khichdi.jpg',
    catchyLine: 'Plump tapioca pearls tossed with coarse roasted peanuts, cumin, green chilies, and a squeeze of fresh lemon.',
    calories: 350,
    protein: 6,
    carbs: 58,
    fats: 11,
    highlights: 'High-density pure carbs coupled with healthy unsaturated fats from crunchy peanuts.',
    emoji: '🥗'
  },
  {
    pattern: /dal khichadi|khichadi/i,
    photoUrl: '/food/dal-khichdi.jpg',
    catchyLine: 'Steaming yellow moong dal and rice tempered in pure desi ghee with cumin, garlic, and turmeric.',
    calories: 310,
    protein: 11,
    carbs: 49,
    fats: 7,
    highlights: 'The quintessential Ayurvedic comfort dish: complete vegetarian protein and gentle on the gut.',
    emoji: '🍛'
  },
  {
    pattern: /chapati|sabji|paneer bhaji/i,
    photoUrl: '/food/chapati-bhaji.jpg',
    catchyLine: 'Homestyle whole-wheat soft chapatis served with spiced seasonal vegetable or fresh paneer curry.',
    calories: 380,
    protein: 12,
    carbs: 56,
    fats: 10,
    highlights: 'Wholesome homestyle campus nutrition providing essential micronutrients and steady satiety.',
    emoji: '🫓'
  },
  {
    pattern: /tawa pulav|pulav/i,
    photoUrl: '/food/tawa-pulao.jpg',
    catchyLine: 'Fragrant basmati rice tossed on a sizzling tawa with pav bhaji masala, crunchy capsicum, and peas.',
    calories: 390,
    protein: 8,
    carbs: 65,
    fats: 10,
    highlights: 'Flavor-packed Mumbai street-style rice offering quick carbohydrates and dietary fiber.',
    emoji: '🍚'
  },
  {
    pattern: /thali|meal/i,
    photoUrl: '/food/veg-thali.jpg',
    catchyLine: 'Full royal canteen meal: chapatis, seasonal sabji, dal tadka, steamed basmati rice, papad, and sweet.',
    calories: 560,
    protein: 19,
    carbs: 90,
    fats: 13,
    highlights: 'Balanced macro ratio offering complete amino acids, iron, and sustained stamina for afternoon labs.',
    emoji: '🍱'
  },
  {
    pattern: /butter milk|chaas/i,
    photoUrl: '/food/chaas.jpg',
    catchyLine: 'Chilled spiced buttermilk tempered with fresh mint, coriander leaves, ginger, and roasted jeera.',
    calories: 45,
    protein: 3,
    carbs: 4,
    fats: 2,
    highlights: 'Natural probiotics, electrolytes, and lactic acid to cool the stomach and aid digestion.',
    emoji: '🥛'
  },
  {
    pattern: /lemon|limbu/i,
    photoUrl: '/food/lemon-juice.jpg',
    catchyLine: 'Freshly squeezed sweet and tangy nimbu pani with rock salt and mint for instant hydration.',
    calories: 55,
    protein: 1,
    carbs: 13,
    fats: 0,
    highlights: 'Natural Vitamin C and potassium electrolytes to replenish fluids on hot campus afternoons.',
    emoji: '🍋'
  },
  {
    pattern: /milk|bournvita|haldi/i,
    photoUrl: '/food/milk.jpg',
    catchyLine: 'Steaming glass of creamy dairy infused with malted chocolate or golden turmeric for vitality.',
    calories: 140,
    protein: 7,
    carbs: 16,
    fats: 5,
    highlights: 'Bioavailable calcium and complete dairy proteins for bone strength and mental calm.',
    emoji: '🥛'
  },
  {
    pattern: /uttap/i,
    photoUrl: '/food/uttapam.jpg',
    catchyLine: 'Thick, fluffy griddled fermented South Indian pancake studded with juicy tomatoes, onions, and chilies.',
    calories: 270,
    protein: 7,
    carbs: 46,
    fats: 6,
    highlights: 'Rich fermented pancake offering soluble dietary fiber, potassium, and clean energy.',
    emoji: '🥞'
  }
];

export function getFoodDetails(item: Pick<MenuItem, 'name' | 'category' | 'catchy_line' | 'nutrition_benefit'>): FoodDetailedItem {
  const combined = `${item.name} ${item.category}`.toLowerCase();
  
  for (const profile of dishProfiles) {
    if (profile.pattern.test(combined)) {
      return {
        catchyLine: item.catchy_line?.trim() || profile.catchyLine,
        nutritionBenefit: item.nutrition_benefit?.trim() || profile.highlights,
        nutritionalFacts: {
          calories: profile.calories,
          protein: profile.protein,
          carbs: profile.carbs,
          fats: profile.fats,
          highlights: profile.highlights
        },
        photoUrl: profile.photoUrl,
        emoji: profile.emoji,
        isVeg: true
      };
    }
  }

  // Fallback defaults for custom or unlisted items
  return {
    catchyLine: item.catchy_line?.trim() || 'Freshly made canteen special, cooked hot to order.',
    nutritionBenefit: item.nutrition_benefit?.trim() || 'Wholesome campus comfort food prepared with quality ingredients.',
    nutritionalFacts: {
      calories: 250,
      protein: 7,
      carbs: 40,
      fats: 7,
      highlights: 'Wholesome energy from balanced campus culinary preparation.'
    },
    photoUrl: '/food/vada-pav.jpg',
    emoji: '🍽️',
    isVeg: true
  };
}

export function getFoodEmoji(name: string, category: string): string {
  return getFoodDetails({ name, category }).emoji;
}

export function getFoodPhoto(name: string, category: string): string {
  return getFoodDetails({ name, category }).photoUrl;
}
