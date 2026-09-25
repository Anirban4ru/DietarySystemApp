/**
 * lib/validators.ts
 * Zod schemas for every AI JSON response.
 * Call validateAI<Schema>(schema, data) — on failure it throws a
 * user-friendly Error so the caller can show a toast and fall back gracefully.
 */
import { z } from 'zod';

// ── Schemas ─────────────────────────────────────────────────────────────────

export const NutritionSchema = z.object({
  kcal:     z.number(),
  proteinG: z.number(),
  carbG:    z.number(),
  fatG:     z.number(),
  fiberG:   z.number(),
  iron:     z.number(),
});

export const RecipeSchema = z.object({
  name:         z.string().min(1),
  ingredients:  z.array(z.object({ name: z.string(), grams: z.number() })).min(1),
  instructions: z.array(z.string()).min(1),
  nutrition:    NutritionSchema,
});

export const MealSuggestionsSchema = z.array(z.string()).min(1).max(10);

export const TipInsightSchema = z.object({
  recipes:   z.array(z.string()).min(1),
  freshness: z.string(),
  calories:  z.string(),
});

export const GroceryItemsSchema = z.object({
  items: z.array(z.object({
    name:     z.string(),
    category: z.string(),
    emoji:    z.string(),
  })),
});

export const ReceiptItemsSchema = z.object({
  items: z.array(z.object({
    name:     z.string(),
    quantity: z.number().default(1),
  })),
});

export const NaturalLanguagePantrySchema = z.array(z.object({
  name:     z.string(),
  quantity: z.number(),
  unit:     z.string(),
}));

export const DetectedFoodSchema = z.object({
  name:       z.string(),
  freshness:  z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

// ── Validator helper ─────────────────────────────────────────────────────────

export type InferSchema<T extends z.ZodTypeAny> = z.infer<T>;

/**
 * Parses and validates raw AI JSON output against a Zod schema.
 * @throws Error with user-friendly message on failure
 */
export function validateAI<T extends z.ZodTypeAny>(
  schema: T,
  raw: unknown
): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.warn('[AI Validator] Schema mismatch:', result.error.flatten());
    throw new Error('AI returned an unexpected response format. Please try again.');
  }
  return result.data;
}
