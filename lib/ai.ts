import { supabase } from './supabase';
import { FOOD_BY_NAME, FOOD_CATALOG } from './foodCatalog';
import {
  validateAI,
  RecipeSchema,
  MealSuggestionsSchema,
  TipInsightSchema,
  GroceryItemsSchema,
  ReceiptItemsSchema,
  NaturalLanguagePantrySchema,
  DetectedFoodSchema,
} from './validators';

async function invokeGemini(action: string, payload: any) {
  const { data, error } = await supabase.functions.invoke('gemini-api', {
    body: { action, payload }
  });
  
  if (error) {
    console.error('Edge Function Error:', error);
    throw new Error(error.message || 'Failed to call AI');
  }

  if (data?.data) {
    try {
      return JSON.parse(data.data);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", data.data);
      throw new Error("AI returned invalid data format.");
    }
  }
  
  if (data?.error) {
    throw new Error(data.error);
  }
  
  throw new Error("Invalid response from Edge Function");
}

export async function generateStrictRecipe(
  inventoryItems: { name: string; quantity: number; unit: string }[]
) {
  const raw = await invokeGemini('generateStrictRecipe', { inventoryItems });
  return validateAI(RecipeSchema, raw);
}

export async function searchMealByName(mealName: string) {
  const raw = await invokeGemini('searchMealByName', { mealName });
  return validateAI(RecipeSchema, raw);
}

export async function searchMealSuggestions(query: string): Promise<string[]> {
  try {
    const raw = await invokeGemini('searchMealSuggestions', { query });
    return validateAI(MealSuggestionsSchema, raw);
  } catch {
    return [];
  }
}

export async function getTipInsight(
  foodName: string,
  daysRemaining: number
): Promise<{ recipes: string[]; freshness: string; calories: string }> {
  try {
    const raw = await invokeGemini('getTipInsight', { foodName, daysRemaining });
    return validateAI(TipInsightSchema, raw);
  } catch {
    return { recipes: [], freshness: '', calories: '' };
  }
}

export async function searchGroceryItems(
  query: string
): Promise<{ items: { name: string; category: string; emoji: string }[] }> {
  try {
    const raw = await invokeGemini('searchGroceryItems', { query });
    return validateAI(GroceryItemsSchema, raw);
  } catch {
    return { items: [] };
  }
}

export async function parseReceipt(base64Image: string) {
  const raw = await invokeGemini('parseReceipt', { base64Image });
  return validateAI(ReceiptItemsSchema, raw);
}

export async function parseNaturalLanguagePantry(
  text: string
): Promise<{ name: string; quantity: number; unit: string }[]> {
  try {
    const raw = await invokeGemini('parseNaturalLanguagePantry', { text });
    return validateAI(NaturalLanguagePantrySchema, raw);
  } catch {
    return [];
  }
}

export async function detectFoodItem(
  base64Image: string
): Promise<{ name: string; freshness: number; confidence: number }> {
  const raw = await invokeGemini('detectFoodItem', { base64Image });
  return validateAI(DetectedFoodSchema, raw);
}

/**
 * On-Device Freshness Inference
 * Uses the Nutritional Decay Scale (NDS) based on food category, shelf life,
 * and micronutrient fragility to infer freshness (0.0 to 1.0) offline without API latency.
 */
export function inferFreshnessOnDevice(
  foodName: string,
  daysSinceAdded: number = 0
): {
  freshness: number;
  confidence: number;
  shelfLifeDays: number;
  category: string;
} {
  const normalized = (foodName || '').trim().toLowerCase();

  let item = FOOD_BY_NAME[normalized];
  let confidence = 0.95;

  if (!item) {
    const found = FOOD_CATALOG.find((f) =>
      f.name.toLowerCase().includes(normalized) || normalized.includes(f.name.toLowerCase())
    );
    if (found) {
      item = found;
      confidence = 0.85;
    } else {
      confidence = 0.55;
    }
  }

  const shelfLifeDays = item ? item.shelfLifeDays : 7;
  const fragility = item ? item.fragility : 0.5;
  const category = item ? item.category : 'other';

  const elapsed = Math.max(0, daysSinceAdded);
  const remainingRatio = Math.max(0, (shelfLifeDays - elapsed) / shelfLifeDays);
  const decayCurve = Math.pow(remainingRatio, 1 + fragility * 0.4);
  const freshness = Math.max(0.05, Math.min(1.0, Math.round(decayCurve * 100) / 100));

  return {
    freshness,
    confidence,
    shelfLifeDays,
    category,
  };
}

