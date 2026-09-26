/**
 * lib/optimizerClient.ts
 * Client wrapper for the server-side NSGA-II Multi-Objective Evolutionary Algorithm.
 * Calls `supabase/functions/nsga2-optimizer` on Deno Edge Runtime.
 * Includes local fallback to ensure offline resilience and instant execution.
 */

import { supabase } from './supabase';
import { InventoryRow, ProfileRow } from './types';
import { optimizeRecipes } from './optimizer';
import { computeRDA } from './rda';

export interface NSGA2Ingredient {
  name: string;
  grams: number;
  originalName: string;
  substituted: boolean;
  reason?: string;
  rationale?: string;
}

export interface NSGA2Nutrition {
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
}

export interface NSGA2Solution {
  id: string;
  label: 'Least Waste' | 'Best Nutrition' | 'Most Balanced' | 'Pareto Optimal' | string;
  name: string;
  templateId: string;
  objectives: {
    wasteScore: number;
    rdaScore: number;
    completeness: number;
  };
  ingredients: NSGA2Ingredient[];
  nutrition: NSGA2Nutrition;
  missingIngredients: string[];
}

export interface NSGA2OptimizerResponse {
  success: boolean;
  templateName: string;
  templateId: string;
  executionTimeMs: number;
  solutions: NSGA2Solution[];
  isFallback?: boolean;
  error?: string;
}

/**
 * Invokes the NSGA-II Multi-Objective Evolutionary Optimizer on Supabase Edge Functions.
 * Evaluates trade-offs across Food Waste (f1), Nutritional RDA (f2), and Pantry Completeness (f3).
 */
export async function optimizeRecipeWithNSGA2(params: {
  templateId?: string;
  pantryItems: InventoryRow[];
  profile?: ProfileRow;
}): Promise<NSGA2OptimizerResponse> {
  const { templateId, pantryItems, profile } = params;

  try {
    // 1. Format payload for edge function
    const formattedPantry = pantryItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      freshness_score: item.freshness_score,
      expires_at: item.expires_at,
    }));

    const userPreferences = profile
      ? {
          conditions: profile.conditions,
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          age: profile.age,
          sex: profile.sex,
          activity_level: profile.activity_level,
        }
      : undefined;

    // 2. Invoke Deno Edge Function
    const { data, error } = await supabase.functions.invoke('nsga2-optimizer', {
      body: {
        templateId,
        pantryItems: formattedPantry,
        userPreferences,
      },
    });

    if (error) {
      console.warn('NSGA-II Edge Function returned error, using local fallback:', error);
      return runLocalFallback(params);
    }

    if (data && data.success && Array.isArray(data.solutions) && data.solutions.length > 0) {
      return {
        success: true,
        templateName: data.templateName || 'Optimized Meal',
        templateId: data.templateId || templateId || 'custom',
        executionTimeMs: data.executionTimeMs || 0,
        solutions: data.solutions,
        isFallback: false,
      };
    }

    return runLocalFallback(params);
  } catch (err: any) {
    console.warn('NSGA-II client network error, using local fallback:', err);
    return runLocalFallback(params);
  }
}

/**
 * Offline / Local fallback using deterministic multi-objective evaluation in `lib/optimizer.ts`
 */
function runLocalFallback(params: {
  templateId?: string;
  pantryItems: InventoryRow[];
  profile?: ProfileRow;
}): NSGA2OptimizerResponse {
  const start = Date.now();
  const inventoryMap = new Map<string, { grams: number; daysLeft: number; freshness: number }>();

  for (const item of params.pantryItems) {
    const name = item.name.toLowerCase();
    const daysLeft = item.expires_at
      ? Math.max(0, Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 86400)))
      : 7;
    const grams = item.unit === 'kg' ? item.quantity * 1000 : item.quantity * 100;
    inventoryMap.set(name, { grams, daysLeft, freshness: item.freshness_score });
  }

  const defaultProfile: ProfileRow = params.profile ?? {
    id: 'guest',
    age: 28,
    sex: 'male',
    weight_kg: 70,
    height_cm: 172,
    activity_level: 'moderate',
    conditions: [],
    updated_at: new Date().toISOString(),
  };

  const rda = computeRDA(defaultProfile);
  const candidates = optimizeRecipes(inventoryMap, rda, defaultProfile.conditions, {
    waste: 0.35,
    rda: 0.35,
    completeness: 0.3,
  });

  const solutions: NSGA2Solution[] = candidates.slice(0, 5).map((c, idx) => {
    let label = 'Pareto Optimal';
    if (idx === 0) label = 'Least Waste';
    else if (idx === 1) label = 'Best Nutrition';
    else if (idx === 2) label = 'Most Balanced';

    return {
      id: `local-sol-${idx}`,
      label,
      name: c.name,
      templateId: params.templateId || 'default',
      objectives: {
        wasteScore: +c.wasteScore.toFixed(3),
        rdaScore: +c.rdaScore.toFixed(3),
        completeness: +c.completeness.toFixed(3),
      },
      ingredients: c.ingredients.map((ing) => ({
        name: ing.name,
        grams: ing.grams,
        originalName: ing.name,
        substituted: c.substitutions.some((s) => s.to.toLowerCase() === ing.name.toLowerCase()),
      })),
      nutrition: {
        ...c.nutrition,
        co2eKg: +c.co2eKg.toFixed(2),
      },
      missingIngredients: c.missing,
    };
  });

  return {
    success: true,
    templateName: solutions[0]?.name || 'Balanced Meal',
    templateId: params.templateId || 'default',
    executionTimeMs: Date.now() - start,
    solutions,
    isFallback: true,
  };
}
