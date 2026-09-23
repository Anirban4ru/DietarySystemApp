import { FoodItem, FoodCategory } from './types';

// Nutritional Decay Scale (NDS): shelf life + micronutrient fragility.
// Indian pantry staples — fully localised for Indian kitchens.
export const FOOD_CATALOG: FoodItem[] = [
  // Leafy greens
  { name: 'Spinach', category: 'leafy_green', shelfLifeDays: 4, fragility: 0.98, kcal: 23, proteinG: 2.9, carbG: 3.6, fatG: 0.4, fiberG: 2.2, vitC: 47, vitA: 188, calcium: 99, iron: 2.7, potassium: 558, co2ePerKg: 0.4 },
  { name: 'Methi', category: 'leafy_green', shelfLifeDays: 3, fragility: 0.97, kcal: 49, proteinG: 4.4, carbG: 6.0, fatG: 0.9, fiberG: 2.7, vitC: 27, vitA: 140, calcium: 176, iron: 3.2, potassium: 770, co2ePerKg: 0.38 },
  { name: 'Palak', category: 'leafy_green', shelfLifeDays: 4, fragility: 0.98, kcal: 23, proteinG: 2.9, carbG: 3.6, fatG: 0.4, fiberG: 2.2, vitC: 47, vitA: 188, calcium: 99, iron: 2.7, potassium: 558, co2ePerKg: 0.4 },
  { name: 'Curry Leaves', category: 'leafy_green', shelfLifeDays: 5, fragility: 0.90, kcal: 108, proteinG: 6.1, carbG: 18.7, fatG: 1.0, fiberG: 6.4, vitC: 4, vitA: 57, calcium: 830, iron: 0.9, potassium: 470, co2ePerKg: 0.35 },
  // Roots & vegetables
  { name: 'Aloo', category: 'root', shelfLifeDays: 30, fragility: 0.15, kcal: 77, proteinG: 2, carbG: 17.5, fatG: 0.1, fiberG: 2.2, vitC: 13, vitA: 0, calcium: 12, iron: 0.8, potassium: 425, co2ePerKg: 0.37, avoid: ['diabetes'], substitute: 'Shakarkandi' },
  { name: 'Shakarkandi', category: 'root', shelfLifeDays: 28, fragility: 0.25, kcal: 86, proteinG: 1.6, carbG: 20.1, fatG: 0.1, fiberG: 3, vitC: 17, vitA: 709, calcium: 30, iron: 0.6, potassium: 337, co2ePerKg: 0.3 },
  { name: 'Gajar', category: 'root', shelfLifeDays: 21, fragility: 0.2, kcal: 41, proteinG: 0.9, carbG: 9.6, fatG: 0.2, fiberG: 2.8, vitC: 7, vitA: 835, calcium: 33, iron: 0.3, potassium: 320, co2ePerKg: 0.25 },
  { name: 'Beetroot', category: 'root', shelfLifeDays: 21, fragility: 0.3, kcal: 43, proteinG: 1.6, carbG: 9.6, fatG: 0.2, fiberG: 2.8, vitC: 5, vitA: 1, calcium: 16, iron: 0.8, potassium: 325, co2ePerKg: 0.28 },
  { name: 'Radish', category: 'root', shelfLifeDays: 7, fragility: 0.55, kcal: 16, proteinG: 0.7, carbG: 3.4, fatG: 0.1, fiberG: 1.6, vitC: 14, vitA: 0, calcium: 25, iron: 0.3, potassium: 233, co2ePerKg: 0.22 },
  // Fruits & Vegetables
  { name: 'Tamatar', category: 'fruit', shelfLifeDays: 6, fragility: 0.7, kcal: 18, proteinG: 0.9, carbG: 3.9, fatG: 0.2, fiberG: 1.2, vitC: 14, vitA: 25, calcium: 10, iron: 0.3, potassium: 237, co2ePerKg: 0.45 },
  { name: 'Pyaaz', category: 'allium', shelfLifeDays: 30, fragility: 0.2, kcal: 40, proteinG: 1.1, carbG: 9.3, fatG: 0.1, fiberG: 1.7, vitC: 7, vitA: 0, calcium: 23, iron: 0.2, potassium: 146, co2ePerKg: 0.27 },
  { name: 'Lehsun', category: 'allium', shelfLifeDays: 90, fragility: 0.15, kcal: 149, proteinG: 6.4, carbG: 33, fatG: 0.5, fiberG: 2.1, vitC: 31, vitA: 0, calcium: 181, iron: 1.7, potassium: 401, co2ePerKg: 0.3 },
  { name: 'Adrak', category: 'root', shelfLifeDays: 30, fragility: 0.2, kcal: 80, proteinG: 1.8, carbG: 17.8, fatG: 0.75, fiberG: 2.0, vitC: 5, vitA: 0, calcium: 16, iron: 0.6, potassium: 415, co2ePerKg: 0.27 },
  { name: 'Hari Mirch', category: 'fruit', shelfLifeDays: 7, fragility: 0.65, kcal: 40, proteinG: 2, carbG: 9, fatG: 0.2, fiberG: 1.5, vitC: 242, vitA: 40, calcium: 18, iron: 1, potassium: 340, co2ePerKg: 0.35 },
  { name: 'Shimla Mirch', category: 'fruit', shelfLifeDays: 7, fragility: 0.6, kcal: 31, proteinG: 1, carbG: 6, fatG: 0.3, fiberG: 2.1, vitC: 128, vitA: 19, calcium: 7, iron: 0.4, potassium: 211, co2ePerKg: 0.35 },
  { name: 'Lemon', category: 'fruit', shelfLifeDays: 21, fragility: 0.45, kcal: 29, proteinG: 1.1, carbG: 9.3, fatG: 0.3, fiberG: 2.8, vitC: 53, vitA: 1, calcium: 26, iron: 0.6, potassium: 138, co2ePerKg: 0.3 },
  { name: 'Banana', category: 'fruit', shelfLifeDays: 5, fragility: 0.6, kcal: 89, proteinG: 1.1, carbG: 22.8, fatG: 0.3, fiberG: 2.6, vitC: 9, vitA: 1, calcium: 5, iron: 0.3, potassium: 358, co2ePerKg: 0.7, avoid: ['diabetes'], substitute: 'Apple' },
  { name: 'Apple', category: 'fruit', shelfLifeDays: 14, fragility: 0.4, kcal: 52, proteinG: 0.3, carbG: 14, fatG: 0.2, fiberG: 2.4, vitC: 5, vitA: 1, calcium: 6, iron: 0.1, potassium: 107, co2ePerKg: 0.4 },
  // Dairy
  { name: 'Doodh', category: 'dairy', shelfLifeDays: 3, fragility: 0.75, kcal: 61, proteinG: 3.2, carbG: 4.8, fatG: 3.2, fiberG: 0, vitC: 0, vitA: 2, calcium: 120, iron: 0, potassium: 150, co2ePerKg: 1.6, avoid: ['lactose_intolerant'], substitute: 'Soy Milk' },
  { name: 'Dahi', category: 'dairy', shelfLifeDays: 5, fragility: 0.55, kcal: 61, proteinG: 3.5, carbG: 4.7, fatG: 3.3, fiberG: 0, vitC: 0, vitA: 1, calcium: 121, iron: 0.1, potassium: 155, co2ePerKg: 1.2, avoid: ['lactose_intolerant'], substitute: 'Coconut Yogurt' },
  { name: 'Paneer', category: 'dairy', shelfLifeDays: 4, fragility: 0.65, kcal: 265, proteinG: 18.3, carbG: 1.2, fatG: 20.8, fiberG: 0, vitC: 0, vitA: 3, calcium: 480, iron: 0.2, potassium: 90, co2ePerKg: 4.5, avoid: ['lactose_intolerant'], substitute: 'Tofu' },
  { name: 'Ghee', category: 'dairy', shelfLifeDays: 180, fragility: 0.05, kcal: 900, proteinG: 0, carbG: 0, fatG: 100, fiberG: 0, vitC: 0, vitA: 15, calcium: 0, iron: 0, potassium: 5, co2ePerKg: 3.2 },
  // Protein
  { name: 'Eggs', category: 'protein', shelfLifeDays: 21, fragility: 0.4, kcal: 155, proteinG: 13, carbG: 1.1, fatG: 11, fiberG: 0, vitC: 0, vitA: 10, calcium: 50, iron: 1.2, potassium: 130, co2ePerKg: 4.5 },
  { name: 'Chicken', category: 'protein', shelfLifeDays: 2, fragility: 0.85, kcal: 165, proteinG: 31, carbG: 0, fatG: 3.6, fiberG: 0, vitC: 0, vitA: 0, calcium: 15, iron: 1, potassium: 256, co2ePerKg: 6.9 },
  { name: 'Mutton', category: 'protein', shelfLifeDays: 2, fragility: 0.85, kcal: 294, proteinG: 25.6, carbG: 0, fatG: 21.2, fiberG: 0, vitC: 0, vitA: 0, calcium: 14, iron: 2.9, potassium: 310, co2ePerKg: 39.2 },
  { name: 'Tofu', category: 'protein', shelfLifeDays: 7, fragility: 0.6, kcal: 76, proteinG: 8, carbG: 1.9, fatG: 4.8, fiberG: 0.3, vitC: 0, vitA: 0, calcium: 350, iron: 5.4, potassium: 121, co2ePerKg: 2.0 },
  // Dals & Legumes
  { name: 'Masoor Dal', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 116, proteinG: 9, carbG: 20, fatG: 0.4, fiberG: 7.9, vitC: 0, vitA: 0, calcium: 19, iron: 3.3, potassium: 369, co2ePerKg: 0.9 },
  { name: 'Toor Dal', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 112, proteinG: 7.2, carbG: 19.6, fatG: 0.38, fiberG: 5.0, vitC: 0, vitA: 0, calcium: 28, iron: 2.3, potassium: 339, co2ePerKg: 0.8 },
  { name: 'Moong Dal', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 105, proteinG: 7.6, carbG: 18.1, fatG: 0.4, fiberG: 7.6, vitC: 0, vitA: 0, calcium: 32, iron: 1.9, potassium: 369, co2ePerKg: 0.7 },
  { name: 'Chana', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 164, proteinG: 8.9, carbG: 27, fatG: 2.6, fiberG: 7.6, vitC: 0, vitA: 0, calcium: 49, iron: 2.9, potassium: 291, co2ePerKg: 0.84 },
  { name: 'Rajma', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 127, proteinG: 8.7, carbG: 22.8, fatG: 0.5, fiberG: 6.4, vitC: 0, vitA: 0, calcium: 28, iron: 2.9, potassium: 405, co2ePerKg: 0.9 },
  // Grains
  { name: 'Chawal', category: 'grain', shelfLifeDays: 365, fragility: 0.08, kcal: 130, proteinG: 2.7, carbG: 28, fatG: 0.3, fiberG: 0.4, vitC: 0, vitA: 0, calcium: 10, iron: 0.2, potassium: 35, co2ePerKg: 2.7, avoid: ['diabetes'], substitute: 'Brown Rice' },
  { name: 'Brown Rice', category: 'grain', shelfLifeDays: 180, fragility: 0.1, kcal: 111, proteinG: 2.6, carbG: 23, fatG: 0.9, fiberG: 1.8, vitC: 0, vitA: 0, calcium: 10, iron: 0.4, potassium: 43, co2ePerKg: 2.7 },
  { name: 'Gehu Atta', category: 'grain', shelfLifeDays: 60, fragility: 0.12, kcal: 340, proteinG: 12, carbG: 71, fatG: 1.9, fiberG: 10.7, vitC: 0, vitA: 0, calcium: 34, iron: 3.6, potassium: 107, co2ePerKg: 1.2, avoid: ['celiac'], substitute: 'Jowar Atta' },
  { name: 'Jowar Atta', category: 'grain', shelfLifeDays: 60, fragility: 0.15, kcal: 329, proteinG: 10.4, carbG: 72.6, fatG: 1.7, fiberG: 6.3, vitC: 0, vitA: 0, calcium: 25, iron: 4.1, potassium: 350, co2ePerKg: 0.9 },
  { name: 'Oats', category: 'grain', shelfLifeDays: 365, fragility: 0.08, kcal: 389, proteinG: 17, carbG: 66, fatG: 7, fiberG: 10.6, vitC: 0, vitA: 0, calcium: 54, iron: 4.7, potassium: 429, co2ePerKg: 0.87 },
  { name: 'Poha', category: 'grain', shelfLifeDays: 180, fragility: 0.08, kcal: 76, proteinG: 1.6, carbG: 17.1, fatG: 0.2, fiberG: 0.3, vitC: 0, vitA: 0, calcium: 6, iron: 8.8, potassium: 70, co2ePerKg: 1.5 },
  { name: 'Suji', category: 'grain', shelfLifeDays: 180, fragility: 0.1, kcal: 360, proteinG: 12.7, carbG: 73.9, fatG: 1.1, fiberG: 3.9, vitC: 0, vitA: 0, calcium: 17, iron: 3.6, potassium: 190, co2ePerKg: 1.3, avoid: ['celiac'], substitute: 'Jowar Atta' },
  // Fungi
  { name: 'Mushroom', category: 'fungi', shelfLifeDays: 7, fragility: 0.7, kcal: 22, proteinG: 3.1, carbG: 3.3, fatG: 0.3, fiberG: 1, vitC: 0, vitA: 0, calcium: 3, iron: 0.5, potassium: 318, co2ePerKg: 0.9 },
];

export const FOOD_BY_NAME: Record<string, FoodItem> = Object.fromEntries(
  FOOD_CATALOG.map((f) => [f.name.toLowerCase(), f]),
);

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  leafy_green: 'Saag / Leafy',
  root: 'Root Vegetable',
  fruit: 'Fruit / Sabzi',
  dairy: 'Dairy',
  protein: 'Dal & Protein',
  grain: 'Anaj / Grain',
  allium: 'Pyaaz / Lehsun',
  fungi: 'Mushroom',
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
