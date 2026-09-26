// @ts-nocheck
/* eslint-disable */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// 1. Food Catalog & Clinical Nutrition Definitions
// ============================================================================

interface FoodNutrient {
  name: string;
  category: string;
  shelfLifeDays: number;
  fragility: number;
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  vitC: number;
  vitA: number;
  calcium: number;
  iron: number;
  potassium: number;
  co2ePerKg: number;
  avoid?: string[];
  substitute?: string;
  substitutes?: string[];
}

const FOOD_CATALOG: FoodNutrient[] = [
  { name: 'Spinach', category: 'leafy_green', shelfLifeDays: 4, fragility: 0.98, kcal: 23, proteinG: 2.9, carbG: 3.6, fatG: 0.4, fiberG: 2.2, vitC: 47, vitA: 188, calcium: 99, iron: 2.7, potassium: 558, co2ePerKg: 0.4, substitutes: ['Methi', 'Palak'] },
  { name: 'Methi', category: 'leafy_green', shelfLifeDays: 3, fragility: 0.97, kcal: 49, proteinG: 4.4, carbG: 6.0, fatG: 0.9, fiberG: 2.7, vitC: 27, vitA: 140, calcium: 176, iron: 3.2, potassium: 770, co2ePerKg: 0.38, substitutes: ['Palak', 'Spinach'] },
  { name: 'Palak', category: 'leafy_green', shelfLifeDays: 4, fragility: 0.98, kcal: 23, proteinG: 2.9, carbG: 3.6, fatG: 0.4, fiberG: 2.2, vitC: 47, vitA: 188, calcium: 99, iron: 2.7, potassium: 558, co2ePerKg: 0.4, substitutes: ['Spinach', 'Methi'] },
  { name: 'Curry Leaves', category: 'leafy_green', shelfLifeDays: 5, fragility: 0.90, kcal: 108, proteinG: 6.1, carbG: 18.7, fatG: 1.0, fiberG: 6.4, vitC: 4, vitA: 57, calcium: 830, iron: 0.9, potassium: 470, co2ePerKg: 0.35 },
  { name: 'Aloo', category: 'root', shelfLifeDays: 30, fragility: 0.15, kcal: 77, proteinG: 2, carbG: 17.5, fatG: 0.1, fiberG: 2.2, vitC: 13, vitA: 0, calcium: 12, iron: 0.8, potassium: 425, co2ePerKg: 0.37, avoid: ['diabetes'], substitute: 'Shakarkandi', substitutes: ['Shakarkandi', 'Gajar'] },
  { name: 'Shakarkandi', category: 'root', shelfLifeDays: 28, fragility: 0.25, kcal: 86, proteinG: 1.6, carbG: 20.1, fatG: 0.1, fiberG: 3, vitC: 17, vitA: 709, calcium: 30, iron: 0.6, potassium: 337, co2ePerKg: 0.3, substitutes: ['Gajar', 'Beetroot'] },
  { name: 'Gajar', category: 'root', shelfLifeDays: 21, fragility: 0.2, kcal: 41, proteinG: 0.9, carbG: 9.6, fatG: 0.2, fiberG: 2.8, vitC: 7, vitA: 835, calcium: 33, iron: 0.3, potassium: 320, co2ePerKg: 0.25, substitutes: ['Beetroot', 'Shakarkandi'] },
  { name: 'Beetroot', category: 'root', shelfLifeDays: 21, fragility: 0.3, kcal: 43, proteinG: 1.6, carbG: 9.6, fatG: 0.2, fiberG: 2.8, vitC: 5, vitA: 1, calcium: 16, iron: 0.8, potassium: 325, co2ePerKg: 0.28, substitutes: ['Gajar'] },
  { name: 'Radish', category: 'root', shelfLifeDays: 7, fragility: 0.55, kcal: 16, proteinG: 0.7, carbG: 3.4, fatG: 0.1, fiberG: 1.6, vitC: 14, vitA: 0, calcium: 25, iron: 0.3, potassium: 233, co2ePerKg: 0.22 },
  { name: 'Tamatar', category: 'fruit', shelfLifeDays: 6, fragility: 0.7, kcal: 18, proteinG: 0.9, carbG: 3.9, fatG: 0.2, fiberG: 1.2, vitC: 14, vitA: 25, calcium: 10, iron: 0.3, potassium: 237, co2ePerKg: 0.45 },
  { name: 'Pyaaz', category: 'allium', shelfLifeDays: 30, fragility: 0.2, kcal: 40, proteinG: 1.1, carbG: 9.3, fatG: 0.1, fiberG: 1.7, vitC: 7, vitA: 0, calcium: 23, iron: 0.2, potassium: 146, co2ePerKg: 0.27 },
  { name: 'Lehsun', category: 'allium', shelfLifeDays: 90, fragility: 0.15, kcal: 149, proteinG: 6.4, carbG: 33, fatG: 0.5, fiberG: 2.1, vitC: 31, vitA: 0, calcium: 181, iron: 1.7, potassium: 401, co2ePerKg: 0.3 },
  { name: 'Adrak', category: 'root', shelfLifeDays: 30, fragility: 0.2, kcal: 80, proteinG: 1.8, carbG: 17.8, fatG: 0.75, fiberG: 2.0, vitC: 5, vitA: 0, calcium: 16, iron: 0.6, potassium: 415, co2ePerKg: 0.27 },
  { name: 'Hari Mirch', category: 'fruit', shelfLifeDays: 7, fragility: 0.65, kcal: 40, proteinG: 2, carbG: 9, fatG: 0.2, fiberG: 1.5, vitC: 242, vitA: 40, calcium: 18, iron: 1, potassium: 340, co2ePerKg: 0.35, substitutes: ['Shimla Mirch'] },
  { name: 'Shimla Mirch', category: 'fruit', shelfLifeDays: 7, fragility: 0.6, kcal: 31, proteinG: 1, carbG: 6, fatG: 0.3, fiberG: 2.1, vitC: 128, vitA: 19, calcium: 7, iron: 0.4, potassium: 211, co2ePerKg: 0.35, substitutes: ['Hari Mirch'] },
  { name: 'Lemon', category: 'fruit', shelfLifeDays: 21, fragility: 0.45, kcal: 29, proteinG: 1.1, carbG: 9.3, fatG: 0.3, fiberG: 2.8, vitC: 53, vitA: 1, calcium: 26, iron: 0.6, potassium: 138, co2ePerKg: 0.3 },
  { name: 'Banana', category: 'fruit', shelfLifeDays: 5, fragility: 0.6, kcal: 89, proteinG: 1.1, carbG: 22.8, fatG: 0.3, fiberG: 2.6, vitC: 9, vitA: 1, calcium: 5, iron: 0.3, potassium: 358, co2ePerKg: 0.7, avoid: ['diabetes'], substitute: 'Apple', substitutes: ['Apple'] },
  { name: 'Apple', category: 'fruit', shelfLifeDays: 14, fragility: 0.4, kcal: 52, proteinG: 0.3, carbG: 14, fatG: 0.2, fiberG: 2.4, vitC: 5, vitA: 1, calcium: 6, iron: 0.1, potassium: 107, co2ePerKg: 0.4 },
  { name: 'Doodh', category: 'dairy', shelfLifeDays: 3, fragility: 0.75, kcal: 61, proteinG: 3.2, carbG: 4.8, fatG: 3.2, fiberG: 0, vitC: 0, vitA: 2, calcium: 120, iron: 0, potassium: 150, co2ePerKg: 1.6, avoid: ['lactose_intolerant'], substitute: 'Soy Milk', substitutes: ['Dahi'] },
  { name: 'Dahi', category: 'dairy', shelfLifeDays: 5, fragility: 0.55, kcal: 61, proteinG: 3.5, carbG: 4.7, fatG: 3.3, fiberG: 0, vitC: 0, vitA: 1, calcium: 121, iron: 0.1, potassium: 155, co2ePerKg: 1.2, avoid: ['lactose_intolerant'], substitute: 'Coconut Yogurt' },
  { name: 'Paneer', category: 'dairy', shelfLifeDays: 4, fragility: 0.65, kcal: 265, proteinG: 18.3, carbG: 1.2, fatG: 20.8, fiberG: 0, vitC: 0, vitA: 3, calcium: 480, iron: 0.2, potassium: 90, co2ePerKg: 4.5, avoid: ['lactose_intolerant'], substitute: 'Tofu', substitutes: ['Tofu', 'Eggs'] },
  { name: 'Ghee', category: 'dairy', shelfLifeDays: 180, fragility: 0.05, kcal: 900, proteinG: 0, carbG: 0, fatG: 100, fiberG: 0, vitC: 0, vitA: 15, calcium: 0, iron: 0, potassium: 5, co2ePerKg: 3.2 },
  { name: 'Eggs', category: 'protein', shelfLifeDays: 21, fragility: 0.4, kcal: 155, proteinG: 13, carbG: 1.1, fatG: 11, fiberG: 0, vitC: 0, vitA: 10, calcium: 50, iron: 1.2, potassium: 130, co2ePerKg: 4.5, substitutes: ['Paneer', 'Tofu'] },
  { name: 'Chicken', category: 'protein', shelfLifeDays: 2, fragility: 0.85, kcal: 165, proteinG: 31, carbG: 0, fatG: 3.6, fiberG: 0, vitC: 0, vitA: 0, calcium: 15, iron: 1, potassium: 256, co2ePerKg: 6.9, substitutes: ['Tofu', 'Eggs', 'Paneer'] },
  { name: 'Mutton', category: 'protein', shelfLifeDays: 2, fragility: 0.85, kcal: 294, proteinG: 25.6, carbG: 0, fatG: 21.2, fiberG: 0, vitC: 0, vitA: 0, calcium: 14, iron: 2.9, potassium: 310, co2ePerKg: 39.2, substitutes: ['Chicken', 'Rajma'] },
  { name: 'Tofu', category: 'protein', shelfLifeDays: 7, fragility: 0.6, kcal: 76, proteinG: 8, carbG: 1.9, fatG: 4.8, fiberG: 0.3, vitC: 0, vitA: 0, calcium: 350, iron: 5.4, potassium: 121, co2ePerKg: 2.0, substitutes: ['Paneer', 'Eggs'] },
  { name: 'Masoor Dal', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 116, proteinG: 9, carbG: 20, fatG: 0.4, fiberG: 7.9, vitC: 0, vitA: 0, calcium: 19, iron: 3.3, potassium: 369, co2ePerKg: 0.9, substitutes: ['Moong Dal', 'Toor Dal'] },
  { name: 'Toor Dal', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 112, proteinG: 7.2, carbG: 19.6, fatG: 0.38, fiberG: 5.0, vitC: 0, vitA: 0, calcium: 28, iron: 2.3, potassium: 339, co2ePerKg: 0.8, substitutes: ['Masoor Dal', 'Moong Dal'] },
  { name: 'Moong Dal', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 105, proteinG: 7.6, carbG: 18.1, fatG: 0.4, fiberG: 7.6, vitC: 0, vitA: 0, calcium: 32, iron: 1.9, potassium: 369, co2ePerKg: 0.7, substitutes: ['Masoor Dal', 'Toor Dal'] },
  { name: 'Chana', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 164, proteinG: 8.9, carbG: 27, fatG: 2.6, fiberG: 7.6, vitC: 0, vitA: 0, calcium: 49, iron: 2.9, potassium: 291, co2ePerKg: 0.84, substitutes: ['Rajma', 'Moong Dal'] },
  { name: 'Rajma', category: 'protein', shelfLifeDays: 365, fragility: 0.05, kcal: 127, proteinG: 8.7, carbG: 22.8, fatG: 0.5, fiberG: 6.4, vitC: 0, vitA: 0, calcium: 28, iron: 2.9, potassium: 405, co2ePerKg: 0.9, substitutes: ['Chana'] },
  { name: 'Chawal', category: 'grain', shelfLifeDays: 365, fragility: 0.08, kcal: 130, proteinG: 2.7, carbG: 28, fatG: 0.3, fiberG: 0.4, vitC: 0, vitA: 0, calcium: 10, iron: 0.2, potassium: 35, co2ePerKg: 2.7, avoid: ['diabetes'], substitute: 'Brown Rice', substitutes: ['Brown Rice', 'Oats'] },
  { name: 'Brown Rice', category: 'grain', shelfLifeDays: 180, fragility: 0.1, kcal: 111, proteinG: 2.6, carbG: 23, fatG: 0.9, fiberG: 1.8, vitC: 0, vitA: 0, calcium: 10, iron: 0.4, potassium: 43, co2ePerKg: 2.7, substitutes: ['Chawal', 'Oats'] },
  { name: 'Gehu Atta', category: 'grain', shelfLifeDays: 60, fragility: 0.12, kcal: 340, proteinG: 12, carbG: 71, fatG: 1.9, fiberG: 10.7, vitC: 0, vitA: 0, calcium: 34, iron: 3.6, potassium: 107, co2ePerKg: 1.2, avoid: ['celiac'], substitute: 'Jowar Atta', substitutes: ['Jowar Atta', 'Suji'] },
  { name: 'Jowar Atta', category: 'grain', shelfLifeDays: 60, fragility: 0.15, kcal: 329, proteinG: 10.4, carbG: 72.6, fatG: 1.7, fiberG: 6.3, vitC: 0, vitA: 0, calcium: 25, iron: 4.1, potassium: 350, co2ePerKg: 0.9, substitutes: ['Gehu Atta'] },
  { name: 'Oats', category: 'grain', shelfLifeDays: 365, fragility: 0.08, kcal: 389, proteinG: 17, carbG: 66, fatG: 7, fiberG: 10.6, vitC: 0, vitA: 0, calcium: 54, iron: 4.7, potassium: 429, co2ePerKg: 0.87, substitutes: ['Poha', 'Brown Rice'] },
  { name: 'Poha', category: 'grain', shelfLifeDays: 180, fragility: 0.08, kcal: 76, proteinG: 1.6, carbG: 17.1, fatG: 0.2, fiberG: 0.3, vitC: 0, vitA: 0, calcium: 6, iron: 8.8, potassium: 70, co2ePerKg: 1.5, substitutes: ['Oats', 'Suji'] },
  { name: 'Suji', category: 'grain', shelfLifeDays: 180, fragility: 0.1, kcal: 360, proteinG: 12.7, carbG: 73.9, fatG: 1.1, fiberG: 3.9, vitC: 0, vitA: 0, calcium: 17, iron: 3.6, potassium: 190, co2ePerKg: 1.3, avoid: ['celiac'], substitute: 'Jowar Atta', substitutes: ['Oats'] },
  { name: 'Mushroom', category: 'fungi', shelfLifeDays: 7, fragility: 0.7, kcal: 22, proteinG: 3.1, carbG: 3.3, fatG: 0.3, fiberG: 1, vitC: 0, vitA: 0, calcium: 3, iron: 0.5, potassium: 318, co2ePerKg: 0.9, substitutes: ['Paneer', 'Tofu'] },
];

