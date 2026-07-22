import { ImpactLogRow, DisposalRow } from './types';

// CO2e constants
export const CO2E_PER_KG_WASTED = 2.5; // approx kg CO2e per kg food wasted (FAO)
export const MEAL_WEIGHT_KG = 0.4; // approx kg per rescue meal

export function co2eAvoidedForMeal(co2eKg: number): number {
  // rescued meal avoids the wasted-equivalent minus the cooking footprint
  return +(CO2E_PER_KG_WASTED * MEAL_WEIGHT_KG - co2eKg).toFixed(2);
}

export interface ImpactSummary {
  totalCo2eAvoided: number;
  mealsRescued: number;
  itemsConsumed: number;
  itemsDiscarded: number;
  streakDays: number;
  co2eByDay: { day: string; kg: number }[];
}

export function summarizeImpact(log: ImpactLogRow[]): ImpactSummary {
  let totalCo2eAvoided = 0;
  let mealsRescued = 0;
  let itemsConsumed = 0;
  let itemsDiscarded = 0;
  const byDay = new Map<string, number>();

  for (const e of log) {
    const day = new Date(e.created_at).toISOString().slice(0, 10);
    if (e.event_type === 'rescue_meal') {
      mealsRescued++;
      totalCo2eAvoided += e.co2e_kg;
    } else if (e.event_type === 'item_consumed') {
      itemsConsumed++;
      totalCo2eAvoided += e.co2e_kg;
    } else if (e.event_type === 'item_discarded') {
      itemsDiscarded++;
      totalCo2eAvoided -= e.co2e_kg;
    }
    byDay.set(day, (byDay.get(day) ?? 0) + e.co2e_kg);
  }

  const co2eByDay = [...byDay.entries()]
    .map(([day, kg]) => ({ day, kg }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // streak: consecutive days with at least one rescue_meal, counting back from today
  const rescueDays = new Set(
    log.filter((e) => e.event_type === 'rescue_meal').map((e) => new Date(e.created_at).toISOString().slice(0, 10)),
  );
  let streakDays = 0;
  const d = new Date();
  while (rescueDays.has(d.toISOString().slice(0, 10))) {
    streakDays++;
    d.setDate(d.getDate() - 1);
  }

  return {
    totalCo2eAvoided: +totalCo2eAvoided.toFixed(2),
    mealsRescued,
    itemsConsumed,
    itemsDiscarded,
    streakDays,
    co2eByDay,
  };
}

// Simple 7-day moving-average forecast of disposal rate to flag over-purchasing.
export function forecastDisposal(disposals: DisposalRow[]): { category: string; weeklyRate: number; trend: 'up' | 'down' | 'flat' }[] {
  const byCat = new Map<string, { count: number; recent: number; older: number }>();
  const now = Date.now();
  const week = 7 * 24 * 3600 * 1000;
  for (const d of disposals) {
    const cat = d.category;
    const t = new Date(d.created_at).getTime();
    const cur = byCat.get(cat) ?? { count: 0, recent: 0, older: 0 };
    cur.count++;
    if (now - t < week) cur.recent++;
    else cur.older++;
    byCat.set(cat, cur);
  }
  return [...byCat.entries()].map(([category, v]) => {
    const weeklyRate = v.recent;
    const trend = v.recent > v.older ? 'up' : v.recent < v.older ? 'down' : 'flat';
    return { category, weeklyRate, trend };
  });
}

export interface Badge {
  id: string;
  label: string;
  threshold: number;
  icon: string;
}

export const BADGES: Badge[] = [
  { id: 'first_meal', label: 'First Rescue', threshold: 1, icon: 'leaf' },
  { id: 'five_meals', label: 'Five Rescues', threshold: 5, icon: 'sprout' },
  { id: 'ten_meals', label: 'Waste Warrior', threshold: 10, icon: 'shield' },
  { id: 'fifty_meals', label: 'Carbon Saver', threshold: 50, icon: 'globe' },
  { id: 'streak3', label: '3-Day Streak', threshold: 3, icon: 'flame' },
  { id: 'streak7', label: '7-Day Streak', threshold: 7, icon: 'flame' },
];

export function earnedBadges(summary: ImpactSummary): Badge[] {
  return BADGES.filter((b) => {
    if (b.id.startsWith('streak')) return summary.streakDays >= b.threshold;
    return summary.mealsRescued >= b.threshold;
  });
}
