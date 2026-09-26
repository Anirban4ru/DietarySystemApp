import { FoodItem, Condition, DisposalRow, InventoryRow } from './types';
import { FOOD_BY_NAME } from './foodCatalog';

// Feature 8: Food storage tips per item
export const STORAGE_TIPS: Record<string, string> = {
  spinach: 'Store unwashed in a damp paper towel inside a sealed bag. Crisper drawer, 2-5 days.',
  lettuce: 'Wrap in paper towels to absorb moisture. Store in crisper drawer. Do not freeze.',
  kale: 'Store in an airtight bag with a paper towel. Keeps 1-2 weeks. Freeze for long-term.',
  arugula: 'Keep cold and dry in a sealed container. Use within 3-5 days for best flavor.',
  carrot: 'Remove green tops. Store in a plastic bag in crisper. Can last 3-4 weeks.',
  potato: 'Store in a cool, dark, ventilated place. Never refrigerate — turns starch to sugar.',
  beetroot: 'Cut tops off, store roots in plastic bag in crisper. Keeps 2-3 weeks.',
  'sweet potato': 'Store in a cool, dark, ventilated spot. Do not refrigerate. Keeps 3-5 weeks.',
  banana: 'Keep at room temperature away from other fruit (ethylene gas). Refrigerate when ripe.',
  apple: 'Refrigerate in crisper drawer. Keeps 3-4 weeks. Keep away from strong odors.',
  tomato: 'Store at room temperature stem-down. Never refrigerate — kills flavor and texture.',
  avocado: 'Ripen at room temperature. Refrigerate once ripe to extend 2-3 days.',
  lemon: 'Refrigerate in a sealed bag. Keeps 3-4 weeks. Room temp for juicing.',
  milk: 'Keep refrigerated at 4°C or below. Store on a shelf, not the door.',
  'greek yogurt': 'Keep refrigerated. Do not freeze. Use within 1 week of opening for best quality.',
  cheddar: 'Wrap in wax paper, then plastic. Refrigerate. Keeps 3-4 weeks unopened.',
  'chicken breast': 'Refrigerate 1-2 days max. Freeze for longer storage. Thaw in refrigerator.',
  eggs: 'Refrigerate in original carton. Keeps 3-5 weeks. Do not wash before storing.',
  tofu: 'Store in water in a sealed container. Refrigerate. Use within 3-5 days of opening.',
  lentils: 'Store in airtight container in a cool, dry place. Keeps up to 1 year.',
  chickpeas: 'Store in airtight container. Dry keeps 1+ years. Canned keeps 2-3 years.',
  salmon: 'Refrigerate 1-2 days max. Keep on ice if possible. Freeze for longer storage.',
  'brown rice': 'Store in airtight container. Keeps 6 months. Refrigerate to extend shelf life.',
  quinoa: 'Store in airtight container in a cool, dry place. Keeps up to 2 years.',
  oats: 'Store in airtight container. Keeps 1-2 years. Keep dry.',
  'whole wheat bread': 'Store at room temperature in a bread box. Freeze for long-term. Never refrigerate.',
  onion: 'Store in a cool, dark, ventilated place. Keep away from potatoes. Keeps 1-2 months.',
  garlic: 'Store in a cool, dry, ventilated place. Do not refrigerate. Keeps 3-5 months.',
  mushroom: 'Store in a paper bag in the refrigerator. Never in plastic. Use within 5-7 days.',
};

export function getStorageTip(name: string): string {
  return STORAGE_TIPS[name.toLowerCase()] ?? 'Store in a cool, dry place. Check regularly for signs of spoilage.';
}

