import type { MenuItem } from '../types';

const lines = [
  'A little campus comfort, ready for your next break.',
  'Crispy, golden, and packed with canteen love.',
  'A satisfying pick for the space between classes.',
  'A canteen favorite that makes a busy day tastier.',
  'Your next study break just found its perfect bite.',
  'Fresh-from-the-counter comfort, made for PICT life.',
  'A cheerful, steaming pause in the middle of a packed day.',
  'Good food, good friends, and back to what you love.',
  'The kind of quick break worth looking forward to.',
  'Taste that feels like home, only closer.',
  'Bite into something amazing before your next lecture.',
  'Your daily dose of deliciousness starts right here.',
  'Fuel up and focus in with a plate full of joy.',
  'Savor the flavor, conquer your next assignment.',
  'A little indulgence to keep your campus spirits high.',
  'Perfectly crafted for those on-the-go cravings.',
  'When campus hunger strikes, we’ve got your back.',
  'Hot, fresh, and served with a smile at the counter.',
  'Because you deserve a really good food break today.',
  'Recharge your energy and get ready for the next lab.'
];

function nutritionFor(name: string, category: string): string {
  const dish = name.toLowerCase();
  const group = category.toLowerCase();

  if (/paneer|cheese|milk|bournvita/.test(dish)) {
    return 'Rich in protein & calcium (approx 8-12g protein); great for muscle recovery and study energy.';
  }
  if (/dal|lentil|misal|sambar|khichadi/.test(dish)) {
    return 'Packed with plant-based protein, dietary fiber, and complex carbs for sustained fullness.';
  }
  if (/poha/.test(dish)) {
    return 'Light on stomach, rich in iron and complex carbs (approx 180 kcal); great morning fuel.';
  }
  if (/lemon|juice|butter milk|chaas/.test(dish)) {
    return 'Packed with Vitamin C & probiotics; hydrates and aids digestion on busy college days.';
  }
  if (/tea|coffee/.test(dish)) {
    return 'Contains antioxidants and mild caffeine to boost focus and shake off midday lethargy.';
  }
  if (/dosa|idli|uttap/.test(dish)) {
    return 'Fermented grain dish rich in gut-friendly nutrients and easy-to-digest carbohydrates.';
  }
  if (/sandwich|toast|bread/.test(dish)) {
    return 'Quick energy from wholesome grains, topped with fresh veggies and nutritious fillings.';
  }
  if (/maggi|noodles/.test(dish)) {
    return 'Classic campus comfort food, quick energy carbs; best enjoyed hot with friends.';
  }
  if (/thali|meal|pulav/.test(dish)) {
    return 'Balanced meal offering protein, vitamins, minerals, and complex carbs for all-day energy.';
  }
  if (group.includes('beverage')) {
    return 'Hydrating drink that re-energizes your body and refreshes your mind.';
  }
  return 'Made fresh with quality campus kitchen ingredients; wholesome and hearty.';
}

export function getFoodEmoji(name: string, category: string): string {
  const dish = name.toLowerCase();
  
  if (/tea|chai/.test(dish)) return '☕';
  if (/coffee/.test(dish)) return '☕';
  if (/juice|drink|water|shake/.test(dish)) return '🥤';
  if (/lemon|limbu/.test(dish)) return '🍋';
  if (/milk|bournvita|haldi/.test(dish)) return '🥛';
  if (/butter milk|chaas|lassi/.test(dish)) return '🥛';
  
  if (/sandwich|bread butter/.test(dish)) return '🥪';
  if (/dosa/.test(dish)) return '🥞';
  if (/idli/.test(dish)) return '⚪';
  if (/uttap/.test(dish)) return '🍕';
  if (/wada|vada|samosa|pattice/.test(dish)) return '🥟';
  if (/misal/.test(dish)) return '🍲';
  if (/thali|meal|khichadi|dal|pulav/.test(dish)) return '🍛';
  if (/maggi|maggie|noodles/.test(dish)) return '🍜';
  if (/poha|upma/.test(dish)) return '🥣';
  if (/bhaji|pakoda/.test(dish)) return '🧆';
  if (/paneer/.test(dish)) return '🧀';
  if (/toast/.test(dish)) return '🍞';
  if (/paratha/.test(dish)) return '🫓';

  const cat = category.toLowerCase();
  if (cat.includes('beverage')) return '🧋';
  if (cat.includes('snack')) return '🥙';
  if (cat.includes('meal')) return '🍛';

  return '🍽️';
}

export function getFoodGradient(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('beverage') || cat.includes('drink')) {
    return 'from-sky-400 to-blue-600';
  }
  if (cat.includes('snack') || cat.includes('south')) {
    return 'from-amber-400 to-orange-500';
  }
  if (cat.includes('meal') || cat.includes('thali')) {
    return 'from-emerald-400 to-teal-600';
  }
  if (cat.includes('dosa') || cat.includes('maggie')) {
    return 'from-yellow-400 to-amber-600';
  }
  if (cat.includes('sandwich') || cat.includes('bite')) {
    return 'from-rose-400 to-red-500';
  }
  return 'from-orange-400 to-amber-500';
}

/**
 * Curated high-resolution food images for Indian canteen favorites
 */
const foodPhotoMap: { pattern: RegExp; url: string }[] = [
  { pattern: /tea|chai/i, url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80' },
  { pattern: /coffee/i, url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80' },
  { pattern: /samosa/i, url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' },
  { pattern: /dosa/i, url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80' },
  { pattern: /idli/i, url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80' },
  { pattern: /sandwich|toast/i, url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80' },
  { pattern: /maggi|noodles/i, url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80' },
  { pattern: /thali|meal|khichadi|pulav/i, url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80' },
  { pattern: /poha|upma/i, url: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=600&q=80' },
  { pattern: /paratha/i, url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80' },
  { pattern: /misal/i, url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80' },
  { pattern: /wada|vada|pakoda|bhaji|pattice/i, url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80' },
  { pattern: /milk|bournvita|butter milk|lemon|juice/i, url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80' },
  { pattern: /uttap/i, url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },
];

export function getFoodPhoto(name: string, category: string): string {
  const combined = `${name} ${category}`;
  for (const item of foodPhotoMap) {
    if (item.pattern.test(combined)) {
      return item.url;
    }
  }
  // Generic Indian appetizing culinary dish
  return 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80';
}

export function getFoodDetails(item: Pick<MenuItem, 'name' | 'category' | 'catchy_line' | 'nutrition_benefit'>) {
  const hash = Array.from(item.name).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return {
    catchyLine: item.catchy_line?.trim() || lines[hash % lines.length],
    nutritionBenefit: item.nutrition_benefit?.trim() || nutritionFor(item.name, item.category),
    photoUrl: getFoodPhoto(item.name, item.category),
  };
}
