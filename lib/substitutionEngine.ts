import { Condition } from './types';
import { FOOD_BY_NAME } from './foodCatalog';

// Clinical Substitution Expert System.
// Deterministic rule engine that mirrors what the local SLM would produce.
// In production, WebLLM/Transformers.js would refine these with natural language;
// here we provide a fully-functional rule-based fallback so the app works today.

export interface SubstitutionResult {
  original: string;
  substitute: string;
  reason: Condition;
  rationale: string;
}

const RATIONALE: Record<Condition, string> = {
  hypertension: 'High sodium content conflicts with DASH targets; swapped for a low-sodium equivalent.',
  diabetes: 'High glycemic load destabilizes postprandial glucose; swapped for a lower-GI option.',
  celiac: 'Contains gluten; swapped for a gluten-free alternative.',
  lactose_intolerant: 'Contains lactose; swapped for a plant-based equivalent.',
};

export function findSubstitutions(ingredientNames: string[], conditions: Condition[]): SubstitutionResult[] {
  const results: SubstitutionResult[] = [];
  for (const name of ingredientNames) {
    const f = FOOD_BY_NAME[name.toLowerCase()];
    if (!f || !f.avoid || !f.substitute) continue;
    const triggered = f.avoid.find((c) => conditions.includes(c));
    if (!triggered) continue;
    results.push({
      original: name,
      substitute: f.substitute,
      reason: triggered,
      rationale: RATIONALE[triggered],
    });
  }
  return results;
}

// Validate a full ingredient list against conditions, returning safe list.
export function makeSafeIngredients(
  ingredients: { name: string; grams: number }[],
  conditions: Condition[],
): { ingredients: { name: string; grams: number }[]; swaps: SubstitutionResult[] } {
  const swaps: SubstitutionResult[] = [];
  const out = ingredients.map((ing) => {
    const f = FOOD_BY_NAME[ing.name.toLowerCase()];
    if (!f || !f.avoid) return ing;
    const triggered = f.avoid.find((c) => conditions.includes(c));
    if (!triggered || !f.substitute) return ing;
    swaps.push({ original: ing.name, substitute: f.substitute, reason: triggered, rationale: RATIONALE[triggered] });
    return { ...ing, name: f.substitute };
  });
  return { ingredients: out, swaps };
}
