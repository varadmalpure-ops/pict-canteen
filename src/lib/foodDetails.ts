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

const dishProfiles: DishProfile[] = [
  {
    pattern: /tea|chai/i,
    photoUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'The legendary cutting chai that powers all-nighters, group study, and exam revisions.',
    calories: 65,
    protein: 2,
    carbs: 9,
    fats: 2,
    highlights: 'Antioxidants & caffeine boost alertness and mental clarity.',
    emoji: '☕'
  },
  {
    pattern: /coffee/i,
    photoUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Rich, frothy, and freshly brewed to shake off sleepy 8 AM lectures.',
    calories: 85,
    protein: 3,
    carbs: 11,
    fats: 3,
    highlights: 'Caffeine boosts metabolic rate and cognitive reaction speed.',
    emoji: '☕'
  },
  {
    pattern: /samosa/i,
    photoUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Golden crispy crust bursting with piping-hot spiced potatoes and crushed coriander seeds.',
    calories: 210,
    protein: 4,
    carbs: 26,
    fats: 10,
    highlights: 'Carb-dense comfort snack that delivers instant post-lecture energy.',
    emoji: '🥟'
  },
  {
    pattern: /wada pav|vada pav/i,
    photoUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'The undisputed king of campus snacks: spiced batata vada inside soft pav with spicy garlic chutney.',
    calories: 275,
    protein: 6,
    carbs: 42,
    fats: 9,
    highlights: 'Hearty carbohydrates and spices provide lasting satiety on busy college days.',
    emoji: '🍔'
  },
  {
    pattern: /misal/i,
    photoUrl: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Fiery sprouted moth bean curry crowned with crunchy farsan, fresh onions, and juicy lemon.',
    calories: 340,
    protein: 14,
    carbs: 48,
    fats: 11,
    highlights: 'Rich in sprouted plant protein, dietary fiber, and iron for muscle endurance.',
    emoji: '🍲'
  },
  {
    pattern: /masala dosa/i,
    photoUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Paper-thin golden crispy fermented crepe rolled with spiced mustard potato filling.',
    calories: 320,
    protein: 7,
    carbs: 52,
    fats: 9,
    highlights: 'Naturally fermented batter provides gut-friendly probiotics and clean energy.',
    emoji: '🥞'
  },
  {
    pattern: /dosa/i,
    photoUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Crispy fermented rice and lentil crepe served fresh with hot sambar and coconut chutney.',
    calories: 240,
    protein: 6,
    carbs: 44,
    fats: 5,
    highlights: 'Fermented grains are easy on digestion and gentle on energy spikes.',
    emoji: '🥞'
  },
  {
    pattern: /idli/i,
    photoUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Pillow-soft steamed rice cakes that melt in your mouth, served with aromatic lentil sambar.',
    calories: 180,
    protein: 6,
    carbs: 38,
    fats: 1,
    highlights: 'Virtually fat-free, steamed, and packed with easily digestible complex carbs.',
    emoji: '⚪'
  },
  {
    pattern: /wada sambar|medu wada/i,
    photoUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Crisp on the outside, fluffy inside black gram fritters dunked in piping hot tangy sambar.',
    calories: 290,
    protein: 9,
    carbs: 32,
    fats: 14,
    highlights: 'High in urad dal protein and dietary fiber for muscle synthesis.',
    emoji: '🍩'
  },
  {
    pattern: /poha/i,
    photoUrl: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Fluffy flattened rice tossed with crunchy roasted peanuts, mustard seeds, onions, and turmeric.',
    calories: 220,
    protein: 5,
    carbs: 42,
    fats: 4,
    highlights: 'Iron-rich, gluten-free grain breakfast that keeps you full without feeling heavy.',
    emoji: '🥣'
  },
  {
    pattern: /upma/i,
    photoUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Savory roasted semolina tempered with mustard seeds, fresh curry leaves, and ginger.',
    calories: 210,
    protein: 6,
    carbs: 39,
    fats: 3,
    highlights: 'Low glycemic index semolina provides slow, steady glucose release for study focus.',
    emoji: '🥣'
  },
  {
    pattern: /sandwich/i,
    photoUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Crispy toasted bread layered with fresh sliced tomatoes, cucumbers, and spicy green chutney.',
    calories: 260,
    protein: 7,
    carbs: 38,
    fats: 8,
    highlights: 'Vitamins from fresh cucumbers and tomatoes paired with wholesome grain energy.',
    emoji: '🥪'
  },
  {
    pattern: /maggi|maggie|noodles/i,
    photoUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Hot, spicy, nostalgic campus noodles prepared with secret tastemaker and veggies.',
    calories: 310,
    protein: 6,
    carbs: 45,
    fats: 12,
    highlights: 'Instant mood-lifting comfort meal best enjoyed piping hot on a cool rainy evening.',
    emoji: '🍜'
  },
  {
    pattern: /uttap/i,
    photoUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Thick, fluffy South Indian pancake griddled with chopped juicy tomatoes, onions, and chilies.',
    calories: 270,
    protein: 7,
    carbs: 46,
    fats: 6,
    highlights: 'Wholesome fermented crepe rich in dietary fiber and essential minerals.',
    emoji: '🍕'
  },
  {
    pattern: /paratha/i,
    photoUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Tawa-toasted golden whole wheat flatbread stuffed with spiced potato mash, served with curd.',
    calories: 330,
    protein: 8,
    carbs: 49,
    fats: 11,
    highlights: 'Whole wheat fiber paired with cooling probiotic curd for sustained afternoon stamina.',
    emoji: '🫓'
  },
  {
    pattern: /sabudana/i,
    photoUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Plump tapioca pearls tossed with coarse roasted peanuts, green chilies, and fresh lemon.',
    calories: 350,
    protein: 6,
    carbs: 58,
    fats: 11,
    highlights: 'High energy density sago combined with healthy unsaturated fats from peanuts.',
    emoji: '🥗'
  },
  {
    pattern: /butter milk|chaas/i,
    photoUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Chilled spiced buttermilk infused with fresh mint, coriander, ginger, and roasted jeera.',
    calories: 45,
    protein: 3,
    carbs: 4,
    fats: 2,
    highlights: 'Natural probiotics, electrolytes, and lactic acid to cool the body and aid digestion.',
    emoji: '🥛'
  },
  {
    pattern: /lemon|limbu/i,
    photoUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Freshly squeezed sweet and tangy nimbu pani with rock salt for instant refreshment.',
    calories: 55,
    protein: 1,
    carbs: 13,
    fats: 0,
    highlights: 'Loaded with natural Vitamin C and electrolytes to fight dehydration.',
    emoji: '🍋'
  },
  {
    pattern: /milk|bournvita|haldi/i,
    photoUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Steaming cup of nutrient-rich dairy to recharge your brain cells after intense labs.',
    calories: 140,
    protein: 7,
    carbs: 16,
    fats: 5,
    highlights: 'High in bioavailable calcium and complete dairy proteins for bone strength.',
    emoji: '🥛'
  },
  {
    pattern: /pakoda|bhaji/i,
    photoUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Crunchy gram flour fritters studded with onions and green chilies, fried till golden perfection.',
    calories: 240,
    protein: 5,
    carbs: 28,
    fats: 12,
    highlights: 'Besan (chickpea flour) adds plant protein and zinc to this monsoon canteen favorite.',
    emoji: '🧆'
  },
  {
    pattern: /thali|meal|khichadi|pulav/i,
    photoUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    catchyLine: 'Satisfying campus meal plate packed with fresh chapatis, seasonal vegetable sabji, dal, and fragrant rice.',
    calories: 520,
    protein: 18,
    carbs: 85,
    fats: 12,
    highlights: 'Balanced macro ratio offering complete amino acids, vitamins, and long-lasting satiety.',
    emoji: '🍛'
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

  // Fallback defaults for custom or new items
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
    photoUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
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
