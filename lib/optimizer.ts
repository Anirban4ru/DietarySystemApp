import { FoodItem, Condition } from './types';
import { FOOD_BY_NAME } from './foodCatalog';
import { RDA } from './rda';

export interface RecipeCandidate {
  name: string;
  ingredients: { name: string; grams: number }[];
  // per full recipe
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
  };
  co2eKg: number;
  // objectives
  wasteScore: number; // 0..1 higher = more waste rescued
  rdaScore: number; // 0..1 higher = better RDA compliance
  completeness: number; // 0..1 fraction of ingredients present in inventory
  missing: string[];
  substitutions: { from: string; to: string; reason: Condition }[];
  rank: number;
}

export interface OptimizerWeights {
  waste: number; // 0..1
  rda: number; // 0..1
  completeness: number; // 0..1
}

// Template recipes — ingredient lists scaled by grams.
// The optimizer selects templates, scales them, and scores against inventory + RDA.
const TEMPLATES: { name: string; base: { name: string; grams: number }[] }[] = [
  { name: 'Rescue Stir-Fry', base: [
    { name: 'Tofu', grams: 150 }, { name: 'Spinach', grams: 120 }, { name: 'Mushroom', grams: 100 },
    { name: 'Onion', grams: 80 }, { name: 'Garlic', grams: 15 }, { name: 'Brown Rice', grams: 80 },
  { name: 'Carrot', grams: 80 },
  ]},
  { name: 'Green Power Bowl', base: [
    { name: 'Kale', grams: 100 }, { name: 'Quinoa', grams: 90 }, { name: 'Avocado', grams: 80 },
    { name: 'Chickpeas', grams: 120 }, { name: 'Lemon', grams: 30 }, { name: 'Carrot', grams: 70 },
  ]},
  { name: 'Hearty Lentil Stew', base: [
    { name: 'Lentils', grams: 120 }, { name: 'Carrot', grams: 100 }, { name: 'Onion', grams: 90 },
    { name: 'Garlic', grams: 15 }, { name: 'Tomato', grams: 120 }, { name: 'Spinach', grams: 80 },
  ]},
  { name: 'Protein Scramble', base: [
    { name: 'Eggs', grams: 150 }, { name: 'Spinach', grams: 80 }, { name: 'Tomato', grams: 80 },
    { name: 'Onion', grams: 60 }, { name: 'Whole Wheat Bread', grams: 60 },
  ]},
  { name: 'Roasted Root Plate', base: [
    { name: 'Sweet Potato', grams: 200 }, { name: 'Beetroot', grams: 120 }, { name: 'Carrot', grams: 100 },
    { name: 'Onion', grams: 80 }, { name: 'Garlic', grams: 15 }, { name: 'Greek Yogurt', grams: 80 },
  ]},
  { name: 'Mediterranean Salad', base: [
    { name: 'Tomato', grams: 150 }, { name: 'Lettuce', grams: 100 }, { name: 'Onion', grams: 60 },
    { name: 'Lemon', grams: 30 }, { name: 'Chickpeas', grams: 120 }, { name: 'Avocado', grams: 70 },
  ]},
  { name: 'Chicken & Greens', base: [
    { name: 'Chicken Breast', grams: 150 }, { name: 'Kale', grams: 100 }, { name: 'Garlic', grams: 15 },
    { name: 'Sweet Potato', grams: 150 }, { name: 'Lemon', grams: 30 },
  ]},
  { name: 'Overnight Oats', base: [
    { name: 'Oats', grams: 80 }, { name: 'Milk', grams: 200 }, { name: 'Banana', grams: 120 },
    { name: 'Apple', grams: 100 },
  ]},
];

function sumNutrition(ingredients: { name: string; grams: number }[]) {
  const acc = { kcal: 0, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0, vitC: 0, vitA: 0, calcium: 0, iron: 0, potassium: 0, co2eKg: 0 };
  for (const ing of ingredients) {
    const f = FOOD_BY_NAME[ing.name.toLowerCase()];
    if (!f) continue;
    const r = ing.grams / 100;
    acc.kcal += f.kcal * r;
    acc.proteinG += f.proteinG * r;
    acc.carbG += f.carbG * r;
    acc.fatG += f.fatG * r;
    acc.fiberG += f.fiberG * r;
    acc.vitC += f.vitC * r;
    acc.vitA += f.vitA * r;
    acc.calcium += f.calcium * r;
    acc.iron += f.iron * r;
    acc.potassium += f.potassium * r;
    acc.co2eKg += (f.co2ePerKg * ing.grams) / 1000;
  }
  return acc;
}