const FOOD_MAP = new Map<string, FoodNutrient>();
FOOD_CATALOG.forEach((f) => FOOD_MAP.set(f.name.toLowerCase(), f));

const CLINICAL_RATIONALE: Record<string, string> = {
  hypertension: 'High sodium content conflicts with DASH targets; replaced with lower-sodium option.',
  diabetes: 'High glycemic load destabilizes blood glucose; replaced with low-GI alternative.',
  celiac: 'Contains gluten; replaced with certified gluten-free grain alternative.',
  lactose_intolerant: 'Contains lactose; replaced with a plant-based equivalent.',
};

// ============================================================================
// 2. 24 Authentic Recipe Templates
// ============================================================================

interface RecipeTemplate {
  id: string;
  name: string;
  base: { name: string; grams: number }[];
}

const TEMPLATES: RecipeTemplate[] = [
  { id: 'dal_tadka', name: 'Dal Tadka', base: [
    { name: 'Toor Dal', grams: 150 }, { name: 'Tamatar', grams: 100 },
    { name: 'Pyaaz', grams: 80 }, { name: 'Lehsun', grams: 15 },
    { name: 'Adrak', grams: 10 }, { name: 'Ghee', grams: 15 },
    { name: 'Chawal', grams: 120 },
  ]},
  { id: 'palak_paneer', name: 'Palak Paneer', base: [
    { name: 'Palak', grams: 200 }, { name: 'Paneer', grams: 150 },
    { name: 'Tamatar', grams: 80 }, { name: 'Pyaaz', grams: 60 },
    { name: 'Lehsun', grams: 15 }, { name: 'Adrak', grams: 10 },
    { name: 'Ghee', grams: 15 }, { name: 'Chawal', grams: 100 },
  ]},
  { id: 'aloo_gobi_sabzi', name: 'Aloo Gobi Sabzi', base: [
    { name: 'Aloo', grams: 200 }, { name: 'Tamatar', grams: 100 },
    { name: 'Pyaaz', grams: 80 }, { name: 'Lehsun', grams: 15 },
    { name: 'Hari Mirch', grams: 20 }, { name: 'Adrak', grams: 10 },
    { name: 'Gehu Atta', grams: 120 },
  ]},
  { id: 'rajma_chawal', name: 'Rajma Chawal', base: [
    { name: 'Rajma', grams: 150 }, { name: 'Tamatar', grams: 120 },
    { name: 'Pyaaz', grams: 100 }, { name: 'Lehsun', grams: 15 },
    { name: 'Adrak', grams: 15 }, { name: 'Chawal', grams: 150 },
    { name: 'Ghee', grams: 10 },
  ]},
  { id: 'moong_dal_khichdi', name: 'Moong Dal Khichdi', base: [
    { name: 'Moong Dal', grams: 100 }, { name: 'Chawal', grams: 100 },
    { name: 'Gajar', grams: 80 }, { name: 'Pyaaz', grams: 60 },
    { name: 'Adrak', grams: 10 }, { name: 'Ghee', grams: 20 },
  ]},
  { id: 'methi_paratha', name: 'Methi Paratha', base: [
    { name: 'Methi', grams: 100 }, { name: 'Gehu Atta', grams: 150 },
    { name: 'Pyaaz', grams: 60 }, { name: 'Dahi', grams: 80 },
    { name: 'Hari Mirch', grams: 15 }, { name: 'Lehsun', grams: 10 },
  ]},
  { id: 'egg_bhurji', name: 'Egg Bhurji', base: [
    { name: 'Eggs', grams: 180 }, { name: 'Tamatar', grams: 80 },
    { name: 'Pyaaz', grams: 70 }, { name: 'Hari Mirch', grams: 15 },
    { name: 'Adrak', grams: 10 }, { name: 'Gehu Atta', grams: 120 },
  ]},
  { id: 'poha_upma', name: 'Poha Upma', base: [
    { name: 'Poha', grams: 120 }, { name: 'Pyaaz', grams: 60 },
    { name: 'Tamatar', grams: 80 }, { name: 'Hari Mirch', grams: 10 },
    { name: 'Curry Leaves', grams: 5 }, { name: 'Dahi', grams: 80 },
  ]},
  { id: 'masoor_dal_soup', name: 'Masoor Dal Soup', base: [
    { name: 'Masoor Dal', grams: 120 }, { name: 'Tamatar', grams: 100 },
    { name: 'Spinach', grams: 80 }, { name: 'Pyaaz', grams: 80 },
    { name: 'Lehsun', grams: 15 }, { name: 'Adrak', grams: 10 },
  ]},
  { id: 'shakarkandi_chaat', name: 'Shakarkandi Chaat', base: [
    { name: 'Shakarkandi', grams: 200 }, { name: 'Tamatar', grams: 60 },
    { name: 'Pyaaz', grams: 40 }, { name: 'Hari Mirch', grams: 15 },
    { name: 'Lemon', grams: 30 }, { name: 'Dahi', grams: 80 },
  ]},
  { id: 'chicken_curry', name: 'Chicken Curry', base: [
    { name: 'Chicken', grams: 200 }, { name: 'Tamatar', grams: 150 },
    { name: 'Pyaaz', grams: 100 }, { name: 'Lehsun', grams: 20 },
    { name: 'Adrak', grams: 15 }, { name: 'Dahi', grams: 80 },
    { name: 'Chawal', grams: 120 },
  ]},
  { id: 'paneer_bhurji', name: 'Paneer Bhurji', base: [
    { name: 'Paneer', grams: 150 }, { name: 'Tamatar', grams: 80 },
    { name: 'Pyaaz', grams: 70 }, { name: 'Shimla Mirch', grams: 60 },
    { name: 'Adrak', grams: 10 }, { name: 'Gehu Atta', grams: 120 },
  ]},
  { id: 'chana_masala', name: 'Chana Masala', base: [
    { name: 'Chana', grams: 160 }, { name: 'Tamatar', grams: 120 },
    { name: 'Pyaaz', grams: 90 }, { name: 'Lehsun', grams: 15 },
    { name: 'Adrak', grams: 12 }, { name: 'Hari Mirch', grams: 10 },
    { name: 'Chawal', grams: 120 },
  ]},
  { id: 'gajar_beetroot_poriyal', name: 'Gajar Beetroot Poriyal', base: [
    { name: 'Gajar', grams: 120 }, { name: 'Beetroot', grams: 120 },
    { name: 'Curry Leaves', grams: 8 }, { name: 'Hari Mirch', grams: 15 },
    { name: 'Lemon', grams: 25 }, { name: 'Gehu Atta', grams: 100 },
  ]},
  { id: 'mushroom_kadai', name: 'Mushroom Kadai', base: [
    { name: 'Mushroom', grams: 180 }, { name: 'Shimla Mirch', grams: 80 },
    { name: 'Tamatar', grams: 100 }, { name: 'Pyaaz', grams: 80 },
    { name: 'Lehsun', grams: 15 }, { name: 'Adrak', grams: 12 },
    { name: 'Gehu Atta', grams: 120 },
  ]},
  { id: 'tofu_palak_saag', name: 'Tofu Palak Saag', base: [
    { name: 'Tofu', grams: 160 }, { name: 'Palak', grams: 180 },
    { name: 'Tamatar', grams: 80 }, { name: 'Pyaaz', grams: 60 },
    { name: 'Lehsun', grams: 15 }, { name: 'Adrak', grams: 10 },
    { name: 'Brown Rice', grams: 120 },
  ]},
  { id: 'savory_oats_khichdi', name: 'Savory Oats Khichdi', base: [
    { name: 'Oats', grams: 100 }, { name: 'Moong Dal', grams: 80 },
    { name: 'Gajar', grams: 60 }, { name: 'Tamatar', grams: 70 },
    { name: 'Adrak', grams: 10 }, { name: 'Ghee', grams: 15 },
  ]},
  { id: 'suji_upma', name: 'Suji Upma', base: [
    { name: 'Suji', grams: 120 }, { name: 'Gajar', grams: 60 },
    { name: 'Pyaaz', grams: 60 }, { name: 'Hari Mirch', grams: 10 },
    { name: 'Curry Leaves', grams: 6 }, { name: 'Ghee', grams: 15 },
  ]},
  { id: 'mutton_rogan_josh', name: 'Mutton Rogan Josh', base: [
    { name: 'Mutton', grams: 220 }, { name: 'Pyaaz', grams: 110 },
    { name: 'Tamatar', grams: 120 }, { name: 'Dahi', grams: 90 },
    { name: 'Lehsun', grams: 20 }, { name: 'Adrak', grams: 15 },
    { name: 'Chawal', grams: 130 },
  ]},
  { id: 'mooli_paratha', name: 'Mooli Paratha', base: [
    { name: 'Radish', grams: 150 }, { name: 'Gehu Atta', grams: 140 },
    { name: 'Hari Mirch', grams: 15 }, { name: 'Adrak', grams: 10 },
    { name: 'Dahi', grams: 80 }, { name: 'Ghee', grams: 10 },
  ]},
  { id: 'jowar_roti_shakarkandi', name: 'Jowar Roti with Shakarkandi Sabzi', base: [
    { name: 'Jowar Atta', grams: 140 }, { name: 'Shakarkandi', grams: 150 },
    { name: 'Tamatar', grams: 80 }, { name: 'Pyaaz', grams: 50 },
    { name: 'Hari Mirch', grams: 15 }, { name: 'Curry Leaves', grams: 5 },
  ]},
  { id: 'curd_rice', name: 'Curd Rice (Daddojanam)', base: [
    { name: 'Chawal', grams: 150 }, { name: 'Dahi', grams: 150 },
    { name: 'Curry Leaves', grams: 8 }, { name: 'Adrak', grams: 10 },
    { name: 'Hari Mirch', grams: 10 }, { name: 'Ghee', grams: 10 },
  ]},
  { id: 'masala_egg_curry', name: 'Masala Egg Curry', base: [
    { name: 'Eggs', grams: 180 }, { name: 'Tamatar', grams: 110 },
    { name: 'Pyaaz', grams: 90 }, { name: 'Lehsun', grams: 15 },
    { name: 'Adrak', grams: 12 }, { name: 'Chawal', grams: 130 },
  ]},
  { id: 'sweet_potato_spinach_hash', name: 'Sweet Potato & Spinach Hash', base: [
    { name: 'Shakarkandi', grams: 180 }, { name: 'Spinach', grams: 120 },
    { name: 'Pyaaz', grams: 60 }, { name: 'Hari Mirch', grams: 15 },
    { name: 'Lemon', grams: 25 }, { name: 'Ghee', grams: 10 },
  ]},
];

