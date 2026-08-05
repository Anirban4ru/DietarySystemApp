import { supabase } from './supabase';

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

export async function generateStrictRecipe(inventoryItems: { name: string, quantity: number, unit: string }[]): Promise<any> {
  return invokeGemini('generateStrictRecipe', { inventoryItems });
}

// Search for a meal/recipe by name using AI — returns full recipe details
export async function searchMealByName(mealName: string): Promise<{
  name: string;
  ingredients: { name: string; grams: number }[];
  instructions: string[];
  nutrition: { kcal: number; proteinG: number; carbG: number; fatG: number; fiberG: number; iron: number };
}> {
  return invokeGemini('searchMealByName', { mealName });
}

// Get meal name suggestions
export async function searchMealSuggestions(query: string): Promise<string[]> {
  try {
    return await invokeGemini('searchMealSuggestions', { query });
  } catch {
    return [];
  }
}

// Get rich food tip insights
export async function getTipInsight(foodName: string, daysRemaining: number): Promise<{
  recipes: string[];
  freshness: string;
  calories: string;
}> {
  try {
    return await invokeGemini('getTipInsight', { foodName, daysRemaining });
  } catch {
    return { recipes: [], freshness: '', calories: '' };
  }
}

// Search for food/grocery items using AI
export async function searchGroceryItems(query: string): Promise<{
  items: { name: string; category: string; emoji: string }[];
}> {
  try {
    return await invokeGemini('searchGroceryItems', { query });
  } catch {
    return { items: [] };
  }
}

export async function parseReceipt(base64Image: string): Promise<any> {
  return invokeGemini('parseReceipt', { base64Image });
}

// Parse natural language dictation into pantry items
export async function parseNaturalLanguagePantry(text: string): Promise<{name: string, quantity: number, unit: string}[]> {
  try {
    return await invokeGemini('parseNaturalLanguagePantry', { text });
  } catch {
    return [];
  }
}

export async function detectFoodItem(base64Image: string): Promise<{ name: string; freshness: number; confidence: number }> {
  return invokeGemini('detectFoodItem', { base64Image });
}
