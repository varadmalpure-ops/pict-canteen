import type { MenuItem } from '../types';

const lines = [
  'A little campus comfort, ready for your next break.',
  'A satisfying pick for the space between classes.',
  'A canteen favorite that makes a busy day tastier.',
  'Your next study break just found its perfect bite.',
  'Fresh-from-the-counter comfort, made for campus life.',
  'A cheerful pause in the middle of a packed day.',
  'Good food, good company, and back to what you love.',
  'The kind of quick break worth looking forward to.',
];

function nutritionFor(name: string, category: string): string {
  const dish = name.toLowerCase();
  const group = category.toLowerCase();

  if (/paneer|cheese|milk|bournvita/.test(dish)) {
    return 'Dairy ingredients can contribute protein and calcium; the amount depends on the recipe and portion.';
  }
  if (/dal|lentil|misal|sambar|khichadi/.test(dish)) {
    return 'Pulses can add plant protein and fibre alongside carbohydrates; ingredients vary by preparation.';
  }
  if (/poha/.test(dish)) {
    return 'A carbohydrate-rich grain dish for energy; added vegetables and toppings vary by preparation.';
  }
  if (/lemon|juice|butter milk/.test(dish)) {
    return 'A refreshing drink that contributes to fluid intake; added sugar and ingredients vary by preparation.';
  }
  if (/tea|coffee/.test(dish)) {
    return 'A warm drink for a quick pause; caffeine, milk, and sugar depend on how it is prepared.';
  }
  if (/sandwich|uttap|dosa|idli|chapati|paratha|upma|maggie|maggi|pulav|thali|bhaji|vada|wada|pakoda|samosa|pattice|toast|bread/.test(dish)) {
    return 'Provides energy from grains and other ingredients; vegetables, protein, and cooking methods vary by recipe.';
  }
  if (group.includes('beverage')) {
    return 'A drink to help top up fluids; nutrition depends on the ingredients and added sweeteners.';
  }
  return 'Nutrition depends on the ingredients and portion; ask the canteen team about today’s preparation.';
}

export function getFoodDetails(item: Pick<MenuItem, 'name' | 'category' | 'catchy_line' | 'nutrition_benefit'>) {
  const hash = Array.from(item.name).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return {
    catchyLine: item.catchy_line?.trim() || lines[hash % lines.length],
    nutritionBenefit: item.nutrition_benefit?.trim() || nutritionFor(item.name, item.category),
  };
}