// ============================================================================
// 3. User Preferences & RDA Computation
// ============================================================================

interface RDAValues {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  fiberG: number;
  vitC: number;
  calcium: number;
  iron: number;
  potassium: number;
  sodium: number;
}

function calculateRDA(prefs?: any): RDAValues {
  const weight = prefs?.weight_kg ?? 68;
  const height = prefs?.height_cm ?? 170;
  const age = prefs?.age ?? 28;
  const sex = prefs?.sex ?? 'male';
  const activity = prefs?.activity_level ?? 'moderate';
  const conditions: string[] = prefs?.conditions ?? [];

  // Mifflin-St Jeor BMR
  const bmrBase = 10 * weight + 6.25 * height - 5 * age;
  const bmr = sex === 'male' ? bmrBase + 5 : bmrBase - 161;
  const activityFactors: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = Math.round(bmr * (activityFactors[activity] ?? 1.55));

  let proteinG = Math.round(weight * (activity === 'sedentary' ? 0.8 : activity === 'light' ? 1.0 : 1.2));
  let fatG = Math.round((tdee * 0.3) / 9);
  let carbG = Math.round((tdee * 0.45) / 4);
  let fiberG = age > 50 ? 28 : 30;
  let vitC = sex === 'male' ? 90 : 75;
  let calcium = age > 50 ? 1200 : 1000;
  let iron = sex === 'male' ? 8 : (age > 50 ? 8 : 18);
  let potassium = 3400;
  let sodium = 2300;

  if (conditions.includes('hypertension')) {
    sodium = 1500;
    potassium = 4700;
  }
  if (conditions.includes('diabetes')) {
    carbG = Math.round((tdee * 0.38) / 4);
    fiberG = Math.max(fiberG, 35);
  }

  return { kcal: tdee, proteinG, carbG, fatG, fiberG, vitC, calcium, iron, potassium, sodium };
}