// Apply clinical substitutions based on user conditions.
export function applySubstitutions(
  ingredients: { name: string; grams: number }[],
  conditions: Condition[],
): { ingredients: { name: string; grams: number }[]; substitutions: { from: string; to: string; reason: Condition }[] } {
  const subs: { from: string; to: string; reason: Condition }[] = [];
  const out = ingredients.map((ing) => {
    const f = FOOD_BY_NAME[ing.name.toLowerCase()];
    if (!f || !f.avoid) return ing;
    const triggered = f.avoid.find((c) => conditions.includes(c));
    if (!triggered || !f.substitute) return ing;
    subs.push({ from: ing.name, to: f.substitute, reason: triggered });
    return { ...ing, name: f.substitute };
  });
  return { ingredients: out, substitutions: subs };
}

function scoreRDA(nutrition: RecipeCandidate['nutrition'], rda: RDA): number {
  const ratios = [
    nutrition.kcal / rda.kcal,
    nutrition.proteinG / rda.proteinG,
    nutrition.fiberG / rda.fiberG,
    nutrition.calcium / rda.calcium,
    nutrition.iron / rda.iron,
    nutrition.potassium / rda.potassium,
  ];
  // ideal ~0.33 (one meal of three). Score peaks near 0.33, penalize over/under.
  const target = 0.34;
  const errs = ratios.map((r) => Math.abs(r - target));
  const meanErr = errs.reduce((a, b) => a + b, 0) / errs.length;
  return Math.max(0, Math.min(1, 1 - meanErr * 2));
}

function scoreWaste(ingredients: { name: string; grams: number }[], inventory: Map<string, { grams: number; daysLeft: number; freshness: number }>): number {
  let weighted = 0;
  let total = 0;
  for (const ing of ingredients) {
    const inv = inventory.get(ing.name.toLowerCase());
    if (!inv) continue;
    // urgency: less days left + lower freshness => higher rescue value
    const urgency = Math.max(0, 1 - inv.daysLeft / 48) * 0.7 + (1 - inv.freshness) * 0.3;
    weighted += urgency * ing.grams;
    total += ing.grams;
  }
  return total > 0 ? Math.min(1, weighted / total) : 0;
}

function scoreCompleteness(ingredients: { name: string; grams: number }[], inventory: Map<string, { grams: number }>): { score: number; missing: string[] } {
  let present = 0;
  const missing: string[] = [];
  for (const ing of ingredients) {
    const inv = inventory.get(ing.name.toLowerCase());
    if (inv && inv.grams >= ing.grams * 0.5) present++;
    else missing.push(ing.name);
  }
  return { score: ingredients.length ? present / ingredients.length : 0, missing };
}

// Non-dominated sort (NSGA-II core) for a small population.
function nonDominatedSort(pop: RecipeCandidate[], w: OptimizerWeights): RecipeCandidate[] {
  // scalarize for ranking but keep front structure
  const score = (c: RecipeCandidate) =>
    w.waste * c.wasteScore + w.rda * c.rdaScore + w.completeness * c.completeness;
  const front: RecipeCandidate[] = [];
  const rest = [...pop];
  while (rest.length) {
    // find non-dominated in rest
    const nd: RecipeCandidate[] = [];
    for (let i = 0; i < rest.length; i++) {
      const c = rest[i];
      const dominated = rest.some((d) => d !== c && dominates(d, c, w));
      if (!dominated) nd.push(c);
    }
    nd.forEach((n) => rest.splice(rest.indexOf(n), 1));
    front.push(...nd);
  }
  // assign ranks by front order
  let rank = 1;
  const sorted = front.sort((a, b) => score(b) - score(a));
  sorted.forEach((c, i) => {
    c.rank = i < Math.ceil(sorted.length / 2) ? 1 : 2;
  });
  return sorted;
}

function dominates(a: RecipeCandidate, b: RecipeCandidate, w: OptimizerWeights): boolean {
  const sa = w.waste * a.wasteScore + w.rda * a.rdaScore + w.completeness * a.completeness;
  const sb = w.waste * b.wasteScore + w.rda * b.rdaScore + w.completeness * b.completeness;
  return sa >= sb;
}

export function optimizeRecipes(
  inventory: Map<string, { grams: number; daysLeft: number; freshness: number }>,
  rda: RDA,
  conditions: Condition[],
  weights: OptimizerWeights,
): RecipeCandidate[] {
  const candidates: RecipeCandidate[] = TEMPLATES.map((tpl) => {
    const { ingredients: subbed, substitutions } = applySubstitutions(tpl.base, conditions);
    const nutrition = sumNutrition(subbed);
    const wasteScore = scoreWaste(subbed, inventory);
    const { score: completeness, missing } = scoreCompleteness(subbed, inventory);
    const rdaScore = scoreRDA(nutrition, rda);
    return {
      name: tpl.name,
      ingredients: subbed,
      nutrition,
      co2eKg: nutrition.co2eKg,
      wasteScore,
      rdaScore,
      completeness,
      missing,
      substitutions,
      rank: 0,
    };
  });

  return nonDominatedSort(candidates, weights);
}
