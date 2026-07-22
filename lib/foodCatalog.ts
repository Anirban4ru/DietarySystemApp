import { FoodItem, FoodCategory } from './types';

// Nutritional Decay Scale (NDS): shelf life + micronutrient fragility.
// Fragility encodes how fast water-soluble vitamins (C, B) degrade post-harvest.
export const FOOD_CATALOG: FoodItem[] = [
  // Leafy greens — highest fragility
  { name: 'Spinach', category: 'leafy_green', shelfLifeDays: 5, fragility: 0.98, kcal: 23, proteinG: 2.9, carbG: 3.6, fatG: 0.4, fiberG: 2.2, vitC: 47, vitA: 188, calcium: 99, iron: 2.7, potassium: 558, co2ePerKg: 0.4 },
  { name: 'Lettuce', category: 'leafy_green', shelfLifeDays: 7, fragility: 0.95, kcal: 15, proteinG: 1.4, carbG: 2.9, fatG: 0.2, fiberG: 1.3, vitC: 10, vitA: 251, calcium: 36, iron: 0.9, potassium: 194, co2ePerKg: 0.35 },
  { name: 'Kale', category: 'leafy_green', shelfLifeDays: 8, fragility: 0.9, kcal: 49, proteinG: 4.3, carbG: 8.8, fatG: 0.9, fiberG: 3.6, vitC: 200, vitA: 500, calcium: 150, iron: 1.5, potassium: 491, co2ePerKg: 0.42 },
  { name: 'Arugula', category: 'leafy_green', shelfLifeDays: 5, fragility: 0.96, kcal: 25, proteinG: 2.6, carbG: 3.7, fatG: 0.7, fiberG: 1.6, vitC: 15, vitA: 119, calcium: 160, iron: 1.5, potassium: 369, co2ePerKg: 0.38 },
  // Roots — stable
  { name: 'Carrot', category: 'root', shelfLifeDays: 30, fragility: 0.2, kcal: 41, proteinG: 0.9, carbG: 9.6, fatG: 0.2, fiberG: 2.8, vitC: 7, vitA: 835, calcium: 33, iron: 0.3, potassium: 320, co2ePerKg: 0.25 },
  { name: 'Potato', category: 'root', shelfLifeDays: 60, fragility: 0.15, kcal: 77, proteinG: 2, carbG: 17.5, fatG: 0.1, fiberG: 2.2, vitC: 13, vitA: 0, calcium: 12, iron: 0.8, potassium: 425, co2ePerKg: 0.37, avoid: ['diabetes'], substitute: 'Sweet Potato' },
  { name: 'Beetroot', category: 'root', shelfLifeDays: 21, fragility: 0.3, kcal: 43, proteinG: 1.6, carbG: 9.6, fatG: 0.2, fiberG: 2.8, vitC: 5, vitA: 1, calcium: 16, iron: 0.8, potassium: 325, co2ePerKg: 0.28 },
  { name: 'Sweet Potato', category: 'root', shelfLifeDays: 28, fragility: 0.25, kcal: 86, proteinG: 1.6, carbG: 20.1, fatG: 0.1, fiberG: 3, vitC: 17, vitA: 709, calcium: 30, iron: 0.6, potassium: 337, co2ePerKg: 0.3 },
  // Fruits — moderate
  { name: 'Banana', category: 'fruit', shelfLifeDays: 7, fragility: 0.6, kcal: 89, proteinG: 1.1, carbG: 22.8, fatG: 0.3, fiberG: 2.6, vitC: 9, vitA: 1, calcium: 5, iron: 0.3, potassium: 358, co2ePerKg: 0.7, avoid: ['diabetes'], substitute: 'Apple' },
  { name: 'Apple', category: 'fruit', shelfLifeDays: 21, fragility: 0.4, kcal: 52, proteinG: 0.3, carbG: 14, fatG: 0.2, fiberG: 2.4, vitC: 5, vitA: 1, calcium: 6, iron: 0.1, potassium: 107, co2ePerKg: 0.4 },
  { name: 'Tomato', category: 'fruit', shelfLifeDays: 7, fragility: 0.7, kcal: 18, proteinG: 0.9, carbG: 3.9, fatG: 0.2, fiberG: 1.2, vitC: 14, vitA: 25, calcium: 10, iron: 0.3, potassium: 237, co2ePerKg: 0.45 },
  { name: 'Avocado', category: 'fruit', shelfLifeDays: 7, fragility: 0.55, kcal: 160, proteinG: 2, carbG: 9, fatG: 15, fiberG: 7, vitC: 10, vitA: 2, calcium: 12, iron: 0.6, potassium: 485, co2ePerKg: 0.9 },
  { name: 'Lemon', category: 'fruit', shelfLifeDays: 21, fragility: 0.45, kcal: 29, proteinG: 1.1, carbG: 9.3, fatG: 0.3, fiberG: 2.8, vitC: 53, vitA: 1, calcium: 26, iron: 0.6, potassium: 138, co2ePerKg: 0.3 },
  // Dairy
  { name: 'Milk', category: 'dairy', shelfLifeDays: 7, fragility: 0.5, kcal: 42, proteinG: 3.4, carbG: 5, fatG: 1, fiberG: 0, vitC: 0, vitA: 2, calcium: 125, iron: 0, potassium: 150, co2ePerKg: 1.6, avoid: ['lactose_intolerant'], substitute: 'Oat Milk' },
  { name: 'Greek Yogurt', category: 'dairy', shelfLifeDays: 14, fragility: 0.45, kcal: 59, proteinG: 10, carbG: 3.6, fatG: 0.4, fiberG: 0, vitC: 0, vitA: 1, calcium: 110, iron: 0.1, potassium: 141, co2ePerKg: 1.4, avoid: ['lactose_intolerant'], substitute: 'Coconut Yogurt' },
  { name: 'Cheddar', category: 'dairy', shelfLifeDays: 60, fragility: 0.2, kcal: 403, proteinG: 25, carbG: 1.3, fatG: 33, fiberG: 0, vitC: 0, vitA: 10, calcium: 721, iron: 0.7, potassium: 98, co2ePerKg: 13.5, avoid: ['hypertension'], substitute: 'Low-sodium Cottage Cheese' },
  // Protein
  { name: 'Chicken Breast', category: 'protein', shelfLifeDays: 3, fragility: 0.8, kcal: 165, proteinG: 31, carbG: 0, fatG: 3.6, fiberG: 0, vitC: 0, vitA: 0, calcium: 15, iron: 1, potassium: 256, co2ePerKg: 6.9 },
  { name: 'Eggs', category: 'protein', shelfLifeDays: 21, fragility: 0.4, kcal: 155, proteinG: 13, carbG: 1.1, fatG: 11, fiberG: 0, vitC: 0, vitA: 10, calcium: 50, iron: 1.2, potassium: 130, co2ePerKg: 4.5 },
  { name: 'Tofu', category: 'protein', shelfLifeDays: 7, fragility: 0.6, kcal: 76, proteinG: 8, carbG: 1.9, fatG: 4.8, fiberG: 0.3, vitC: 0, vitA: 0, calcium: 350, iron: 5.4, potassium: 121, co2ePerKg: 2.0 },
  { name: 'Lentils', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 116, proteinG: 9, carbG: 20, fatG: 0.4, fiberG: 7.9, vitC: 0, vitA: 0, calcium: 19, iron: 3.3, potassium: 369, co2ePerKg: 0.9 },
  { name: 'Chickpeas', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 164, proteinG: 8.9, carbG: 27, fatG: 2.6, fiberG: 7.6, vitC: 0, vitA: 0, calcium: 49, iron: 2.9, potassium: 291, co2ePerKg: 0.84 },
  { name: 'Salmon', category: 'protein', shelfLifeDays: 2, fragility: 0.85, kcal: 208, proteinG: 20, carbG: 0, fatG: 13, fiberG: 0, vitC: 0, vitA: 2, calcium: 9, iron: 0.3, potassium: 363, co2ePerKg: 11.9, avoid: ['hypertension'], substitute: 'White Fish' },
  // Grains
  { name: 'Brown Rice', category: 'grain', shelfLifeDays: 180, fragility: 0.1, kcal: 111, proteinG: 2.6, carbG: 23, fatG: 0.9, fiberG: 1.8, vitC: 0, vitA: 0, calcium: 10, iron: 0.4, potassium: 43, co2ePerKg: 2.7, avoid: ['diabetes'], substitute: 'Quinoa' },
  { name: 'Quinoa', category: 'grain', shelfLifeDays: 180, fragility: 0.1, kcal: 120, proteinG: 4.4, carbG: 21.3, fatG: 1.9, fiberG: 2.8, vitC: 0, vitA: 0, calcium: 17, iron: 1.5, potassium: 172, co2ePerKg: 1.2 },
  { name: 'Oats', category: 'grain', shelfLifeDays: 365, fragility: 0.08, kcal: 389, proteinG: 17, carbG: 66, fatG: 7, fiberG: 10.6, vitC: 0, vitA: 0, calcium: 54, iron: 4.7, potassium: 429, co2ePerKg: 0.87 },
  { name: 'Whole Wheat Bread', category: 'grain', shelfLifeDays: 5, fragility: 0.65, kcal: 247, proteinG: 13, carbG: 41, fatG: 3.2, fiberG: 7, vitC: 0, vitA: 0, calcium: 107, iron: 2.5, potassium: 250, co2ePerKg: 1.6, avoid: ['celiac'], substitute: 'Gluten-Free Bread' },
  // Allium / fungi
  { name: 'Onion', category: 'allium', shelfLifeDays: 30, fragility: 0.2, kcal: 40, proteinG: 1.1, carbG: 9.3, fatG: 0.1, fiberG: 1.7, vitC: 7, vitA: 0, calcium: 23, iron: 0.2, potassium: 146, co2ePerKg: 0.27 },
  { name: 'Garlic', category: 'allium', shelfLifeDays: 90, fragility: 0.15, kcal: 149, proteinG: 6.4, carbG: 33, fatG: 0.5, fiberG: 2.1, vitC: 31, vitA: 0, calcium: 181, iron: 1.7, potassium: 401, co2ePerKg: 0.3 },
  { name: 'Mushroom', category: 'fungi', shelfLifeDays: 7, fragility: 0.7, kcal: 22, proteinG: 3.1, carbG: 3.3, fatG: 0.3, fiberG: 1, vitC: 0, vitA: 0, calcium: 3, iron: 0.5, potassium: 318, co2ePerKg: 0.9 },
];

export const FOOD_BY_NAME: Record<string, FoodItem> = Object.fromEntries(
  FOOD_CATALOG.map((f) => [f.name.toLowerCase(), f]),
);

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  leafy_green: 'Leafy Green',
  root: 'Root Vegetable',
  fruit: 'Fruit',
  dairy: 'Dairy',
  protein: 'Protein',
  grain: 'Grain',
  allium: 'Allium',
  fungi: 'Fungi',
  other: 'Other',
};

// Nutritional Decay Scale ranking: fragile items first.
export const NDS_RANK = [...FOOD_CATALOG].sort((a, b) => b.fragility - a.fragility);

// Estimate remaining micronutrient fraction given days since "harvest" (added_at).
// Linear decay scaled by fragility; floors at 0.15.
export function nutrientFraction(fragility: number, daysSince: number, shelfLife: number): number {
  if (shelfLife <= 0) return 1;
  const progress = Math.min(1, daysSince / shelfLife);
  const decay = fragility * progress;
  return Math.max(0.15, 1 - decay);
}
