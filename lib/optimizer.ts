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

// Indian Recipe Templates — ingredient lists scaled by grams.
// The optimizer selects templates, scores against inventory + RDA.
const TEMPLATES: { name: string; base: { name: string; grams: number }[] }[] = [
  { name: 'Dal Tadka', base: [
    { name: 'Toor Dal', grams: 150 }, { name: 'Tamatar', grams: 100 },
    { name: 'Pyaaz', grams: 80 }, { name: 'Lehsun', grams: 15 },
    { name: 'Adrak', grams: 10 }, { name: 'Ghee', grams: 15 },
    { name: 'Chawal', grams: 120 },
  ]},
  { name: 'Palak Paneer', base: [
    { name: 'Palak', grams: 200 }, { name: 'Paneer', grams: 150 },
    { name: 'Tamatar', grams: 80 }, { name: 'Pyaaz', grams: 60 },
    { name: 'Lehsun', grams: 15 }, { name: 'Adrak', grams: 10 },
    { name: 'Ghee', grams: 15 }, { name: 'Chawal', grams: 100 },
  ]},
  { name: 'Aloo Gobi Sabzi', base: [
    { name: 'Aloo', grams: 200 }, { name: 'Tamatar', grams: 100 },
    { name: 'Pyaaz', grams: 80 }, { name: 'Lehsun', grams: 15 },
    { name: 'Hari Mirch', grams: 20 }, { name: 'Adrak', grams: 10 },
    { name: 'Gehu Atta', grams: 120 },
  ]},
  { name: 'Rajma Chawal', base: [
    { name: 'Rajma', grams: 150 }, { name: 'Tamatar', grams: 120 },
    { name: 'Pyaaz', grams: 100 }, { name: 'Lehsun', grams: 15 },
    { name: 'Adrak', grams: 15 }, { name: 'Chawal', grams: 150 },
    { name: 'Ghee', grams: 10 },
  ]},
  { name: 'Moong Dal Khichdi', base: [
    { name: 'Moong Dal', grams: 100 }, { name: 'Chawal', grams: 100 },
    { name: 'Gajar', grams: 80 }, { name: 'Pyaaz', grams: 60 },
    { name: 'Adrak', grams: 10 }, { name: 'Ghee', grams: 20 },
  ]},
  { name: 'Methi Paratha', base: [
    { name: 'Methi', grams: 100 }, { name: 'Gehu Atta', grams: 150 },
    { name: 'Pyaaz', grams: 60 }, { name: 'Dahi', grams: 80 },
    { name: 'Hari Mirch', grams: 15 }, { name: 'Lehsun', grams: 10 },
  ]},
  { name: 'Egg Bhurji', base: [
    { name: 'Eggs', grams: 180 }, { name: 'Tamatar', grams: 80 },
    { name: 'Pyaaz', grams: 70 }, { name: 'Hari Mirch', grams: 15 },
    { name: 'Adrak', grams: 10 }, { name: 'Gehu Atta', grams: 120 },
  ]},
  { name: 'Poha Upma', base: [
    { name: 'Poha', grams: 120 }, { name: 'Pyaaz', grams: 60 },
    { name: 'Tamatar', grams: 80 }, { name: 'Hari Mirch', grams: 10 },
    { name: 'Curry Leaves', grams: 5 }, { name: 'Dahi', grams: 80 },
  ]},
  { name: 'Masoor Dal Soup', base: [
    { name: 'Masoor Dal', grams: 120 }, { name: 'Tamatar', grams: 100 },
    { name: 'Spinach', grams: 80 }, { name: 'Pyaaz', grams: 80 },
    { name: 'Lehsun', grams: 15 }, { name: 'Adrak', grams: 10 },
  ]},
  { name: 'Shakarkandi Chaat', base: [
    { name: 'Shakarkandi', grams: 200 }, { name: 'Tamatar', grams: 60 },
    { name: 'Pyaaz', grams: 40 }, { name: 'Hari Mirch', grams: 15 },
    { name: 'Lemon', grams: 30 }, { name: 'Dahi', grams: 80 },
  ]},
  { name: 'Chicken Curry', base: [
    { name: 'Chicken', grams: 200 }, { name: 'Tamatar', grams: 150 },
    { name: 'Pyaaz', grams: 100 }, { name: 'Lehsun', grams: 20 },
    { name: 'Adrak', grams: 15 }, { name: 'Dahi', grams: 80 },
    { name: 'Chawal', grams: 120 },
  ]},
  { name: 'Paneer Bhurji', base: [
    { name: 'Paneer', grams: 150 }, { name: 'Tamatar', grams: 80 },
    { name: 'Pyaaz', grams: 70 }, { name: 'Shimla Mirch', grams: 60 },
    { name: 'Adrak', grams: 10 }, { name: 'Gehu Atta', grams: 120 },
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
  const fronts: RecipeCandidate[][] = [];
  let rest = [...pop];
  let rank = 1;
  
  while (rest.length > 0) {
    const front: RecipeCandidate[] = [];
    for (let i = 0; i < rest.length; i++) {
      const c = rest[i];
      const dominated = rest.some(d => d !== c && dominates(d, c, w));
      if (!dominated) {
        c.rank = rank;
        front.push(c);
      }
    }
    
    assignCrowdingDistance(front);
    front.sort((a: any, b: any) => b.crowdingDistance - a.crowdingDistance);
    
    fronts.push(front);
    front.forEach((n) => rest.splice(rest.indexOf(n), 1));
    rank++;
  }
  
  return fronts.flat();
}

function assignCrowdingDistance(front: RecipeCandidate[]) {
  if (front.length <= 2) {
    front.forEach((f: any) => f.crowdingDistance = Infinity);
    return;
  }
  front.forEach((f: any) => f.crowdingDistance = 0);
  const objs = ['wasteScore', 'rdaScore', 'completeness'] as const;
  for (const obj of objs) {
    front.sort((a, b) => a[obj] - b[obj]);
    (front[0] as any).crowdingDistance = Infinity;
    (front[front.length - 1] as any).crowdingDistance = Infinity;
    const range = front[front.length - 1][obj] - front[0][obj];
    if (range === 0) continue;
    for (let i = 1; i < front.length - 1; i++) {
      (front[i] as any).crowdingDistance += (front[i + 1][obj] - front[i - 1][obj]) / range;
    }
  }
}

function dominates(a: RecipeCandidate, b: RecipeCandidate, w: OptimizerWeights): boolean {
  const wA = a.wasteScore * w.waste, rA = a.rdaScore * w.rda, cA = a.completeness * w.completeness;
  const wB = b.wasteScore * w.waste, rB = b.rdaScore * w.rda, cB = b.completeness * w.completeness;
  return (wA >= wB && rA >= rB && cA >= cB) && (wA > wB || rA > rB || cA > cB);
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