// ============================================================================
// 4. Genome Representation & Substitution Engine
// ============================================================================

interface IngredientChoice {
  originalName: string;
  baseGrams: number;
  candidateNames: string[]; // [0: original/base, 1..N: substitutes]
  candidateReasons: (string | null)[];
  candidateRationales: (string | null)[];
}

interface Gene {
  candidateIndex: number;
  portionMultiplier: number; // [0.5, 2.0]
}

interface Chromosome {
  genes: Gene[];
  objectives: [number, number, number]; // [f1: wasteScore, f2: rdaScore, f3: completeness]
  rank: number;
  crowdingDistance: number;
}

function buildTemplateIngredientChoices(
  template: RecipeTemplate,
  conditions: string[]
): IngredientChoice[] {
  return template.base.map((ing) => {
    const original = ing.name;
    const food = FOOD_MAP.get(original.toLowerCase());

    const candidateNames = [original];
    const candidateReasons: (string | null)[] = [null];
    const candidateRationales: (string | null)[] = [null];

    if (food) {
      // 1. Mandatory Clinical Contraindication Swap
      if (food.avoid && food.substitute) {
        const contra = food.avoid.find((c) => conditions.includes(c));
        if (contra) {
          candidateNames.push(food.substitute);
          candidateReasons.push(contra);
          candidateRationales.push(CLINICAL_RATIONALE[contra] || 'Clinical condition adjustment.');
        }
      }

      // 2. Additional culinary substitutes
      if (food.substitutes) {
        for (const sub of food.substitutes) {
          if (!candidateNames.includes(sub)) {
            candidateNames.push(sub);
            candidateReasons.push('culinary_variation');
            candidateRationales.push(`Flavor-compatible swap for ${original}.`);
          }
        }
      }
    }

    return {
      originalName: original,
      baseGrams: ing.grams,
      candidateNames,
      candidateReasons,
      candidateRationales,
    };
  });
}