// Feature 14: Food pairing / flavor engine
export const PAIRINGS: Record<string, string[]> = {
  spinach: ['garlic', 'lemon', 'olive oil', 'chickpeas', 'egg'],
  lettuce: ['tomato', 'avocado', 'lemon', 'chickpeas'],
  kale: ['lemon', 'garlic', 'avocado', 'quinoa', 'chickpeas'],
  carrot: ['ginger', 'honey', 'lentil', 'onion', 'sweet potato'],
  potato: ['onion', 'garlic', 'rosemary', 'carrot'],
  'sweet potato': ['cinnamon', 'black bean', 'kale', 'chickpea'],
  banana: ['oats', 'peanut butter', 'milk', 'cinnamon'],
  apple: ['cinnamon', 'oats', 'spinach', 'walnut'],
  tomato: ['basil', 'onion', 'garlic', 'mozzarella', 'lettuce'],
  avocado: ['lemon', 'tomato', 'lettuce', 'chickpea'],
  lemon: ['garlic', 'kale', 'spinach', 'avocado', 'salmon'],
  milk: ['oats', 'banana', 'egg'],
  'greek yogurt': ['honey', 'banana', 'oats', 'apple'],
  'chicken breast': ['garlic', 'lemon', 'sweet potato', 'kale'],
  eggs: ['spinach', 'tomato', 'onion', 'mushroom', 'bread'],
  tofu: ['garlic', 'ginger', 'spinach', 'mushroom', 'rice'],
  lentils: ['carrot', 'onion', 'garlic', 'tomato', 'spinach'],
  chickpeas: ['lemon', 'garlic', 'tomato', 'avocado', 'quinoa'],
  salmon: ['lemon', 'garlic', 'kale', 'sweet potato'],
  'brown rice': ['tofu', 'vegetables', 'garlic', 'ginger'],
  quinoa: ['chickpeas', 'avocado', 'kale', 'lemon'],
  oats: ['banana', 'apple', 'milk', 'cinnamon'],
  'whole wheat bread': ['egg', 'avocado', 'tomato'],
  onion: ['garlic', 'carrot', 'tomato', 'potato'],
  garlic: ['onion', 'tomato', 'spinach', 'ginger'],
  mushroom: ['garlic', 'onion', 'spinach', 'rice'],
};

export function getPairings(name: string): string[] {
  return PAIRINGS[name.toLowerCase()] ?? [];
}

// Feature 10: Carbon footprint comparison
export const AVG_HOUSEHOLD_CO2E_WEEK = 8.0; // kg CO2e/week from food waste for average household (FAO)
export const AVG_HOUSEHOLD_MEALS_WEEK = 14;

export function compareHousehold(userMeals: number, userCo2e: number): {
  userRate: number;
  avgRate: number;
  pctBetter: number;
} {
  const userRate = userMeals > 0 ? userCo2e / userMeals : 0;
  const avgRate = AVG_HOUSEHOLD_CO2E_WEEK / AVG_HOUSEHOLD_MEALS_WEEK;
  const pctBetter = avgRate > 0 ? Math.round(((avgRate - userRate) / avgRate) * 100) : 0;
  return { userRate: +userRate.toFixed(2), avgRate: +avgRate.toFixed(2), pctBetter: Math.max(0, pctBetter) };
}

// Feature 15: Achievement levels + XP system
export interface Level {
  level: number;
  title: string;
  xpThreshold: number;
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Novice', xpThreshold: 0 },
  { level: 2, title: 'Apprentice', xpThreshold: 50 },
  { level: 3, title: 'Practitioner', xpThreshold: 150 },
  { level: 4, title: 'Steward', xpThreshold: 350 },
  { level: 5, title: 'Guardian', xpThreshold: 700 },
  { level: 6, title: 'Champion', xpThreshold: 1200 },
  { level: 7, title: 'Legend', xpThreshold: 2000 },
];

export function xpForMeal(co2e: number): number {
  return Math.max(10, Math.round(co2e * 15));
}

export function xpForConsumed(co2e: number): number {
  return Math.max(5, Math.round(co2e * 10));
}

export function computeLevel(totalXp: number): { current: Level; next: Level | null; progress: number } {
  let current = LEVELS[0];
  let next: Level | null = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].xpThreshold) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }
  const progress = next ? (totalXp - current.xpThreshold) / (next.xpThreshold - current.xpThreshold) : 1;
  return { current, next, progress: Math.min(1, Math.max(0, progress)) };
}

// Feature 7: Weekly waste reduction goals
export interface WeeklyGoal {
  targetMeals: number;
  targetCo2e: number;
  mealsThisWeek: number;
  co2eThisWeek: number;
  progress: number;
  co2eProgress: number;
}