// ============================================================================
// 5. Objective Functions Evaluation (f1, f2, f3)
// ============================================================================

interface EvaluatedRecipe {
  ingredients: {
    name: string;
    grams: number;
    originalName: string;
    substituted: boolean;
    reason?: string;
    rationale?: string;
  }[];
  nutrition: {
    kcal: number;
    proteinG: number;
    carbG: number;
    fatG: number;
    fiberG: number;
    vitC: number;
    vitA: number;
    calcium: number;
    iron: number;
    potassium: number;
    co2eKg: number;
  };
  missing: string[];
  f1_waste: number;
  f2_rda: number;
  f3_completeness: number;
}

function evaluateChromosome(
  genes: Gene[],
  choices: IngredientChoice[],
  pantryMap: Map<string, { grams: number; daysLeft: number; freshness: number }>,
  rda: RDAValues
): EvaluatedRecipe {
  const ingredients: EvaluatedRecipe['ingredients'] = [];
  const nutrition = {
    kcal: 0,
    proteinG: 0,
    carbG: 0,
    fatG: 0,
    fiberG: 0,
    vitC: 0,
    vitA: 0,
    calcium: 0,
    iron: 0,
    potassium: 0,
    co2eKg: 0,
  };

  let totalGrams = 0;
  let weightedWaste = 0;
  let ownedItems = 0;
  const missing: string[] = [];

  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    const gene = genes[i];

    const cIdx = Math.min(gene.candidateIndex, choice.candidateNames.length - 1);
    const selectedName = choice.candidateNames[cIdx];
    const actualGrams = Math.round(choice.baseGrams * gene.portionMultiplier);

    const isSub = cIdx > 0;
    ingredients.push({
      name: selectedName,
      grams: actualGrams,
      originalName: choice.originalName,
      substituted: isSub,
      reason: isSub ? (choice.candidateReasons[cIdx] ?? undefined) : undefined,
      rationale: isSub ? (choice.candidateRationales[cIdx] ?? undefined) : undefined,
    });

    const food = FOOD_MAP.get(selectedName.toLowerCase());
    if (food) {
      const ratio = actualGrams / 100;
      nutrition.kcal += food.kcal * ratio;
      nutrition.proteinG += food.proteinG * ratio;
      nutrition.carbG += food.carbG * ratio;
      nutrition.fatG += food.fatG * ratio;
      nutrition.fiberG += food.fiberG * ratio;
      nutrition.vitC += food.vitC * ratio;
      nutrition.vitA += food.vitA * ratio;
      nutrition.calcium += food.calcium * ratio;
      nutrition.iron += food.iron * ratio;
      nutrition.potassium += food.potassium * ratio;
      nutrition.co2eKg += (food.co2ePerKg * actualGrams) / 1000;
    }

    // Objective 1: Waste score computation
    const pItem = pantryMap.get(selectedName.toLowerCase());
    if (pItem) {
      // Days left urgency (0 to 14 days scale) and freshness decay
      const urgency = Math.max(0, 1 - pItem.daysLeft / 14) * 0.7 + (1 - pItem.freshness) * 0.3;
      weightedWaste += urgency * actualGrams;
    }
    totalGrams += actualGrams;

    // Objective 3: Completeness computation
    if (pItem && pItem.grams >= actualGrams * 0.4) {
      ownedItems++;
    } else {
      missing.push(selectedName);
    }
  }

  // f1: Waste Score (0..1)
  const f1_waste = totalGrams > 0 ? Math.min(1, weightedWaste / totalGrams) : 0;

  // f2: RDA Score (0..1)
  // Evaluates meal nutrition vs target meal fraction (0.34 of daily budget)
  const targetMealFraction = 0.34;
  const ratios = [
    nutrition.kcal / (rda.kcal * targetMealFraction || 1),
    nutrition.proteinG / (rda.proteinG * targetMealFraction || 1),
    nutrition.fiberG / (rda.fiberG * targetMealFraction || 1),
    nutrition.calcium / (rda.calcium * targetMealFraction || 1),
    nutrition.iron / (rda.iron * targetMealFraction || 1),
    nutrition.potassium / (rda.potassium * targetMealFraction || 1),
  ];
  const meanAbsErr = ratios.reduce((acc, r) => acc + Math.abs(r - 1.0), 0) / ratios.length;
  const f2_rda = Math.max(0, Math.min(1, 1 - meanAbsErr * 0.5));

  // f3: Completeness Score (0..1)
  const f3_completeness = choices.length > 0 ? ownedItems / choices.length : 0;

  return {
    ingredients,
    nutrition: {
      kcal: Math.round(nutrition.kcal),
      proteinG: +nutrition.proteinG.toFixed(1),
      carbG: +nutrition.carbG.toFixed(1),
      fatG: +nutrition.fatG.toFixed(1),
      fiberG: +nutrition.fiberG.toFixed(1),
      vitC: Math.round(nutrition.vitC),
      vitA: Math.round(nutrition.vitA),
      calcium: Math.round(nutrition.calcium),
      iron: +nutrition.iron.toFixed(1),
      potassium: Math.round(nutrition.potassium),
      co2eKg: +nutrition.co2eKg.toFixed(2),
    },
    missing,
    f1_waste: +f1_waste.toFixed(4),
    f2_rda: +f2_rda.toFixed(4),
    f3_completeness: +f3_completeness.toFixed(4),
  };
}

// ============================================================================
// 6. NSGA-II Core Algorithm (Deb et al., 2002)
// ============================================================================

// Dominates: Maximizing all 3 objectives
function dominates(p: Chromosome, q: Chromosome): boolean {
  let atLeastOneStrictlyBetter = false;
  for (let i = 0; i < 3; i++) {
    if (p.objectives[i] < q.objectives[i]) return false;
    if (p.objectives[i] > q.objectives[i]) atLeastOneStrictlyBetter = true;
  }
  return atLeastOneStrictlyBetter;
}

// Fast Non-Dominated Sorting
function fastNonDominatedSort(population: Chromosome[]): Chromosome[][] {
  const fronts: Chromosome[][] = [[]];
  const dominationCount = new Map<Chromosome, number>();
  const dominatedSet = new Map<Chromosome, Chromosome[]>();

  for (const p of population) {
    dominatedSet.set(p, []);
    dominationCount.set(p, 0);

    for (const q of population) {
      if (dominates(p, q)) {
        dominatedSet.get(p)!.push(q);
      } else if (dominates(q, p)) {
        dominationCount.set(p, dominationCount.get(p)! + 1);
      }
    }

    if (dominationCount.get(p) === 0) {
      p.rank = 1;
      fronts[0].push(p);
    }
  }

  let i = 0;
  while (fronts[i] && fronts[i].length > 0) {
    const nextFront: Chromosome[] = [];
    for (const p of fronts[i]) {
      for (const q of dominatedSet.get(p)!) {
        const count = dominationCount.get(q)! - 1;
        dominationCount.set(q, count);
        if (count === 0) {
          q.rank = i + 2;
          nextFront.push(q);
        }
      }
    }
    i++;
    if (nextFront.length > 0) {
      fronts.push(nextFront);
    }
  }

  return fronts;
}