export function computeWeeklyGoal(log: { event_type: string; co2e_kg: number; created_at: string }[], targetMeals = 5, targetCo2e = 10): WeeklyGoal {
  const now = Date.now();
  const week = 7 * 86400000;
  const thisWeek = log.filter((e) => e.event_type === 'rescue_meal' && now - new Date(e.created_at).getTime() < week);
  const mealsThisWeek = thisWeek.length;
  const co2eThisWeek = thisWeek.reduce((s, e) => s + e.co2e_kg, 0);
  return {
    targetMeals,
    targetCo2e,
    mealsThisWeek,
    co2eThisWeek: +co2eThisWeek.toFixed(2),
    progress: Math.min(1, mealsThisWeek / targetMeals),
    co2eProgress: Math.min(1, co2eThisWeek / targetCo2e),
  };
}

// Feature 11: Expiry countdown timeline
export function expiryTimeline(daysLeft: number): { label: string; tone: 'danger' | 'warning' | 'success' | 'neutral' } {
  if (daysLeft <= 0) return { label: 'EXPIRED', tone: 'danger' };
  if (daysLeft <= 1) return { label: `${daysLeft}d — CRITICAL`, tone: 'danger' };
  if (daysLeft <= 3) return { label: `${daysLeft}d — URGENT`, tone: 'warning' };
  if (daysLeft <= 7) return { label: `${daysLeft}d — SOON`, tone: 'warning' };
  return { label: `${daysLeft}d — STABLE`, tone: 'success' };
}

// Feature 6.2: Waste-pattern-aware shopping suggestions
export interface WasteAwareShoppingSuggestion {
  foodName: string;
  category: string;
  disposalCount: number;
  primaryReason: string;
  advice: string;
  suggestedAction: 'reduce_qty' | 'freeze_early' | 'buy_smaller_pack' | 'substitute';
  suggestedSubstitute?: string;
}

export function computeWasteAwareShoppingSuggestions(
  disposals: DisposalRow[] = [],
  pantryItems: InventoryRow[] = []
): WasteAwareShoppingSuggestion[] {
  if (!disposals || disposals.length === 0) return [];

  const counts: Record<string, { count: number; category: string; reasons: Record<string, number> }> = {};
  for (const d of disposals) {
    const key = (d.item_name || '').trim().toLowerCase();
    if (!key) continue;
    if (!counts[key]) {
      counts[key] = { count: 0, category: d.category || 'other', reasons: {} };
    }
    counts[key].count += 1;
    const r = d.reason || 'expired';
    counts[key].reasons[r] = (counts[key].reasons[r] || 0) + 1;
  }

  const suggestions: WasteAwareShoppingSuggestion[] = [];

  for (const [name, data] of Object.entries(counts)) {
    if (data.count < 1) continue;

    const catalogItem = FOOD_BY_NAME[name];
    const substitute = catalogItem?.substitute;
    const fragility = catalogItem?.fragility ?? 0.5;

    let topReason = 'expired';
    let maxReasonCount = 0;
    for (const [r, count] of Object.entries(data.reasons)) {
      if (count > maxReasonCount) {
        maxReasonCount = count;
        topReason = r;
      }
    }

    const inPantry = pantryItems.find((p) => p.name.toLowerCase() === name);

    let advice = '';
    let action: WasteAwareShoppingSuggestion['suggestedAction'] = 'reduce_qty';

    if (inPantry && inPantry.quantity > 0) {
      advice = `Already have ${inPantry.quantity} ${inPantry.unit} in pantry. Consume existing supply first.`;
      action = 'reduce_qty';
    } else if (topReason === 'overpurchased') {
      advice = `Discarded ${data.count}x due to over-purchasing. Recommend single-meal packs.`;
      action = 'buy_smaller_pack';
    } else if (fragility > 0.7) {
      advice = `High perishability (${catalogItem?.shelfLifeDays ?? 4}d max). Discarded ${data.count}x. Buy 50% smaller portions or freeze immediately.`;
      action = 'freeze_early';
    } else if (substitute) {
      advice = `Frequently discarded. Consider longer shelf-life substitute: ${substitute}.`;
      action = 'substitute';
    } else {
      advice = `Discarded ${data.count}x recently (${topReason}). Plan recipes prior to buying.`;
      action = 'reduce_qty';
    }

    suggestions.push({
      foodName: catalogItem?.name ?? (name.charAt(0).toUpperCase() + name.slice(1)),
      category: data.category,
      disposalCount: data.count,
      primaryReason: topReason,
      advice,
      suggestedAction: action,
      suggestedSubstitute: substitute,
    });
  }

  return suggestions.sort((a, b) => b.disposalCount - a.disposalCount);
}