// Crowding Distance Assignment
function assignCrowdingDistance(front: Chromosome[]): void {
  const l = front.length;
  if (l === 0) return;
  if (l <= 2) {
    front.forEach((ind) => (ind.crowdingDistance = Infinity));
    return;
  }

  front.forEach((ind) => (ind.crowdingDistance = 0));

  for (let m = 0; m < 3; m++) {
    front.sort((a, b) => a.objectives[m] - b.objectives[m]);
    front[0].crowdingDistance = Infinity;
    front[l - 1].crowdingDistance = Infinity;

    const range = front[l - 1].objectives[m] - front[0].objectives[m];
    if (range > 1e-6) {
      for (let i = 1; i < l - 1; i++) {
        if (front[i].crowdingDistance !== Infinity) {
          front[i].crowdingDistance +=
            (front[i + 1].objectives[m] - front[i - 1].objectives[m]) / range;
        }
      }
    }
  }
}

// Binary Tournament Selection
function binaryTournament(p1: Chromosome, p2: Chromosome): Chromosome {
  if (p1.rank < p2.rank) return p1;
  if (p2.rank < p1.rank) return p2;
  return p1.crowdingDistance >= p2.crowdingDistance ? p1 : p2;
}

// Simulated Binary Crossover (SBX, eta_c = 20) & Discrete Swap
function sbxCrossover(
  parent1: Chromosome,
  parent2: Chromosome,
  choices: IngredientChoice[],
  eta_c = 20
): [Chromosome, Chromosome] {
  const child1Genes: Gene[] = [];
  const child2Genes: Gene[] = [];

  for (let i = 0; i < parent1.genes.length; i++) {
    const g1 = parent1.genes[i];
    const g2 = parent2.genes[i];
    const numCandidates = choices[i].candidateNames.length;

    // 1. Continuous SBX for portion multiplier
    let m1 = g1.portionMultiplier;
    let m2 = g2.portionMultiplier;

    if (Math.random() < 0.9) {
      const u = Math.random();
      let beta: number;
      if (u <= 0.5) {
        beta = Math.pow(2 * u, 1 / (eta_c + 1));
      } else {
        beta = Math.pow(1 / (2 * (1 - u)), 1 / (eta_c + 1));
      }

      const c1 = 0.5 * ((1 + beta) * m1 + (1 - beta) * m2);
      const c2 = 0.5 * ((1 - beta) * m1 + (1 + beta) * m2);
      m1 = Math.max(0.5, Math.min(2.0, c1));
      m2 = Math.max(0.5, Math.min(2.0, c2));
    }

    // 2. Discrete uniform swap for candidate index
    let idx1 = g1.candidateIndex;
    let idx2 = g2.candidateIndex;
    if (Math.random() < 0.5) {
      const tmp = idx1;
      idx1 = idx2;
      idx2 = tmp;
    }

    child1Genes.push({
      candidateIndex: Math.min(idx1, numCandidates - 1),
      portionMultiplier: +m1.toFixed(3),
    });
    child2Genes.push({
      candidateIndex: Math.min(idx2, numCandidates - 1),
      portionMultiplier: +m2.toFixed(3),
    });
  }

  return [
    { genes: child1Genes, objectives: [0, 0, 0], rank: 0, crowdingDistance: 0 },
    { genes: child2Genes, objectives: [0, 0, 0], rank: 0, crowdingDistance: 0 },
  ];
}

// Polynomial Mutation (eta_m = 20) & Random Replacement Mutation
function polynomialMutation(
  ind: Chromosome,
  choices: IngredientChoice[],
  eta_m = 20
): Chromosome {
  const p_m = 1 / ind.genes.length;
  const mutatedGenes: Gene[] = [];

  for (let i = 0; i < ind.genes.length; i++) {
    const gene = ind.genes[i];
    let mult = gene.portionMultiplier;
    let cIdx = gene.candidateIndex;
    const maxIdx = choices[i].candidateNames.length - 1;

    // Continuous polynomial mutation for portionMultiplier in [0.5, 2.0]
    if (Math.random() < p_m) {
      const u = Math.random();
      let delta: number;
      if (u < 0.5) {
        delta = Math.pow(2 * u, 1 / (eta_m + 1)) - 1;
      } else {
        delta = 1 - Math.pow(2 * (1 - u), 1 / (eta_m + 1));
      }
      mult = Math.max(0.5, Math.min(2.0, mult + delta * 1.5));
    }

    // Discrete mutation for candidateIndex
    if (Math.random() < p_m && maxIdx > 0) {
      cIdx = Math.floor(Math.random() * (maxIdx + 1));
    }

    mutatedGenes.push({
      candidateIndex: cIdx,
      portionMultiplier: +mult.toFixed(3),
    });
  }

  return { genes: mutatedGenes, objectives: [0, 0, 0], rank: 0, crowdingDistance: 0 };
}

// Execute NSGA-II
function runNSGA2(
  template: RecipeTemplate,
  conditions: string[],
  pantryMap: Map<string, { grams: number; daysLeft: number; freshness: number }>,
  rda: RDAValues,
  popSize = 30,
  generations = 25
): EvaluatedRecipe[] {
  const choices = buildTemplateIngredientChoices(template, conditions);

  // Initialize random population P_0
  let population: Chromosome[] = [];
  for (let i = 0; i < popSize; i++) {
    const genes: Gene[] = choices.map((c) => ({
      candidateIndex: Math.floor(Math.random() * c.candidateNames.length),
      portionMultiplier: +(0.5 + Math.random() * 1.5).toFixed(3),
    }));

    const evalRes = evaluateChromosome(genes, choices, pantryMap, rda);
    population.push({
      genes,
      objectives: [evalRes.f1_waste, evalRes.f2_rda, evalRes.f3_completeness],
      rank: 0,
      crowdingDistance: 0,
    });
  }

  let fronts = fastNonDominatedSort(population);
  fronts.forEach(assignCrowdingDistance);

  // Evolution loop
  for (let gen = 0; gen < generations; gen++) {
    const offspring: Chromosome[] = [];

    while (offspring.length < popSize) {
      // Tournament selection
      const p1 = binaryTournament(
        population[Math.floor(Math.random() * popSize)],
        population[Math.floor(Math.random() * popSize)]
      );
      const p2 = binaryTournament(
        population[Math.floor(Math.random() * popSize)],
        population[Math.floor(Math.random() * popSize)]
      );

      // Crossover
      const [c1, c2] = sbxCrossover(p1, p2, choices);

      // Mutation
      const m1 = polynomialMutation(c1, choices);
      const m2 = polynomialMutation(c2, choices);

      // Evaluate
      const e1 = evaluateChromosome(m1.genes, choices, pantryMap, rda);
      m1.objectives = [e1.f1_waste, e1.f2_rda, e1.f3_completeness];
      offspring.push(m1);

      if (offspring.length < popSize) {
        const e2 = evaluateChromosome(m2.genes, choices, pantryMap, rda);
        m2.objectives = [e2.f1_waste, e2.f2_rda, e2.f3_completeness];
        offspring.push(m2);
      }
    }

    // Combine Parent + Offspring (Size: 2 * popSize)
    const combined = [...population, ...offspring];
    fronts = fastNonDominatedSort(combined);

    const nextPopulation: Chromosome[] = [];
    for (const front of fronts) {
      assignCrowdingDistance(front);
      if (nextPopulation.length + front.length <= popSize) {
        nextPopulation.push(...front);
      } else {
        // Sort by crowding distance descending and fill remaining
        const remaining = popSize - nextPopulation.length;
        front.sort((a, b) => b.crowdingDistance - a.crowdingDistance);
        nextPopulation.push(...front.slice(0, remaining));
        break;
      }
    }

    population = nextPopulation;
  }

  // Extract Pareto Front (Rank 1)
  const finalFronts = fastNonDominatedSort(population);
  const paretoFront = finalFronts[0] ?? [];

  // Evaluate and convert to UI Recipe solutions
  const evaluated = paretoFront.map((ch) =>
    evaluateChromosome(ch.genes, choices, pantryMap, rda)
  );

  return evaluated;
}

// ============================================================================
// 7. Supabase Edge Function Request Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { templateId, pantryItems = [], userPreferences = {} } = body;

    // 1. Build Pantry Map
    const pantryMap = new Map<string, { grams: number; daysLeft: number; freshness: number }>();
    for (const item of pantryItems) {
      const name = (item.name || '').trim().toLowerCase();
      if (!name) continue;

      let daysLeft = 7;
      if (item.days_left !== undefined) {
        daysLeft = item.days_left;
      } else if (item.expires_at) {
        daysLeft = Math.max(0, Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 86400)));
      }

      const freshness = item.freshness_score ?? 0.8;
      // Convert standard units to approximate grams
      let grams = (item.quantity ?? 1) * 100;
      if (item.unit === 'kg') grams = (item.quantity ?? 1) * 1000;
      if (item.unit === 'g') grams = item.quantity ?? 100;
      if (item.unit === 'ml') grams = item.quantity ?? 100;

      pantryMap.set(name, { grams, daysLeft, freshness });
    }

    // 2. Select Template(s)
    let selectedTemplate: RecipeTemplate | undefined;
    if (templateId) {
      selectedTemplate = TEMPLATES.find(
        (t) => t.id === templateId || t.name.toLowerCase() === templateId.toLowerCase()
      );
    }
    if (!selectedTemplate) {
      // Pick best template based on pantry overlap
      let bestTpl = TEMPLATES[0];
      let maxOverlap = -1;
      for (const tpl of TEMPLATES) {
        let overlap = 0;
        for (const ing of tpl.base) {
          if (pantryMap.has(ing.name.toLowerCase())) overlap++;
        }
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestTpl = tpl;
        }
      }
      selectedTemplate = bestTpl;
    }

    // 3. Compute Clinical RDA
    const rda = calculateRDA(userPreferences);
    const conditions = userPreferences?.conditions || [];

    // 4. Run NSGA-II Multi-Objective Optimization
    const paretoSolutions = runNSGA2(selectedTemplate, conditions, pantryMap, rda, 30, 25);

    // 5. Categorize Pareto Front (Least Waste, Best Nutrition, Most Balanced)
    if (paretoSolutions.length === 0) {
      throw new Error('NSGA-II failed to converge on Pareto front.');
    }

    // Deduplicate solutions with similar objectives
    const uniqueSolutions: EvaluatedRecipe[] = [];
    for (const sol of paretoSolutions) {
      const exists = uniqueSolutions.some(
        (u) =>
          Math.abs(u.f1_waste - sol.f1_waste) < 0.05 &&
          Math.abs(u.f2_rda - sol.f2_rda) < 0.05 &&
          Math.abs(u.f3_completeness - sol.f3_completeness) < 0.05
      );
      if (!exists) uniqueSolutions.push(sol);
    }

    // Identify labeled champions
    let leastWasteIdx = 0;
    let bestNutritionIdx = 0;
    let mostBalancedIdx = 0;
    let minBalancedDist = Infinity;

    uniqueSolutions.forEach((sol, idx) => {
      if (sol.f1_waste > uniqueSolutions[leastWasteIdx].f1_waste) {
        leastWasteIdx = idx;
      }
      if (sol.f2_rda > uniqueSolutions[bestNutritionIdx].f2_rda) {
        bestNutritionIdx = idx;
      }
      // Distance to ideal (1, 1, 1)
      const dist = Math.sqrt(
        Math.pow(1 - sol.f1_waste, 2) +
        Math.pow(1 - sol.f2_rda, 2) +
        Math.pow(1 - sol.f3_completeness, 2)
      );
      if (dist < minBalancedDist) {
        minBalancedDist = dist;
        mostBalancedIdx = idx;
      }
    });

    const labeledResults = uniqueSolutions.slice(0, 8).map((sol, idx) => {
      let label: string = 'Pareto Optimal';
      if (idx === leastWasteIdx) label = 'Least Waste';
      else if (idx === bestNutritionIdx) label = 'Best Nutrition';
      else if (idx === mostBalancedIdx) label = 'Most Balanced';

      return {
        id: `nsga2-${selectedTemplate!.id}-${idx}`,
        label,
        name: selectedTemplate!.name,
        templateId: selectedTemplate!.id,
        objectives: {
          wasteScore: sol.f1_waste,
          rdaScore: sol.f2_rda,
          completeness: sol.f3_completeness,
        },
        ingredients: sol.ingredients,
        nutrition: sol.nutrition,
        missingIngredients: sol.missing,
      };
    });

    const executionTimeMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        templateName: selectedTemplate.name,
        templateId: selectedTemplate.id,
        generations: 25,
        populationSize: 30,
        executionTimeMs,
        solutionsCount: labeledResults.length,
        solutions: labeledResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'NSGA-II optimization failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
